'use strict';

function readUInt8(fileStream) {
  var value = fileStream.read(1)[0];
  return value;
}

function readUInt16(fileStream) {
  var value = fileStream.read(2);
  var first = value[0];
  var second = value[1];
  return ((first & 0xff) << 8) | (second & 0xff);
}


var readUVInt = (function(){
  function readUVInt(fileStream, accumulator) {
    accumulator = accumulator || 0; // Proably not required, I belive null is zero by default in js
    var value = fileStream.read(1)[0];
    if ((value & 0x80 ) > 0) {
      var newVal = (0x7F & value) << 7;
      return readUVInt(fileStream, accumulator + newVal);
    } else {
      return accumulator + value;
    }
  }
  return function(fileStream) {
    return readUVInt(fileStream);
  };
})();

function readUtf8(fileStream) {
  var length = readUVInt(fileStream);
  var bytes = fileStream.read(length);
  return String.fromCharCode.apply(null, bytes);
}


module.exports.readUInt8 = readUInt8;
module.exports.readUInt16 = readUInt16;
module.exports.readUVInt = readUVInt;
module.exports.readUtf8 = readUtf8;
