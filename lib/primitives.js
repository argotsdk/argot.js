'use strict';

function readUInt8(fileStream) {
  var value = fileStream.read(1).get(0);
  console.log("Read", value);
  return value;
}

function readUVInt(fileStream, accumulator) {
  accumulator = accumulator || 0; // Proably not required, I belive null is zero by default in js
  var value = fileStream.read(1).get(0);
  console.log("Read", value);
  if ((value & 0x80 ) > 0) {
    var newVal = (0x7F & value) << 7;
    return readUVInt(fileStream, accumulator + newVal);
  } else {
    return accumulator + value;
  }
}

module.exports.readUInt8 = readUInt8;
module.exports.readUVInt = readUVInt;
