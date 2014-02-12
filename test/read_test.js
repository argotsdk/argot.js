'use strict';

var logger = require('winston');
logger.cli();
var streamifier = require('streamifier');

var argot = require('../lib/argot.js');

var lightDictionary = './test/light.dictionary';

exports['read_light_colour'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(3);
    setTimeout(argot.loadDictionary(lightDictionary, function(library) {
      library.then(function(lib) {
        // tests here
        var input = [120, 10, 30];
        var fileStream_input = streamifier.createReadStream (new Buffer(input));
        var read_data = argot.read(lib,'light.colour',fileStream_input);
        test.equals(read_data.red, 120);
        test.equals(read_data.green, 10);
        test.equals(read_data.blue, 30);
        test.done();
      });
    }), 1000);
  }
};

exports['read_light_setcolor_(a_nested_structure)'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(3);
    setTimeout(argot.loadDictionary(lightDictionary, function(library) {
      library.then(function(lib) {
        // tests here

        var input = [120, 10, 30];
        var fileStream_input = streamifier.createReadStream (new Buffer(input));
        var setColourData = argot.read(lib,'light.set_colour',fileStream_input);
        var colourData = setColourData.colour;
        test.equals(colourData.red, 120);
        test.equals(colourData.green, 10);
        test.equals(colourData.blue, 30);
        test.done();
      });
    }), 1000);


  }
};
