'use strict';

/**
 These tests take the data written in the java test case and in the format as defined in
 com.argot.data.MixedDataLoader, in which the names 'short' and 'byte' are used.
 These words, being reserved in js, should not be used. Ideally, these words would not be
 use in the data description, but with reality being far from ideal it would be prudent
 to implement an additional step providing a definition-name to object-property-name
 mapping.
 Failing that, we could hold a list of reserved words and, when encountered apply a kludge,
 possibly a underscore prefix or named as aType.
*/

var streamifier = require('streamifier');

var argot = require('../lib/argot.js');

exports['read_test_message'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(3);
    var input = [65, 19, 1, 50, 32, 0, 4, 100, 97, 116, 97, 1, 0, 27, 15, 3, 14, 5, 115, 104, 111, 114, 116, 13, 40, 14, 4, 98, 121, 116, 101, 13, 1, 14, 4, 116, 101, 120, 116, 13, 8, 50, 0, 10, 50, 5, 104, 101, 108, 108, 111];

    var fileStream_input = streamifier.createReadStream (new Buffer(input));
    argot.readMessage(fileStream_input)
      .then(function(libraryAndReadData) {
        // tests here
        var read_data = libraryAndReadData[1];
        test.equals(read_data.short, 10);
        test.equals(read_data.byte, 50);
        test.equals(read_data.text, 'hello');
        test.done();
      })
      .fail(test.fail);
  }
};


exports['read_test_message_invalid_magic_number'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(0);
    var input = [65, 18];

    var fileStream_input = streamifier.createReadStream (new Buffer(input));
    argot.readMessage(fileStream_input)
      .then(test.fail)
      .fail(function(){
        test.done();
      });
  }
};
