'use strict';

var dictionary = require('./dictionary.js');
var readers = require('./readers.js');

function buildMetaLibraryFileName(magicNumber) {
  var version = magicNumber.version;
  return 'meta_' + version.major + '.' + version.minor  + '.dictionary';
}

function buildCommonLibraryFileName(magicNumber) {
  var version = magicNumber.version;
  return 'common_' + version.major + '.' + version.minor  + '.dictionary';
}

function failLoad(errCb) {
  return function(e) {
    if('ENOENT' === e.code) {
      errCb('Could not read dictionary file, is the message based on a version not bundled? ' + e);
    }
    else {
      errCb(e);
    }
  };
}

function addType(fromLib,toLib,name,id) {
  var typeDef = fromLib.types[name];
  toLib.types[name] = typeDef;
  toLib.streamIdToNameMap[id] = name;
  return toLib;
}

function augment(fromLib,toLib) {
  // This is for version 1.3, in the future we'll need variants of this function
  // with the correct one being chosen using the magic number
  function transfer(name,id) {
    return addType(fromLib,toLib,name,id);
  }
  var lastId = Object.keys(toLib.streamIdToNameMap).length;
  toLib = transfer('empty',++lastId);
  toLib = transfer('uint16',++lastId);
  toLib = transfer('uint32',++lastId);
  toLib = transfer('uint64',++lastId);
  toLib = transfer('int8',++lastId);
  toLib = transfer('int16',++lastId);
  toLib = transfer('int32',++lastId);
  toLib = transfer('int64',++lastId);
  toLib = transfer('float',++lastId);
  toLib = transfer('double',++lastId);
  toLib = transfer('boolean',++lastId);
  return toLib;
}

function addAdditionalTypes(lib, magicNumber,callback,errCb) {
  var libraryFileName = buildCommonLibraryFileName(magicNumber);
  dictionary.loadDictionary('./lib/' + libraryFileName, function(libPromise) {
    libPromise.then(function(commonLib) {

      var completeLib = augment(commonLib,lib);
      callback(completeLib);

    }).fail(failLoad(errCb));
  });
}

function readMessage(messageStream,callback,errCb) {
  var magicNumber = readers.readMagicNumber(messageStream);
  var libraryFilename = buildMetaLibraryFileName(magicNumber);
  dictionary.loadDictionary('./lib/' + libraryFilename ,function(libPromise) {
    libPromise.then(function(lib) {
      addAdditionalTypes(lib, magicNumber,
                         function(lib) {
                           lib = dictionary.readDefinitions(messageStream,lib,lib);
                           var data = readers.readStructure(messageStream,lib,lib);
                           callback(data);
                         },
                         function(e) {
                           errCb(e);
                         }
                        );
    }).fail(failLoad(errCb));
  });
}

module.exports.readMessage = readMessage;
