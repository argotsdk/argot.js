var metaDictionary = '/Users/dan/repos/3rd/argot-java/argot/meta.dictionary';
var commonDictionary = '/Users/dan/repos/3rd/argot-java/argot/common.dictionary';
var lightDictionary = '/Users/dan/repos/3rd/argot-start/src/main/resources/light.dictionary';

function logLibrary(libraryPromise) {
  libraryPromise.then(function(library) {
    console.log('Got library: ', library);
  })
    .done();
}


module.exports.parse = function() {
  'use strict';

  var fs = require('fs');
  var q = require('q');



  function parse(fileName, library, cb) {
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
  }

  function parseAll(fileStream, library) {
    return q.fcall(readCore, [fileStream, library])
      .then(readMessage)
      .then(readIdent)
      .then(readFinal)
      .then(function(x) { return x[1];} );
  }

  function readCore(fileStreamAndLibrary) {
    var fileStream = fileStreamAndLibrary[0];
    var library = fileStreamAndLibrary[1];
    var sectionSize = readUInt8(fileStream);
    console.log("Core has ", sectionSize, " sections");
    for(var i = 0; i < sectionSize;  i++) {
      console.info('Parsing section ', i);
      var bodySize = readVUInt(fileStream);
      console.log("Got bodysize", bodySize);
      var messageBody = fileStream.read(bodySize);
      library = parseMessage(messageBody, library);
    }
    return [fileStream, library];
  }

  function parseMessage(body, library) {
    console.log('parsing message body');
    return library;
  }

  var doNothing = function(x) { console.log('doing nothing with: ', typeof x); return x; };
  var readMessage = doNothing;
  var readIdent = doNothing;
  var readFinal = doNothing;


  function readUInt8(fileStream) {
    var value = fileStream.read(1).get(0);
    console.log("Read", value);
    return value;
  }

  function readVUInt(fileStream, accumulator) {
    accumulator = accumulator || 0; // Proably not required, I belive null is zero by default in js
    var value = fileStream.read(1).get(0);
    console.log("Read", value);
    if (value < 0) {
      var newVal = (0x7F & value) << 7;
      return readVUInt(fileStream, accumulator + newVal);
    } else {
      return accumulator + value;
    }
  }
  return parse;
}();
