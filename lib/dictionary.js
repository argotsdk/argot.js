'use strict';

var fs = require('fs');
var q = require('q');
var logger = require('winston');
var primitives = require('./primitives.js');
var libfns = require('./library.js');
var readers = require('./readers');


var readUInt8 = primitives.readUInt8;
var readUVInt = primitives.readUVInt;

function streamIdToDefinitionId(library, streamId) {
  return streamId; // Library .lookup
}

var readDictionaryBase = readers.readDictionaryBase;
var readDefinitionName = readers.readDefinitionName;
var readDefinitionNameAndVersion = readers.readDefinitionNameAndVersion;

function readDictionaryDefinitionEnvelope (fileStream) {
  // equiv to MetaEnvelopeReader
  var size = readUVInt (fileStream);
  return fileStream.read(size); // in the java the parsing comes later. Can we be eager?
}

var backupMappings = {
  // 30 is common core, 5 is common final, 7 is light final
  5: readDictionaryBase,
  7: readDictionaryBase,
  // 31 is common core, 23 is meta, 13 is light
  //    31: readDefinitionName,
  23: readDefinitionName,
  13: readDefinitionName,
  // 32 is common core, 10 is common final, 10 also clashes with the light dictionary
  32: readDefinitionNameAndVersion,
  10: readDefinitionNameAndVersion,
  18: readDefinitionNameAndVersion // light
};

function getReader(library, definitionId, streamIdToNameMap) {

  var typeName = streamIdToNameMap[definitionId];
  if (typeName) {
    logger.info('Looking up reader for %s', typeName);
    var typeDef = libfns.getTypeDefinition(library,typeName);
    var readerFn = libfns.getReaderFn(typeDef);
    if (readerFn) {
      return readerFn;
    } else if (typeName === 'definition') {
      logger.warn('Potentially able to remove ID %d from backup mapping', definitionId);
      return readDefinitionNameAndVersion;
    }
  }

  // var reader23 = backupGet(23);
  // console.log('Reader 23 is %s', reader23);
  var readerFn2 = backupMappings[definitionId];

  if (readerFn2) {
    return readerFn2;
  } else {
    logger.info('uh oh, someone is trying to read type %d', definitionId);
    logger.info('Unknown type is %s', streamIdToNameMap[definitionId]);
    return readUVInt;
  }
}

function readLocation(fileStream, library,streamIdToNameMap) {
  // This may be recursive, we might need to pass a library in here
  var streamId = readUVInt(fileStream);
  var definitionId = streamIdToDefinitionId(library, streamId);
  var reader = getReader (library,definitionId,streamIdToNameMap);
  var location = reader(fileStream,library);
  return location;
}

function readDefinition (fileStream,library, streamIdToNameMap) {
  var id = readUVInt(fileStream);
  var location = readLocation(fileStream,library,streamIdToNameMap);
  var structure = readDictionaryDefinitionEnvelope(fileStream,library);
  logger.debug('Definition: %d', id);
  logger.debug('  | Structure size: %d', structure.length);
  logger.debug('  | Location:', location );
  return libfns.registerType(library,streamIdToNameMap,id,location,structure);
}

function readDefinitions(fileStream,library,type) {

  var streamIdToNameMap = libfns.makeBaseStreamIdToNameMap(library,type);
  var numberOfDefinitions = readUVInt (fileStream);
  for(var i = 0; i < numberOfDefinitions;  i++) {
    var libraryAndStreamIdMap = readDefinition(fileStream, library, streamIdToNameMap);
    library = libraryAndStreamIdMap[0];
    streamIdToNameMap = libraryAndStreamIdMap[1];
  }
  return library;
}

var readCore = (function() {
  var verify = function(bodySize, library) {
    if(library.coreSize === bodySize) {
      logger.info('Verifying body. I guess everything checks out here');
    } else {
      logger.warn('Core body did not validate, expected %d but read %d', library.coreSize, bodySize);
      throw 'Core body invalid';
    }
  };



  var readCoreBody = function(fileStream, library) {
    var bodySize = readUVInt(fileStream);
    logger.info('Reading %d bytes of core body', bodySize);
    verify(bodySize, library);
    return readDefinitions(fileStream,library,'core');
  };

  return function(fileStreamAndLibrary) {
    /*
     The core is in n parts, 1 part core, n-1 parts extensions
     The core doesn't need to be loaded into the library, we already have it.
     But we are required to verify that the core we have matches our library
     */
    var fileStream = fileStreamAndLibrary[0];
    var library = fileStreamAndLibrary[1];
    var noSections = readUInt8(fileStream);
    var noExtensions = noSections - 1;
    logger.info('Parsing core (body), 1/1');
    library = readCoreBody(fileStream, library);
    for(var i = 0; i < noExtensions;  i++) {
      logger.info('Parsing core (extension), %d/%d', i+1, noExtensions);
      readUVInt(fileStream); // "extension size". We don't need this.
      library = readDefinitions (fileStream, library,'core');
    }
    return [fileStream, library];
  };
})();

var readMessage = (function() {
  return function(fileStreamAndLibrary) {
    var fileStream = fileStreamAndLibrary[0];
    var library = fileStreamAndLibrary[1];
    var noSections = readUInt8(fileStream);
    for(var i = 0; i < noSections;  i++) {
      logger.info ('Parsing messages, %d/%d', i+1, noSections );
      library = readDefinitions(fileStream, library,'core');
    }
    return [fileStream, library];
  };
})();

function readIdent(fileStreamAndLibrary) {
  var ident = readUVInt(fileStreamAndLibrary[0]);
  logger.info('Read an ident, value: %d ¯\\_(ツ)_/¯', ident);
  return fileStreamAndLibrary;
}

function readFinal(fileStreamAndLibrary) {
  var fileStream = fileStreamAndLibrary[0];
  var library = fileStreamAndLibrary[1];
  library = readDefinitions(fileStream, library, 'core');
  return [fileStream, library];
}

function parseAll(fileStream, library) {
  return q.fcall(readCore, [fileStream, library])
    .then(readMessage)
    .then(readIdent)
    .then(readFinal)
    .then(function(x) { return x[1];} );
}

module.exports = function (fileName, library, cb) {
  library = library || {};
  logger.info('Parsing: %s', fileName);

  var rs = fs.createReadStream(fileName);
  rs.once('readable', function() { // Can I promise from an emit?
    logger.info('File open and ready to read: %s', fileName );
    var result = q.fcall(parseAll, rs, library)
          .fail(function(e) {
            logger.error('errror:', e);
          });

    cb(result);
  });
};
