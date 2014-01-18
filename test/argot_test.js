'use strict';

var argot = require('../lib/argot.js');

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/


var commonDictionary = './test/common.dictionary';
var metaDictionary = './test/meta.dictionary';

// The light dictionary is taken from Argot's quickstart example
// http://www.argot-sdk.org/start.htm
var lightDictionary = './test/light.dictionary';



exports['common'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(1);
    // tests here
    var currentLibrary = {
      coreSize: 980
      // 980 is the size of common core
    };
    setTimeout(argot.loadDictionary(commonDictionary, currentLibrary, function(library) {
      console.log('library is :', library.toString());
      library.then(function(x) {
        test.equal(x.coreSize, 980, 'Common core size should be 980 bytes.');
        test.done();
      });
    }), 1000);
  }
};

exports['light'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(1);
    // tests here
    var currentLibrary = {
      coreSize: 980
      // 980 is the size of common core
    };
    setTimeout(argot.loadDictionary(lightDictionary, currentLibrary, function(library) {
      console.log('library is :', library.toString());
      library.then(function(x) {
        test.equal(x.coreSize, 980, 'Common core size should be 980 bytes.');
        test.done();
      });
    }), 1000);
  }
};

exports['meta'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(1);
    // tests here
    var currentLibrary = {
      coreSize: 980
      // 980 is the size of common core
    };
    setTimeout(argot.loadDictionary(metaDictionary, currentLibrary, function(library) {
      console.log('library is :', library.toString());
      library.then(function(x) {
        test.equal(x.coreSize, 980, 'Common core size should be 980 bytes.');
        test.done();
      });
    }), 1000);
  }
};
