var dictionary = require('./dictionary.js');
module.exports.loadDictionary = dictionary.loadDictionary;
var libfns = require('./library.js');
module.exports.read = libfns.read;
var message = require('./message.js');
module.exports.readMessage = message.readMessage;
var StreamMaker = require('./StreamMaker.js');
module.exports.StreamMaker = StreamMaker;
