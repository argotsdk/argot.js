var logger = require('winston');

function registerType(library, id, location, structure) {
  if (library[id]) {
    logger.warn('Overriding id %d. Previously: ', id, library[id].location);
  }
  library[id] = {location: location, structure:structure};
  logger.info('Registered id %d with location: ', id, location);
  return library;
}

module.exports.registerType = registerType;
