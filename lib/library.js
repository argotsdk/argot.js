var logger = require('winston');
var readers = require('./readers');

function makeLibrary(version) {
  if (version === 1.3) {
    return {
      version: 1.3,
      coreSize: 980,
      types: {},
      streamIdToNameMap: {}
    };
  } else {
    throw ('Unsupported version: ' + version);
  }
}

function getNameFromStreamId(library, streamId) {
  return library.streamIdToNameMap[streamId];
}

function addStreamIdToNameMapping(library,streamId,name) {
  if (getNameFromStreamId(library,streamId)) {
    logger.error('Id %d is already mapped to %s, overriding',
                 streamId, getNameFromStreamId(streamId));
  }
  library.streamIdToNameMap[streamId] = name;
  logger.info('Mapped Stream ID %d to name %s', streamId, name);
  return library;
}

function makeDefinition(library, id, location, structure) {
  var group = location.group;
  var parentName = getNameFromStreamId(library,group);
  var name = location.name;
  var definition =  {
    name: name,
    structure: structure
  };
  if (parentName) {
    definition.parent = parentName;
  }
  if(readers.metaMappings[name]){
    definition.reader = readers.metaMappings[name];
  }
  logger.debug('Made Definition %j', definition, {});
  return definition;
}

function getParentName(definition) {
  return definition.parent;
}

function isChild(definition) {
  return definition.parent;
}

function getTypeDefinition(library, name) {
  var types = library.types;
  return types[name] || {name: name}; // hack until we have default meta types
}

function getTypeDefinitionFromStreamId(library, streamId) {
  var name = getNameFromStreamId(library,streamId);
  return library.types[name] || {name: name}; // hack until we have default meta types
}

function addDefinitionToLibrary(library,definition,streamId) {
  library.types[definition.name] = definition;
  if (streamId) {
    library = addStreamIdToNameMapping(library,streamId,definition.name);
  }
  logger.info('Added %s to library', definition.name);
  return library;
}

function addChildToParent(parent, child) {
  parent.children = parent.children || [];
  parent.children.push(child);
  return parent;
}

function registerType(library, id, location, structure) {
  var definition = makeDefinition(library, id, location, structure);
  library = addDefinitionToLibrary(library,definition,id);
  if (isChild(definition)) {
    var parentName = getParentName(definition);
    var parentDef = getTypeDefinition(library, parentName);
    if (!parentDef) {
      throw 'Type refers to non-existant parent. Abort!';
    }
    parentDef = addChildToParent(parentDef, definition);
    library = addDefinitionToLibrary(library,parentDef);
  }
  return library;
}

function getReaderFn(typeDefinition) {
  var reader = typeDefinition.reader || readers.metaMappings[typeDefinition.name];
  if(!reader) {
    logger.error('No reader for type %j', typeDefinition, {});
  }
  return reader;
}

function makeBaseStreamIdToNameMap(library, core) {
  logger.info('Making stream id mapper for %s', core);
  if (library.version === 1.3) {
    if(core){
      logger.info('Returning stream id mapper for %s', core);
      return {
        30: 'BASE',
        31: 'name',
        32: 'definition'
      }; // add readDictionaryBase, readDefinitionName and readDefinitionNameAndVersion to this..
    }
    else { return {}; }
  } else {
    throw ("Unknown version " + library.version);
  }
}

function makeBaseLibrary(version) {
  var library = makeLibrary(version);
  library = addStreamIdToNameMapping(library,30,'BASE');
  library = addStreamIdToNameMapping(library,31,'name');
  library = addStreamIdToNameMapping(library,32,'definition');
  return library;
}

module.exports.makeLibrary = makeLibrary;
module.exports.makeBaseLibrary = makeBaseLibrary;
module.exports.registerType = registerType;
module.exports.getTypeDefinition = getTypeDefinition;
module.exports.getReaderFn = getReaderFn;
module.exports.makeBaseStreamIdToNameMap = makeBaseStreamIdToNameMap;
module.exports.getNameFromStreamId = getNameFromStreamId;
module.exports.getTypeDefinitionFromStreamId = getTypeDefinitionFromStreamId;
