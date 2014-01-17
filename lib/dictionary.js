'use strict';

var fs = require('fs');
var q = require('q');
var primitives = require('./primitives.js');

var readUInt8 = primitives.readUInt8;
var readUVInt = primitives.readUVInt;

function readDefinitions(body, library) {
  console.log('parsing message body, size:', body.length);
  return library;
}

var doNothing = function(x) { console.log('doing nothing with: ', typeof x); return x; };
var readMessage = doNothing;
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

  var readExtension = function(fileStream,library) {
    /* This looks like a pattern..
     */
    var bodySize = readUVInt(fileStream);
    var messageBody = fileStream.read(bodySize);
    console.info('Read ', messageBody.size, ' bytes of body');
    return readDefinitions(messageBody,library);
  };

  var readCoreBody = function(fileStream, library) {
    var bodySize = readUVInt(fileStream);
    var messageBody = fileStream.read(bodySize);
    console.info('Read ', messageBody.size, ' bytes of core body');
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
      library = readExtension(fileStream, library);
    }
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
