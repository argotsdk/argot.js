var primitives = require('./primitives.js');
var libfns = require('./primitives.js');
var readUInt8 = primitives.readUInt8;
var readUVInt = primitives.readUVInt;
var readUtf8 = primitives.readUtf8;

function readDictionaryBase () {
  return {
    group: 0,
    name: 'base'
  };
}

function readDefinitionName (fileStream) {
  // groupId is used in java as a stream Id. But I think this here actually refers to the parent.
  // groupId is used to lookup a name prefix, presumably from the parent
  // actually, groupId appears to be the parents stream id
  var groupId = readUVInt (fileStream);
  var name = readUtf8(fileStream);
  return {group : groupId, name: name}; // TODO add fullname when we have library lookup
}

function readRelation(fileStream) {
  var id = readUVInt (fileStream);
  var tag = readUtf8(fileStream);
  return {id : id, tag: tag};
}

function readDefinitionNameAndVersion (fileStream,library) {
  var name = readDefinitionName(fileStream,library);
  var version = readDefinitionVersion(fileStream,library);
  name.version = version;
  return name;
}

function readDefinitionVersion (fileStream) {
  var major = readUInt8(fileStream);
  var minor = readUInt8(fileStream);
  return {major : major, minor: minor};
}

function readMetaDefinition(fileStream,library) {
  var typeStreamId = readUVInt(fileStream);
  var readerDefinition = libfns.getTypeDefinitionFromStreamId(library,typeStreamId);
  var reader = libfns.getReaderFn(readerDefinition);
  if (reader) {
    return reader(fileStream);
  } else {
    throw ('No reader for type: ' + typeStreamId);
  }
}


function readStructure(fileStream,library) {
  var structure = readMetaDefinition(fileStream,library);
  return structure;
}

module.exports.metaMappings = {
  'base': readDictionaryBase,
  'name': readDefinitionName,
  'definition':  readDefinitionNameAndVersion,
  'relation':  readRelation,
  'meta.definition': readStructure
};
