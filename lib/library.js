var logger = require('winston');
var readers = require('./readers');
var streamifier = require('streamifier');


function Library(version) {
  this.version = version;
  this.coreSize = 980;
  this.types = {};
  this.streamIdToNameMap = {};
}

function makeLibrary(version) {
  if (version === 1.3) {
    return new Library(version);
  } else {
    throw ('Unsupported version: ' + version);
  }
}

Library.prototype.getNameFromStreamId = function(streamId) {
  return this.streamIdToNameMap[streamId];
};

Library.prototype.addStreamIdToNameMapping = function(streamId,name) {
  var fullName = this.getNameFromStreamId(streamId);
  if (fullName && fullName !== name) {
    logger.warn('Id %d is already mapped to %s, overriding with %s',
                streamId, this.getNameFromStreamId(streamId), name);
  }
  this.streamIdToNameMap[streamId] = name;
  logger.debug('Mapped Stream ID %d to name %s', streamId, name);
};

Library.prototype.getFullName = function(definition) {
  if (definition.parent) {
    var parent = this.getTypeDefinition(definition.parent);
    return this.getFullName(parent) + '.' + definition.name;
  } else {
    return definition.name;
  }
};

Library.prototype.makeDefinition = function(id, location, structure) {
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
  var parentName = this.getNameFromStreamId(group);
  if (parentName) {
    definition.parent = parentName;
  }
  if(readers.metaMappings[this.getFullName(definition)]){
    definition.reader = readers.metaMappings[this.getFullName(definition)];
  }
  logger.debug('Made Definition %j', definition, {});
  return definition;
};

function getParentName(definition) {
  return definition.parent;
}

function isChild(definition) {
  return definition.parent;
}

Library.prototype.getTypeDefinition = function(name) {
  return this.types[name] || {name: name}; // hack until we have default meta types
};

Library.prototype.getTypeDefinitionFromStreamId = function(streamId) {
  var name = this.getNameFromStreamId(streamId);
  return this.types[name] || {name: name}; // hack until we have default meta types
};

Library.prototype.addDefinitionToLibrary = function(definition,streamId) {
  this.types[this.getFullName(definition)] = definition;
  if (streamId) {
    this.addStreamIdToNameMapping(streamId,this.getFullName(definition));
  }
  logger.debug('Added %s to library', this.getFullName(definition));
};

Library.prototype.addRelationToLibrary = function(relation,streamId) {
  this.types[relation.tag] = relation;
  if (streamId) {
    this.addStreamIdToNameMapping(streamId,relation.tag);
  }
  logger.debug('Added %s to library', relation.tag);
};

function addChildToParent(parent, child) {
  parent.children = parent.children || [];
  parent.children.push(child);
  return parent;
}

Library.prototype.registerName = function(id, location, structure) {
  var definition = this.makeDefinition(id, location, structure);
  this.addDefinitionToLibrary(definition,id);
  if (isChild(definition)) {
    var parentName = getParentName(definition);
    var parentDef = this.getTypeDefinition(parentName);
    if (!parentDef) {
      throw 'Type refers to non-existant parent. Abort!';
    }
    parentDef = addChildToParent(parentDef, definition);
    this.addDefinitionToLibrary(parentDef);
  }
};

Library.prototype.registerDefinition = function(id, location, structure) {
  var definition = this.makeDefinition(id, location, structure);
  this.addDefinitionToLibrary(definition,id);
  if (isChild(definition)) {
    var parentName = getParentName(definition);
    var parentDef = this.getTypeDefinition(parentName);
    if (!parentDef) {
      throw 'Type refers to non-existant parent. Abort!';
    }
    parentDef = addChildToParent(parentDef, definition);
    this.addDefinitionToLibrary(parentDef);
  }
};

Library.prototype.makeRelation = function(id, location) {
  return {id: location.id, tag: location.tag};
};

Library.prototype.registerRelation = function(id, location, structure) {
  var relation = this.makeRelation(id, location, structure);
  this.addRelationToLibrary(relation,id);
};

Library.prototype.registerType = function(id, location, structure) {
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
    this.registerDefinition(id, location, structure);
  } else if (isName(location)) {
    this.registerName(id, location, structure);
  } else  if (isRelation (location)) {
    this.registerRelation(id, location, structure);
  } else {
    throw ('Could not register unknown type: ' + id);
  }
};

Library.prototype.getReaderFn = function(typeDefinition) {
  var reader = typeDefinition.reader;
  if(!reader) {
    logger.warn('No reader for type: %s, %j', typeDefinition.name, typeDefinition, {});
  }
  return reader;
};

Library.prototype.addBaseDef = function(id,name) {
    var definition = {name:name, parent:'dictionary', reader:readers.metaMappings['dictionary.' + name ]};
    this.addDefinitionToLibrary(definition, id);
  };

function makeBaseLibrary(version) {
  var library = makeLibrary(version);
  library.addBaseDef(30,'base');
  library.addBaseDef(31,'name');
  library.addBaseDef(32,'definition');
  library.addBaseDef(35,'definition_envelope');
  return library;
}

Library.prototype.getTypes = function(filterFn) {
  var keys = Object.keys(this.types);
  var filteredTypes = {};
  var library = this;
  keys.forEach(function(key) {
    var typeDef = library.getTypeDefinition(key);
    if (filterFn(typeDef)) {
      filteredTypes [key] = typeDef;
    }
  });
  return filteredTypes;
};

Library.prototype.addReader = function(type) {
  if(!type.reader) {
    var reader = this.buildReader(type);
    if (reader) {
      type.reader = reader;
    }
  }
  return type;
};

Library.prototype.buildReader = function(type) {
  var makeAugmentor = function(description,aReaderFn) {
    return function(fileStream, subject) {
      var value = aReaderFn(fileStream);
      subject[description] = value;
      return subject;
    };
  };

  if (type.expression) {
    if (type.expression.length > 0) {
    var augmentors = [];
    for(var i = 0; i < type.expression.length;  i++) {
      var segment = type.expression[i];
      if (segment.description && segment.expression) {
        var description = segment.description;
        var expressionType = segment.expression.type;
        var readerFn = this.getReaderFn(this.getTypeDefinition(expressionType));
        var augmentor = makeAugmentor(description,readerFn);
        augmentors.push(augmentor);
      }
    }
    return function (fileStream) {
      var subject = {};
      for(var i = 0; i < augmentors.length;  i++) {
        subject = augmentors[i](fileStream,subject);
      }
      return subject;
    };
    } else {
      return undefined;
    }
  } else {
    throw 'Can not build reader without an expression';
  }
};

Library.prototype.buildStructures2 = function(refLibrary,types) {
  // We really need a better name for this
  var keys = Object.keys(types);
  var library = this;
  keys.forEach (function (name){
    var type = types[name];
    if (type.structure) {
      var fileStream = streamifier.createReadStream (type.structure);
      if (type.expression) {
        // When we read an Argot Message we need to 'augment' the library with the definitions
        // contained in the payload, after adding the new definitions we arrive at a point where
        // the library contains prebuilt expressions and readers for the base types but none for
        // the newly arrived types. When we end up in this function we cannnot rebuild the
        // expressions because their structure streams have already been exhausted. So here we
        // are just skipping over them.
        logger.debug('Skipping rebuild of structure for type %s', name);
      } else {
        var reader = readers.metaMappings ['meta.definition'];
        type.expression = reader(fileStream,refLibrary,library);
        logger.debug('Read %s, got %j', name, type.expression, {});
        library.addReader(type);
      }
    }
  });
};

Library.prototype.buildStructures = function(refLibrary) {
  function isDefinition (typeDef) {
    return typeDef && typeDef.name && typeDef.version;
  }
  function isName (typeDef) {
    return typeDef && typeDef.name && !typeDef.version;
  }
  function isRelation (typeDef) {
    return typeDef && typeDef.tag;
  }
  var nameTypes = this.getTypes(isName);
  var definitionTypes = this.getTypes(isDefinition);
  var relationTypes = this.getTypes(isRelation);
  logger.info ('Building %d types {%d names, %d definitions %d relations}',
               Object.keys(this.types).length,
               Object.keys(nameTypes).length,
               Object.keys(definitionTypes).length,
               Object.keys(relationTypes).length);
  this.buildStructures2(refLibrary,nameTypes);
  this.buildStructures2(refLibrary,definitionTypes);
  this.buildStructures2(refLibrary,relationTypes);
  // Should be built in order: names then definitions and then relations
};

function read(library,type,data) {
  var typeDef = library.getTypeDefinition(type);
  var reader = library.getReaderFn(typeDef);
  return reader(data);
}

module.exports.makeLibrary = makeLibrary;
module.exports.makeBaseLibrary = makeBaseLibrary;
module.exports.read = read;
