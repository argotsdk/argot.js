module.exports.debug = function() {};
module.exports.info = function() {
  console.log.apply(console, arguments);
};
module.exports.warn = function() {
  console.log.apply(console, arguments);
};
