'use strict';

function readUInt8(fileStream) {
  var value = fileStream.read(1).get(0);
  return value;
}

var readUVInt = (function(){
  function readUVInt(fileStream, accumulator) {
    accumulator = accumulator || 0; // Proably not required, I belive null is zero by default in js
    var value = fileStream.read(1).get(0);
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
module.exports.readUVInt = readUVInt;
module.exports.readUtf8 = readUtf8;
