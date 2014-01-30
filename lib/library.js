var logger = require('winston');
var readers = require('./readers');
var streamifier = require('streamifier');

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
                 streamId, getNameFromStreamId(library,streamId));
  }
  library.streamIdToNameMap[streamId] = name;
  logger.info('Mapped Stream ID %d to name %s', streamId, name);
  return library;
}

function getFullName (library,definition) {
  if (definition.parent) {
    var parent = getTypeDefinition(library,definition.parent);
    return getFullName(library,parent) + '.' + definition.name;
  } else {
    return definition.name;
  }
}

function makeDefinition(library, id, location, structure) {
  var group = location.group;
  var name = location.name;
  var definition =  {
    name: name,
    structure: structure
  };
  var version = location.version;
  if (version) {
    definition.version = version;
  }
  var parentName = getNameFromStreamId(library,group);
  if (parentName) {
    definition.parent = parentName;
  }
  if(readers.metaMappings[getFullName(library,definition)]){
    definition.reader = readers.metaMappings[getFullName(library,definition)];
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
  library.types[getFullName(library, definition)] = definition;
  if (streamId) {
    library = addStreamIdToNameMapping(library,streamId,getFullName(library, definition));
  }
  logger.info('Added %s to library', getFullName(library, definition));
  return library;
}

function addRelationToLibrary(library,relation,streamId) {
  library.types[relation.tag] = relation;
  if (streamId) {
    library = addStreamIdToNameMapping(library,streamId,relation.tag);
  }
  logger.info('Added %s to library', relation.tag);
  return library;
}

function addChildToParent(parent, child) {
  parent.children = parent.children || [];
  parent.children.push(child);
  return parent;
}

function registerName(library, id, location, structure) {
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

function registerDefinition(library, id, location, structure) {
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

function makeRelation (library, id, location) {
  return {id: location.id, tag: location.tag};
}

function registerRelation(library, id, location, structure) {
  var relation = makeRelation(library, id, location, structure);
  library = addRelationToLibrary(library,relation,id);
  return library;
}

function getRegisterFunction (library, id, location) {
  function isDefinition (location) {
    return location && location.group != null  && location.name && location.version;
  }

  function isName (location) {
    return location && location.group != null && location.name && !location.version;
  }

  function isRelation (location) {
    return location && location.id != null && location.tag;
  }
  if (isDefinition (location)) {
    return registerDefinition;
  } else if (isName(location)) {
    return registerName;
  } else  if (isRelation (location)) {
    return registerRelation;
  } else {
    throw ('Could not register unknown type: ' + id);
  }
}

function registerType(library, id, location, structure) {
  var register = getRegisterFunction (library, id, location, structure);
  return register (library, id, location, structure);
}

function getReaderFn(typeDefinition) {
  var reader = typeDefinition.reader || readers.metaMappings[typeDefinition.name];
  if(!reader) {
    logger.error('No reader for type %j', typeDefinition, {});
  }
  return reader;
}

function makeBaseLibrary(version) {
  var library = makeLibrary(version);
  library = addStreamIdToNameMapping(library,30,'base');
  library = addStreamIdToNameMapping(library,31,'name');
  library = addStreamIdToNameMapping(library,32,'definition');
  return library;
}

function getTypes (library, filterFn) {
  var keys = Object.keys(library.types);
  var filteredTypes = {};
  keys.forEach(function(key) {
    var typeDef = getTypeDefinition (library,key);
    if (filterFn(typeDef)) {
      filteredTypes [key] = typeDef;
    }
  });
  return filteredTypes;
}

function buildReader(library,type) {
  var makeAugmentor = function(description,aReaderFn) {
    return function(fileStream, subject) {
      var value = aReaderFn(fileStream);
      subject[description] = value;
      return subject;
    };
  };

  if (type.expression) {
    var augmentors = [];
    for(var i = 0; i < type.expression.length;  i++) {
      var segment = type.expression[i];
      if (segment.description && segment.expression) {
        var description = segment.description;
        var expressionType = segment.expression.type;
        var readerFn = getReaderFn(getTypeDefinition(library,expressionType));
        var augmentor = makeAugmentor(description,readerFn);
        augmentors.push(augmentor);
      }
    }
    return function (fileStream) {
      console.log('reading');
      var subject = {};
      for(var i = 0; i < augmentors.length;  i++) {
        subject = augmentors[i](fileStream,subject);
      }
      return subject;
    };
  } else {
    throw 'Can not build reader without an expression';
  }
}

function buildStructures2 (oldLibrary,newLibrary,types) {
  // We really need a better name for this
  var keys = Object.keys(types);
  keys.forEach (function (name){
    var type = types[name];
    if (type.structure) {
      var fileStream = streamifier.createReadStream (type.structure);
      var reader = readers.metaMappings ['meta.definition'];
      type.expression = reader (fileStream,oldLibrary,newLibrary);
      logger.info ('Read %s, got %j', name, type.expression, {});
      type.typeReader = buildReader (newLibrary,type);
    }
  });
  return newLibrary;
}

function buildStructures(oldLibrary,newLibrary) {
  function isDefinition (typeDef) {
    return typeDef && typeDef.name && typeDef.version;
  }
  function isName (typeDef) {
    return typeDef && typeDef.name && !typeDef.version;
  }
  function isRelation (typeDef) {
    return typeDef && typeDef.tag;
  }
  var nameTypes = getTypes (newLibrary,isName);
  var definitionTypes = getTypes (newLibrary,isDefinition);
  var relationTypes = getTypes (newLibrary,isRelation);
  logger.info ('Building %d types {%d names, %d definitions %d relations}',
               Object.keys(newLibrary.types).length,
               Object.keys(nameTypes).length,
               Object.keys(definitionTypes).length,
               Object.keys(relationTypes).length);
  newLibrary = buildStructures2 (oldLibrary,newLibrary,nameTypes);
  newLibrary = buildStructures2 (oldLibrary,newLibrary,definitionTypes);
  newLibrary = buildStructures2 (oldLibrary,newLibrary,relationTypes);
  // Should be built in order: names then definitions and then relations
  return newLibrary;
}

module.exports.makeLibrary = makeLibrary;
module.exports.makeBaseLibrary = makeBaseLibrary;
module.exports.registerType = registerType;
module.exports.getTypeDefinition = getTypeDefinition;
module.exports.getReaderFn = getReaderFn;
module.exports.getNameFromStreamId = getNameFromStreamId;
module.exports.getTypeDefinitionFromStreamId = getTypeDefinitionFromStreamId;
module.exports.buildStructures = buildStructures;
module.exports.buildReader = buildReader;
