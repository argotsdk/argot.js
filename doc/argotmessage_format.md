Argot Message Format
============================

Argot Messages are a special form of data that contains a dictionary definition along with the payload matching that definition. It is built upon the core dictionary (and, possibly meta too (TBD)) but without including them.

## Header

Argot messages use a magic number to mark their identity, the magic number is `65`. The presence of the magic number is followed by a version identifier, this should be `19`.

## Dictionary

The dictionary contains definitions, beginning with a number indicating the amount of definitions. Each definition is of the standard type (id, location, structure).

This process is covered already in the `readDefinitions` function in `dictionary.js` and can be reused providing a base core dictioary as reference.

## Message

The message segment is read as standard messages are, starting with a Stream Id indicating the type, and then the type reader for that type will be able to handle the rest.
