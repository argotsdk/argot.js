Argot Message Format
============================

Argot Messages are a special form of data that contains a dictionary definition along with the payload matching that definition. The aim is to provide streamlined use in consumers by bypassing the need for them to explicitly maintain and load their own dictionaries. Internally, the messages are read using a version of the meta dictionary augmented with additional types from the core dictionary.

Further details can be found in the blog post [Argot Message Format - A self describing binary message format](http://blog.argot-sdk.org/2014/02/argot-message-format-self-describing.html)

## Header

Argot messages use a 8 bit magic number to mark their identity, the magic number is `65`. The magic number is then followed by a version identifier, this should be `1.3` (four bits each for major and minor).

## Body

The body comes in two parts, the first containing definitions and the second containing the message payload.

### Definitions

The definitions are in the same standard format that is used for reading dictionary files. Any number of definitions can be included in this payload, although for practical reasons it is prudent to keep the number of definitions and ensuing bandwidth low.

### Message

The message segment is read as standard messages are, starting with a Stream Id indicating the type, and then the type reader for that type will be able to handle the rest.
