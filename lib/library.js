var logger = require('winston');

function makeLibrary(version) {
  if (version === 1.3) {
    return {
      version: 1.3,
      coreSize: 980,
      types: {}
    };
  } else {
    throw ('Unsupported version: ' + version);
  }
}


function makeDefinition(streamIdToNameMap, id, location, structure) {
  var group = location.groupId;
  var parentName = streamIdToNameMap[group];
  var name = location.name;
  var definition =  {
    name: name,
    structure: structure
  };
  if (parentName) {
    definition.parent = parentName;
  }
  return definition;
}

function getParentName(definition) {
  return definition.parent;
}

function isChild(definition) {
  return definition.parent;
}

function getTypeDefinition(library, name) {
  return library.types[name];
}

function addDefintionToLibrary(library,definition) {
  library.types[definition.name] = definition;
  logger.debug('Added definition %s to library', definition.name);
  return library;
}

function addChildToParent(parent, child) {
  parent.children = parent.children || new Array();
  parent.children.push(child);
  return parent;
}

function addIdToNameMapping(mapping,id,name) {
  if (mapping[id]) {
    logger.error('Id %d is already mapped to %s, overriding',
                 id, mapping[id]);
  }
  mapping[id] = name;
  logger.info('Mapped Stream ID %d to name %s', id, name);
  return mapping;
}

function registerType(library, streamIdToNameMap, id, location, structure) {
  var definition = makeDefinition(streamIdToNameMap, id, location, structure);
  library = addDefintionToLibrary(library,definition);
  if (isChild(definition)) {
    var parentName = getParentName(definition);
    var parentDef = getTypeDefinition(parentName);
    if (!parentDef) {
      throw 'Type refers to non-existant parent. Abort!';
    }
    parentDef = addChildToParent(parentDef, definition);
    library = addDefintionToLibrary(library,parentDef);
  }

  streamIdToNameMap = addIdToNameMapping(streamIdToNameMap,id,definition.name);
  return [library, streamIdToNameMap];
}

function getReaderFn(typeDefinition) {
  var reader = typeDefinition.reader;
  logger.info('Found reader %j', reader, {});
  if(!reader) {
    logger.error('No reader for type %j', typeDefinition, {});
  }
  return reader;
}

function makeBaseStreamIdToNameMap(library) {
  if (library.version === 1.3) {
    return {}; // add readDictionaryBase, readDefinitionName and readDefinitionNameAndVersion to this..
  } else throw ("Unknown version " + library.version);
}

module.exports.makeLibrary = makeLibrary;
module.exports.registerType = registerType;
module.exports.getTypeDefinition = getTypeDefinition;
module.exports.getReaderFn = getReaderFn;
module.exports.makeBaseStreamIdToNameMap = makeBaseStreamIdToNameMap;
