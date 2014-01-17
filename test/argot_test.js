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

var metaDictionary = '/Users/dan/repos/3rd/argot-java/argot/meta.dictionary';
var commonDictionary = '/Users/dan/repos/3rd/argot-java/argot/common.dictionary';
var lightDictionary = '/Users/dan/repos/3rd/argot-start/src/main/resources/light.dictionary';



exports['parse'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(1);
    // tests here
    setTimeout(argot.parse(commonDictionary, null, function(library) {
      console.log('library is :', library.toString());
      library.then(function(x) {
        test.deepEqual(x, {}, 'should be awesome.');
        test.done();
      });
    }), 5000);


  }
};
