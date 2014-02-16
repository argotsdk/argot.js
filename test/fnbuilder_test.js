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
    var library = libfns.makeLibrary(1.3);
    test.throws(function() {
      library.buildReader({});
    },
                'Expected an error',
                'Expected error when no structure');
    test.doesNotThrow(function() {
      library.buildReader({expression:'exists'});
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
    argot.loadDictionary(lightDictionary)
      .then(function(lib) {
        // tests here
        var lightStructure = [{"description":"red","expression":{"type":"uint8"}},
                               {"description":"green","expression":{"type":"uint8"}},
                               {"description":"blue","expression":{"type":"uint8"}}];
        var readerFn = lib.buildReader({expression:lightStructure});
        var input = [120, 10, 30];
        var fileStream_input = streamifier.createReadStream (new Buffer(input));
        var read_data = readerFn(fileStream_input);
        test.equals(read_data.red, 120);
        test.equals(read_data.green, 10);
        test.equals(read_data.blue, 30);
        test.done();
      })
      .fail(test.done);
  }
};

exports['buildReader_for_light_setcolor_(a_nested_structure)'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(3);
    argot.loadDictionary(lightDictionary)
      .then(function(lib) {
        // tests here

        var lightSetColorStructure = [{"description":"colour",
                                         "expression":{"type":"light.colour"}}];
        var readerFn = lib.buildReader({expression:lightSetColorStructure});
        var input = [120, 10, 30];
        var fileStream_input = streamifier.createReadStream (new Buffer(input));
        var setColourData = readerFn(fileStream_input);
        var colourData = setColourData.colour;
        test.equals(colourData.red, 120);
        test.equals(colourData.green, 10);
        test.equals(colourData.blue, 30);
        test.done();
      })
      .fail(test.done);
  }
};
