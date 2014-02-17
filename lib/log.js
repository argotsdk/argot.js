module.exports.debug = function() {};
module.exports.info = function() {
  console.log.apply(this,arguments);
};
