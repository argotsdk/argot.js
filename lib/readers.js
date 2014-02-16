var primitives = require('./primitives.js');
var readUInt8 = primitives.readUInt8;
var readUInt16 = primitives.readUInt16;
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

function readDictionaryDefinitionEnvelope (fileStream) {
  // equiv to MetaEnvelopeReader
  var size = readUVInt (fileStream);
  return fileStream.read(size); // in the java the parsing comes later. Can we be eager?
}


function readRelation(fileStream) {
  var id = readUVInt (fileStream);
  var tag = readUtf8(fileStream);
  return {id : id, tag: tag};
}

function readDefinitionNameAndVersion (fileStream,refLibrary) {
  var name = readDefinitionName(fileStream,refLibrary);
  var version = readDefinitionVersion(fileStream,refLibrary);
  name.version = version;
  return name;
}

function readDefinitionVersion (fileStream) {
  var major = readUInt8(fileStream);
  var minor = readUInt8(fileStream);
  return {major : major, minor: minor};
}

function readMetaDefinition(fileStream,refLibrary,library) {
  var typeStreamId = readUVInt(fileStream);
  var readerDefinition = refLibrary.getTypeDefinitionFromStreamId(typeStreamId);
  var reader = refLibrary.getReaderFn(readerDefinition);
  if (reader) {
    return reader(fileStream,refLibrary,library);
  } else {
    throw ('No reader for type: ' + typeStreamId);
  }
}

var readStructure = readMetaDefinition;

function readMetaCluster() {
  // meta cluster is actually a really big object in Java with a lot of fields
  // however, the reader doesn't seem to actually put anything in there..
  return {};
}

function readMetaSequence(fileStream,refLibrary,library) {
  var sequenceSize = readUInt8(fileStream);
  var sequence = [];
  for(var i = 0; i < sequenceSize;  i++) {
    var readType = readMetaDefinition(fileStream,refLibrary,library);
    sequence.push(readType);
  }
  return sequence;
}

function readMetaAtom(fileStream,refLibrary,library) {
  var min = readUVInt(fileStream);
  var max = readUVInt(fileStream);
  var attributes = readMetaSequence(fileStream,refLibrary,library);
  return {min: min, max: max, attributes: attributes};
}

function readMetaAttributeSize(fileStream) {
  var size = readUInt8(fileStream);
  return {name:'size', value:size};
}

function makeMetaAttributeFunction(name) {
  return function() {
    return {name: name};
  };
}

function readMetaReference(fileStream,refLibrary,library) {
  /** It seems that meta reference is the "this type is made of other types"
   signifier. If we add reader and writers to this and to the meta array types
   (for looping) then that should be enough to read and write all of our custom
   types.
   */
  var streamId = readUVInt(fileStream);
  if (!library) {
    throw 'no current lib';
  }
  return {type:library.getNameFromStreamId(streamId),
          reader:library.getReaderFn(library.getTypeDefinitionFromStreamId(streamId))};
}

function readMetaTag(fileStream,refLibrary,library) {
  var description = readUtf8(fileStream);
  var expression = readMetaDefinition(fileStream,refLibrary,library);
  return {type:'meta.tag', description:description, expression:expression};
}

function readMetaArray(fileStream,refLibrary,library) {
  var sizeType = readMetaDefinition(fileStream,refLibrary,library);
  var typeType = readMetaDefinition(fileStream,refLibrary,library);
  return {type:'meta.array', arraySize:sizeType, arrayType:typeType};

}

function readMetaAbstractMap(fileStream) {
  var concreteType = readUVInt(fileStream);
  return {concreteType:concreteType};
}

function readMetaAbstract(fileStream){
  var size = readUVInt(fileStream);
  var expressions = [];
  for(var i = 0; i < size;  i++) {
    var expr = readMetaAbstractMap(fileStream);
    expressions.push(expr);
  }
  return expressions;
}

function readMetaEncoding(fileStream,refLibrary,library) {
  var expression = readMetaDefinition(fileStream,refLibrary,library);
  var encoding = readUtf8(fileStream);
  return {expression: expression, encoding:encoding};
}

function readMetaId(fileStream) {
  // TODO this isn't right
  var identity = readUInt16(fileStream);
  return {identity:identity};
}

function readMetaExpression(fileStream) {
  var typeMapId = readUVInt(fileStream);
  var typeType = readUVInt(fileStream);
  return {mapId:typeMapId, type:typeType};
}

function readMetaEnvelope(fileStream) {
  var sizeMapId = readUVInt(fileStream);
  var sizeType = readUVInt(fileStream);
  var typeExpression = readMetaExpression(fileStream);
  return {size:{mapId:sizeMapId,
                type:sizeType},
          type:typeExpression};
}

function readDictionaryListEntry(fileStream) {
  var length = readUInt8(fileStream);
  var expressions = [];
  for(var i = 0; i < length;  i++) {
    var expr = readMetaExpression(fileStream);
    expressions.push(expr);
  }
  return expressions;
}

function readMetaIdentified(fileStream) {
  return {type:'meta.identified',identifies:readUtf8(fileStream)};
}

function readMagicNumber(fileStream) {
  var magic = readUInt8(fileStream);
  var version = readUInt8(fileStream);
  var major = version >> 4;
  var minor = version & 15;
  return {magic:magic, version:{major:major, minor:minor}};
}


function readFunctionUnimplemented() {
  throw 'not implemented';
}

function readMetaName(fileStream,refLibrary,library) {
  var nameAndGroupId = readMetaSequence(fileStream,refLibrary,library);
  return {name:nameAndGroupId[0], groupId:nameAndGroupId[1]};
}

var readMetaVersion = readFunctionUnimplemented;
var readDictionaryEntry = readFunctionUnimplemented;
var readMetaAtomAttribute = readFunctionUnimplemented;
var readInt64 = readFunctionUnimplemented;
var readUInt32 = readFunctionUnimplemented;

module.exports.metaMappings = {
  'dictionary.base': readDictionaryBase,
  'dictionary.name': readDefinitionName,
  'dictionary.definition':  readDefinitionNameAndVersion,
  'dictionary.relation':  readRelation,
  'dictionary.definition_envelope':  readDictionaryDefinitionEnvelope,
  'meta.definition': readStructure,
  'meta.cluster': readMetaCluster,
  'meta.sequence': readMetaSequence,
  'meta.atom': readMetaAtom,
  'meta.attribute.size': readMetaAttributeSize,
  'meta.attribute.integer': makeMetaAttributeFunction('integer'),
  'meta.attribute.unsigned': makeMetaAttributeFunction('unsigned'),
  'meta.attribute.signed': makeMetaAttributeFunction('signed'),
  'meta.attribute.bigendian': makeMetaAttributeFunction('bigendian'),
  'meta.attribute.IEEE756': makeMetaAttributeFunction('IEEE756'),
  'meta.reference':readMetaReference,
  'meta.tag':readMetaTag,
  'meta.array':readMetaArray,
  'uint8':readUInt8,
  'uint16':readUInt16,
  'uint32':readUInt32,
  'int64':readInt64,
  'meta.abstract_map': readMetaAbstractMap,
  'meta.abstract': readMetaAbstract,
  'meta.encoding': readMetaEncoding,
  'meta.id': readMetaId,
  'meta.envelope': readMetaEnvelope,
  'uvint28': readUVInt,
  'dictionary.entry_list': readDictionaryListEntry,
  'meta.identified': readMetaIdentified,
  'u8utf8':readUtf8,
  'meta.name':readMetaName,
  'dictionary.entry': readDictionaryEntry,
  'meta.expression': readMetaExpression,
  'meta.atom_attribute': readMetaAtomAttribute,
  'meta.version': readMetaVersion
};

module.exports.readMagicNumber = readMagicNumber;
module.exports.readStructure = readStructure;
