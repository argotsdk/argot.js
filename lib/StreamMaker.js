function StreamMaker() {
}

StreamMaker.prototype.makeStream = function(location) {
  var fs = require('fs');
  return fs.createReadStream(location);
};

module.exports = StreamMaker;
