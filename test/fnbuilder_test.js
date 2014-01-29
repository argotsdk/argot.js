'use strict';

var logger = require('winston');
logger.cli();
var streamifier = require('streamifier');

var argot = require('../lib/argot.js');
var libfns = require('../lib/library.js');

var lightDictionary = './test/light.dictionary';

exports['buildReader_throws_error_on_no_expression'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(2);
    // tests here
    test.throws(function() {
      libfns.buildReader({},{});
    },
                'Expected an error',
                'Expected error when no structure');
    test.doesNotThrow(function() {
      libfns.buildReader({},{expression:'exists'});
    },
                      'Expected an error',
                      'There should be no error with a structure');

    test.done();
  }
};

exports['buildReader_for_light_color'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(3);
    setTimeout(argot.loadDictionary(lightDictionary, function(library) {
      library.then(function(lib) {
        // tests here
        var light_structure = [{"description":"red","expression":{"type":"uint8"}},
                               {"description":"green","expression":{"type":"uint8"}},
                               {"description":"blue","expression":{"type":"uint8"}}];
        var reader_fn = libfns.buildReader(lib,{expression:light_structure});
        var input = [120, 10, 30];
        var fileStream_input = streamifier.createReadStream (new Buffer(input));
        var read_data = reader_fn(fileStream_input);
        test.equals(read_data.red, 120);
        test.equals(read_data.green, 10);
        test.equals(read_data.blue, 30);
        test.done();
      });
    }), 1000);


  }
};