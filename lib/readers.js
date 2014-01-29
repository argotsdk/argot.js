var primitives = require('./primitives.js');
var libfns = require('./library.js');
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

function readMetaDefinition(fileStream,oldLibrary,newLibrary) {
  var typeStreamId = readUVInt(fileStream);
  var readerDefinition = libfns.getTypeDefinitionFromStreamId(oldLibrary,typeStreamId);
  var reader = libfns.getReaderFn(readerDefinition);
  if (reader) {
    return reader(fileStream,oldLibrary,newLibrary);
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

function readMetaSequence(fileStream,oldLibrary,newLibrary) {
  var sequenceSize = readUInt8(fileStream);
  var sequence = [];
  for(var i = 0; i < sequenceSize;  i++) {
    var readType = readMetaDefinition(fileStream,oldLibrary,newLibrary);
    sequence.push(readType);
  }
  return sequence;
}

function readMetaAtom(fileStream,library) {
  var min = readUVInt(fileStream);
  var max = readUVInt(fileStream);
  var attributes = readMetaSequence(fileStream,library);
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

function readMetaReference(fileStream,library,currentLibrary) {
  /** It seems that meta reference is the "this type is made of other types"
   signifier. If we add reader and writers to this and to the meta array types
   (for looping) then that should be enough to read and write all of our custom
   types. Should be..
   */
  var streamId = readUVInt(fileStream);
  if (!currentLibrary) {
    throw 'no current lib';
  }
  return {type:libfns.getNameFromStreamId(currentLibrary,streamId),
          reader:libfns.getReaderFn(libfns.getTypeDefinitionFromStreamId(currentLibrary,streamId))};
}

function readMetaTag(fileStream,oldLibrary,newLibrary) {
  var description = readUtf8(fileStream);
  var expression = readMetaDefinition(fileStream,oldLibrary,newLibrary);
  return {description:description, expression:expression};
}

function readMetaArray(fileStream,oldLibrary,newLibrary) {
  var sizeType = readMetaDefinition(fileStream,oldLibrary,newLibrary);
  var typeType = readMetaDefinition(fileStream,oldLibrary,newLibrary);
  return {arraySize:sizeType, arrayType:typeType};

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

function readMetaEncoding(fileStream,oldLibrary,newLibrary) {
  var expression = readMetaDefinition(fileStream,oldLibrary,newLibrary);
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
  return readUtf8(fileStream);
}

module.exports.metaMappings = {
  'base': readDictionaryBase,
  'name': readDefinitionName,
  'definition':  readDefinitionNameAndVersion,
  'relation':  readRelation,
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
  'meta.abstract_map': readMetaAbstractMap,
  'meta.abstract': readMetaAbstract,
  'meta.encoding': readMetaEncoding,
  'meta.id': readMetaId,
  'meta.envelope': readMetaEnvelope,
  'uvint28': readUVInt,
  'dictionary.entry_list': readDictionaryListEntry,
  'meta.identified': readMetaIdentified,
  'u8utf8':readUtf8

};
