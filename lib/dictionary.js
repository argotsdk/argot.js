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
  if( definitionId === 30 || definitionId === 5 || definitionId === 7) {
    // 30 is common core, 5 is common final, 7 is light final
    return readDictionaryBase;
  }
  else if (definitionId === 31 || definitionId === 23) {
    // 31 is common core, 23 is meta
    return readDefinitionName;
  }
  else if (definitionId === 32 || definitionId === 10) {
    // 32 is common core, 10 is common final
    return readDefinitionNameAndVersion;
  }
  else {
    console.log('uh oh, someone is trying to read type', definitionId);
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
  return library;
}

function readDefinitions(fileStream,library) {

  var numberOfDefinitions = readUVInt (fileStream);
  for(var i = 0; i < numberOfDefinitions;  i++) {
    library = readDefinition(fileStream, library);
  }
  return library;
}

var readCore = (function() {
  var verify = function(bodySize, library) {
    if(library.coreSize === bodySize) {
      console.log('Verifying body. I guess everything checks out here');
    } else {
      throw 'Core body did not validate, expected ' +
        library.coreSize +
        ' but read ' +
        bodySize;
    }
  };



  var readCoreBody = function(fileStream, library) {
    var bodySize = readUVInt(fileStream);
    console.log('Reading ', bodySize, ' bytes of core body');
    verify(bodySize, library);
    return readDefinitions(fileStream,library);
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
    console.info('Parsing core (body), 1/1');
    library = readCoreBody(fileStream, library);
    for(var i = 0; i < noExtensions;  i++) {
      console.info('Parsing core (extension), ', 1, '/', noExtensions);
      readUVInt(fileStream); // "extension size". We don't need this.
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
      console.log ('Parsing messages, ', i, '/', noSections );
      library = readDefinitions(fileStream, library);
    }
    return [fileStream, library];
  };
})();

function readIdent(fileStreamAndLibrary) {
  var ident = readUVInt(fileStreamAndLibrary[0]);
  console.log ('Read an ident, value:, ', ident, '¯\\_(ツ)_/¯');
  return fileStreamAndLibrary;
}

function readFinal(fileStreamAndLibrary) {
  var fileStream = fileStreamAndLibrary[0];
  var library = fileStreamAndLibrary[1];
  library = readDefinitions(fileStream, library);
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
