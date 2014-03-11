'use strict';

var q = require('q');
var logger = require('./log');
var primitives = require('./primitives.js');
var libfns = require('./library.js');
var StreamMaker = require('./StreamMaker.js');
var cache = require('mutacache')({cacheFunctions:true});

var readUInt8 = primitives.readUInt8;
var readUVInt = primitives.readUVInt;

function getReader(library, streamId) {
  var typeDef = library.getTypeDefinitionFromStreamId(streamId);
  var readerFn = library.getReaderFn(typeDef);
  if (readerFn) {
    return readerFn;
  } else {
    throw ('Could not find reader for stream ID: ' + streamId);
  }
}

function readLocation(fileStream, refLibrary, library) {
  var streamId = readUVInt(fileStream);
  var reader = getReader(refLibrary,streamId);
  var location = reader(fileStream,refLibrary,library);
  return location;
}

function readDictionaryDefinitionEnvelope(fileStream,refLibrary) {
  var typeDef = refLibrary.getTypeDefinition('dictionary.definition_envelope');
  var reader = refLibrary.getReaderFn(typeDef);
  return reader(fileStream,refLibrary);
}

function readDefinition (fileStream, refLibrary, library) {
  refLibrary = refLibrary || library;
  var id = readUVInt(fileStream);
  var location = readLocation(fileStream,refLibrary,library);
  var structure = readDictionaryDefinitionEnvelope(fileStream,refLibrary);
  logger.debug('Definition: %d', id);
  logger.debug('  | Structure size: %d', structure.length);
  logger.debug('  | Location:', location );
  library.registerType(id,location,structure);
}

function readDefinitions(fileStream,refLibrary,library) {
  refLibrary = refLibrary || library;
  var numberOfDefinitions = readUVInt (fileStream);
  for(var i = 0; i < numberOfDefinitions;  i++) {
    readDefinition(fileStream, refLibrary, library);
  }
  library.buildStructures(refLibrary);
}

function readCore(fileStreamAndLibrary) {
  /*
   The core is in n parts, 1 part core, n-1 parts extensions.
   The core definitions are bootstrapped, reading definitions one at
   a time and using itself as a reference all the way.
   */
  var fileStream = fileStreamAndLibrary[0];
  var library = fileStreamAndLibrary[1];
  var noSections = readUInt8(fileStream);
  var noExtensions = noSections - 1;
  logger.info('Parsing core (body), 1/1');
  var bodySize = readUVInt(fileStream);
  logger.debug('Reading %d bytes of core body', bodySize);
  library.verifyCoreSize(bodySize);
  readDefinitions(fileStream, library, library);
  for(var i = 0; i < noExtensions;  i++) {
    logger.info('Parsing core (extension), %d/%d', i+1, noExtensions);
    readUVInt(fileStream); // "extension size". We don't need this.
    readDefinitions(fileStream, library, library);
  }
  return [fileStream, library];
}

function readMessage(fileStreamAndLibrary) {
  var fileStream = fileStreamAndLibrary[0];
  var refLibrary = fileStreamAndLibrary[1];
  var library = libfns.makeLibrary(1.3);
  var noSections = readUInt8(fileStream);
  for(var i = 0; i < noSections;  i++) {
    logger.info ('Parsing messages, %d/%d', i+1, noSections );
    readDefinitions(fileStream, refLibrary,library);
  }
  return [fileStream, library];
}


function readIdent(fileStreamAndLibrary) {
  var ident = readUVInt(fileStreamAndLibrary[0]);
  logger.debug('Read an ident, value: %d', ident);
  return fileStreamAndLibrary;
}

function readFinal(fileStreamAndLibrary) {
  logger.info ('Parsing final');
  var fileStream = fileStreamAndLibrary[0];
  var refLibrary = fileStreamAndLibrary[1];
  var library = libfns.makeLibrary(1.3);
  readDefinitions(fileStream, refLibrary, library);
  return [fileStream, library];
}

function parseAll(fileStream, library) {
  var onlyLibrary = function(fileStreamAndLibrary) {
    return fileStreamAndLibrary[1];
  };
  return q.fcall(readCore, [fileStream, library])
    .then(readMessage)
    .then(readIdent)
    .then(readFinal)
    .then(onlyLibrary);
}

function makeStream(fileName) {
  return new StreamMaker().makeStream(fileName);
}

function loadDictionary(fileName) {
  var deferred = q.defer();
  if (cache.has(fileName)) {
    deferred.resolve(cache.get(fileName));
    return deferred.promise;
  } else {
    var library = libfns.makeBaseLibrary(1.3);
    logger.info('Parsing: %s', fileName);

    var rs = makeStream(fileName);

    rs.once('readable', function() { // Can I promise from an emit?
      logger.debug('File open and ready to read: %s', fileName );
      deferred.resolve(q.fcall(parseAll, rs, library));
    });
    rs.on('error', function(err) {
      deferred.reject(err);
    });
    var promise = deferred.promise;
    promise.then(function(lib) {
      cache.put(fileName,lib);
    });
    return promise;
  }
}


module.exports.loadDictionary = loadDictionary;
module.exports.readDefinitions = readDefinitions;
