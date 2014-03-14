'use strict';

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
    argot.loadDictionary(lightDictionary)
      .then(function(lib) {
        // tests here
        var input = [120, 10, 30];
        var fileStream_input = streamifier.createReadStream (new Buffer(input));
        var read_data = argot.read(lib,fileStream_input,'light.colour');
        test.equals(read_data.red, 120);
        test.equals(read_data.green, 10);
        test.equals(read_data.blue, 30);
        test.done();
      })
    .fail(test.done);
  }
};

exports['read_light_colour_by_definition_stream_id'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(3);
    argot.loadDictionary(lightDictionary)
      .then(function(lib) {
        // tests here
        var lightDotColourStreamId = 2;
        var input = [lightDotColourStreamId, 120, 10, 30];
        var fileStream_input = streamifier.createReadStream (new Buffer(input));
        var read_data = argot.read(lib,fileStream_input);
        test.equals(read_data.red, 120);
        test.equals(read_data.green, 10);
        test.equals(read_data.blue, 30);
        test.done();
      })
    .fail(test.done);
  }
};



exports['read_light_setcolor_(a_nested_structure)'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(3);
    argot.loadDictionary(lightDictionary)
      .then(function(lib) {
        // tests here

        var input = [120, 10, 30];
        var fileStream_input = streamifier.createReadStream (new Buffer(input));
        var setColourData = argot.read(lib,fileStream_input,'light.set_colour');
        var colourData = setColourData.colour;
        test.equals(colourData.red, 120);
        test.equals(colourData.green, 10);
        test.equals(colourData.blue, 30);
        test.done();
      })
      .fail(test.done);
  }
};
