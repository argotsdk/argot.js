'use strict';

var fs = require('fs');
var q = require('q');
var logger = require('winston');
var primitives = require('./primitives.js');
var libfns = require('./library.js');

var readUInt8 = primitives.readUInt8;
var readUVInt = primitives.readUVInt;

function streamIdToDefinitionId(library, streamId) {
  return streamId; // Library .lookup
}

function readDictionaryDefinitionEnvelope (fileStream) {
  // equiv to MetaEnvelopeReader
  var size = readUVInt (fileStream);
  return fileStream.read(size); // in the java the parsing comes later. Can we be eager?
}

function getReader(library, streamId) {
  var typeDef = libfns.getTypeDefinitionFromStreamId(library,streamId);
  var readerFn = libfns.getReaderFn(typeDef);
  if (readerFn) {
    return readerFn;
  } else {
    throw ('Could not find reader for stream ID: ' + streamId);
  }
}

function readLocation(fileStream, refLibrary, library) {
  // This may be recursive, we might need to pass a library in here
  var streamId = readUVInt(fileStream);
  var definitionId = streamIdToDefinitionId(refLibrary, streamId);
  var reader = getReader (refLibrary,definitionId);
  var location = reader(fileStream,refLibrary,library);
  return location;
}

function readDefinition (fileStream, refLibrary, library) {
  refLibrary = refLibrary || library;
  var id = readUVInt(fileStream);
  var location = readLocation(fileStream,refLibrary,library);
  var structure = readDictionaryDefinitionEnvelope(fileStream,refLibrary);
  logger.debug('Definition: %d', id);
  logger.debug('  | Structure size: %d', structure.length);
  logger.debug('  | Location:', location );
  return libfns.registerType(library,id,location,structure);
}

function readDefinitions(fileStream,refLibrary,library) {
  refLibrary = refLibrary || library;
  var numberOfDefinitions = readUVInt (fileStream);
  for(var i = 0; i < numberOfDefinitions;  i++) {
    library = readDefinition(fileStream, refLibrary, library);
  }
  library = libfns.buildStructures(refLibrary, library);
  return library;
}

var readCore = (function() {
  var verify = function(bodySize, library) {
    if(library.coreSize === bodySize) {
      logger.debug('Body verified, matches exprected size');
    } else {
      logger.warn('Core body did not validate, expected %d but read %d', library.coreSize, bodySize);
      throw 'Core body invalid';
    }
  };

  var readCoreBody = function(fileStream) {
    var bodySize = readUVInt(fileStream);
    logger.debug('Reading %d bytes of core body', bodySize);
    var library = libfns.makeBaseLibrary(1.3);
    verify(bodySize, library);
    return readDefinitions(fileStream,null,library);
  };

  return function(fileStreamAndLibrary) {
    /*
     The core is in n parts, 1 part core, n-1 parts extensions
     The core doesn't need to be loaded into the library, we already have it.
     But we are required to verify that the core we have matches our library
     */
    var fileStream = fileStreamAndLibrary[0];
    var refLibrary = fileStreamAndLibrary[1];
    var noSections = readUInt8(fileStream);
    var noExtensions = noSections - 1;
    logger.info('Parsing core (body), 1/1');
    var library = readCoreBody(fileStream, refLibrary);
    for(var i = 0; i < noExtensions;  i++) {
      logger.info('Parsing core (extension), %d/%d', i+1, noExtensions);
      readUVInt(fileStream); // "extension size". We don't need this.
      library = readDefinitions (fileStream, null, library);
    }
    return [fileStream, library];
  };
})();

var readMessage = (function() {
  return function(fileStreamAndLibrary) {
    var fileStream = fileStreamAndLibrary[0];
    var refLibrary = fileStreamAndLibrary[1];
    var library = libfns.makeLibrary(1.3);
    var noSections = readUInt8(fileStream);
    for(var i = 0; i < noSections;  i++) {
      logger.info ('Parsing messages, %d/%d', i+1, noSections );
      library = readDefinitions(fileStream, refLibrary,library);
    }
    return [fileStream, library];
  };
})();

function readIdent(fileStreamAndLibrary) {
  var ident = readUVInt(fileStreamAndLibrary[0]);
  logger.debug('Read an ident, value: %d', ident);
  return fileStreamAndLibrary;
}

function readFinal(fileStreamAndLibrary) {
  var fileStream = fileStreamAndLibrary[0];
  var refLibrary = fileStreamAndLibrary[1];
  var library = libfns.makeLibrary(1.3);
  library = readDefinitions(fileStream, refLibrary, library);
  return [fileStream, library];
}

function parseAll(fileStream, library) {
  return q.fcall(readCore, [fileStream, library])
    .then(readMessage)
    .then(readIdent)
    .then(readFinal)
    .then(function(x) { return x[1];} );
}

module.exports = function (fileName, cb) {
  var library = libfns.makeBaseLibrary(1.3);
  logger.info('Parsing: %s', fileName);

  var rs = fs.createReadStream(fileName);
  rs.once('readable', function() { // Can I promise from an emit?
    logger.debug('File open and ready to read: %s', fileName );
    var result = q.fcall(parseAll, rs, library)
          .fail(function(e) {
            logger.error('errror:', e);
          });

    cb(result);
  });
};
