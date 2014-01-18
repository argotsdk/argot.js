'use strict';

var fs = require('fs');
var q = require('q');
var primitives = require('./primitives.js');

var readUInt8 = primitives.readUInt8;
var readUVInt = primitives.readUVInt;
var readUtf8 = primitives.readUtf8;

function streamIdToDefinitionId(library, streamId) {
  return streamId; // Library .lookup
}

function readDictionaryBase () {
  return 'BASE'; // do nothing more
  // probably we should have something checkable here instead
}

function readDefinitionName (fileStream) {
  // groupId is used in java as a stream Id. But I think this here actually refers to the parent.
  // groupId is used to lookup a name prefix, presumably from the parent
  // actually, groupId appears to be the parents stream id
  var groupId = readUVInt (fileStream);
  var name = readUtf8(fileStream);
  return {group : groupId, name: name}; // TODO add fullname when we have library lookup
}

function readDefinitionVersion (fileStream) {
  var major = readUInt8(fileStream);
  var minor = readUInt8(fileStream);
  return {major : major, minor: minor};
}

function readDefinitionNameAndVersion (fileStream,library) {
  var name = readDefinitionName(fileStream,library);
  var version = readDefinitionVersion(fileStream,library);
  return {name: name, version: version};
}


function readDictionaryDefinitionEnvelope (fileStream) {
  // equiv to MetaEnvelopeReader
  var size = readUVInt (fileStream);
  return fileStream.read(size); // in the java the parsing comes later. Can we be eager?
}

function getReader (library, definitionId) {
  if( definitionId === 30) { // dictionary.base
    return readDictionaryBase;
  }
  else if (definitionId === 31) {
    return readDefinitionName;
  }
  else if (definitionId === 32) {
    return readDefinitionNameAndVersion;
  }
  else {
    return readUVInt;
  }
}

function readLocation(fileStream, library) {
  // This may be recursive, we might need to pass a library in here
  var streamId = readUVInt(fileStream);
  var definitionId = streamIdToDefinitionId(library, streamId);
  var reader = getReader (library,definitionId);
  var location = reader(fileStream,library);
  return location;
}

function readDefinition (fileStream,library) {
  var id = readUVInt(fileStream);
  var location = readLocation(fileStream,library);
  var structure = readDictionaryDefinitionEnvelope(fileStream,library);
  console.log ('Definition:', id);
  console.log ('  | Structure size:', structure.length);
  console.log ('  | Location:', location );



  // The first part seems to be a dictionary base
  // Then followed by a list of definitions
  // read id, location, structure
  // location is constructed of a vuint that identifies a type reader
  // and then whatever that type reads
  // location also contains a name and version
  // location reader :
  //   read uvint -> lookup next reader (always seems to be a "18" that maps to a sequence of
  //     Name
  //       group id - uvint
  //       name - u8utf
  //         length (in bytes)
  //         then the bytes
  //     Type bean marshaller
  // structure reader
  // uvint size
  // read size worth of bytes
  // get type reader and read

  // for nested structures
  // uvint - type
  // get type reader and read

  // for array structures
  // uvint - size of array
  // for size times
  //   read uvint type
  //   get type reader and read

  // define type and map dictionary id to our own id. : Can we use name instead of another id?

  return library;
}

function readDefinitions(fileStream,library) {

  var blockSize = readUVInt (fileStream);
  for(var i = 0; i < blockSize;  i++) {
    library = readDefinition(fileStream, library);
  }
  return library;
}

var doNothing = function(x) { console.log('doing nothing with: ', typeof x); return x; };
var readIdent = doNothing;
var readFinal = doNothing;

var readCore = (function() {
  var verify = function(body, library) {
    if(library.coreSize === body.length) {
      console.log('Verifying body. I guess everything checks out here');
    } else {
      throw 'Core body did not validate, expected ' +
        library.coreSize +
        ' but read ' +
        body.length;
    }
  };



  var readCoreBody = function(fileStream, library) {
    var bodySize = readUVInt(fileStream);
    var messageBody = fileStream.read(bodySize);
    console.info('Read ', messageBody.length, ' bytes of core body');
    verify(messageBody, library);
    return library;
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
    console.info("Core has ", noSections, " sections");
    console.info('Parsing core body');
    library = readCoreBody(fileStream, library);
    for(var i = 0; i < noExtensions;  i++) {
      var extensionSize = readUVInt(fileStream);
      console.log("About to read ", extensionSize, 'bytes of extension');
      // we don't need the extention size, only to move the stream on
      library = readDefinitions (fileStream, library);
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
      library = readDefinitions(fileStream, library);
    }
    console.log ('library after message is ', library);
    return [fileStream, library];
  };
})();

function parseAll(fileStream, library) {
  return q.fcall(readCore, [fileStream, library])
    .then(readMessage)
    .then(readIdent)
    .then(readFinal)
    .then(function(x) { return x[1];} );
}

module.exports = function (fileName, library, cb) {
  library = library || {};
  console.info('Parsing:', fileName);

  var rs = fs.createReadStream(fileName);
  rs.once('readable', function() { // Can I promise from an emit?
    console.info('File open and ready to read: ', fileName );
    var result = q.fcall(parseAll, rs, library)
          .fail(function(e) {
            console.error('errror:', e);
          });

    cb(result);
  });
};
