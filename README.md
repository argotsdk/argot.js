# argot [![Build Status](https://secure.travis-ci.org/argotsdk/argot.js.png?branch=master)](http://travis-ci.org/argotsdk/argot.js)

A language for the Internet of Things.

A JavaScript port of [Argot SDK](http://www.argot-sdk.org/).

## Documentation

* [Dictionary Format](https://github.com/argotsdk/argot.js/blob/master/doc/dictionary_format.md)
* [Argot Message Format](https://github.com/argotsdk/argot.js/blob/master/doc/argotmessage_format.md)

## Getting Started

Like all good node packages, you can find [Argot in NPM](https://www.npmjs.org/package/argot).

Add Argot to your project with

`npm install argot --save`

## Usage

Argot has a single entry point exported as a module, containing three functions that should fulfil all needs.

Pull it into your project with `var argot = require('argot');`

Of the available functions, one is to read dictionary files and the other two are for reading messages.

### Argot.loadDictionary

Load dictionary takes an Argot Dictionary file, reads it and processes the contents into a `Library` containing data definitions.

* Params: `fileName` - A file on disk
* Returns: A [`Q`](https://github.com/kriskowal/q) promise containing a library

Example:

```javascript
var argot = require('argot');

argot.loadDictionary('~/a/file/on/disk.dictionary')
  .then(function(lib) {
    // do something with the library here
  })
  .fail(function(err) {
    // uh-oh,
  });
```

### Argot.readMessage

Read an [Argot Message](http://blog.argot-sdk.org/2014/02/argot-message-format-self-describing.html), a data type that includes dictionary defintions along with the message content.

* Params: `messageStream` - A Node readable stream containing the data to be read. The data should conform to the Argot Message format.
* Returns: A [`Q`](https://github.com/kriskowal/q) promise containing the read data and the library that has been built as part of the process

Example:

```javascript
var argot = require('argot');

var stream = aStreamAppears();

argot.readMessage(stream)
  .then(function(libAndData) {
    var lib = libAndData[0];
    var data = libAndData[1];
    // do something with the data here
  })
  .fail(function(err) {
    // uh-oh,
  });
```

Read more about for format at [Argot Message Format](https://github.com/argotsdk/argot.js/blob/master/doc/argotmessage_format.md)

### Argot.read

Read some data from a stream.

* Params:
  - `library` - A library containing data definitions
  - `data` - A Node readable stream of data to be read
  - `type` - Optional. The type of data being read, this should correspond to a type that the library knows about.
* Returns: The read data. (This function performs no IO so we can run synchronously)

> About Argot Definition identifiers, there are two identifiers, a Stream Id and a human readable name ('light.colour', 'person.name', etc). With Argot.js you only need to know about the name identifier.
> When you call `read` and supply a type name then Argot knows exactly how to build your data. But without the type, the stream Id needs to be the first thing in the data stream, as a prompt to direct Argot to the type that should be built.
>
> For example, if you have a data type that has a Stream Id of 10 and a name of 'person', you can read an instance of that data with:
> `argot.read(lib,data,'person')`
>
> For the same instance data, if you don't know that it's a 'person' type, but you do know that the stream begins with the Stream Id then the type name can be omitted.
> `argot.read(lib,data)`

Example, with known type:

```javascript
var argot = require('argot');

argot.loadDictionary('~/a/file/on/disk.dictionary')
  .then(function(lib) {
    var stream = aStreamAppears();
    var data = argot.read(lib,stream,'yourtype');
    // do something with data
  })
  .fail(function(err) {
    // uh-oh,
  });
```

Example, with unknown type:

```javascript
var argot = require('argot');

argot.loadDictionary('~/a/file/on/disk.dictionary')
  .then(function(lib) {
    var stream = aStreamAppears();
    var data = argot.read(lib,stream);
    // do something with data
  })
  .fail(function(err) {
    // uh-oh,
  });
```

## Development

Check it out the project and run `grunt` to perform a style check (jshint) and run through the tests.

The main points of interest are:

* `argot.js` is the main file
* `dictionary.js` deals with loading dictionaries from a file
* `library.js` is the Argot library data type

There are a few other files, mostly supplementary.

## License

BSD-3 License, see [LICENSE.TXT](https://github.com/argotsdk/argot.js/blob/master/LICENSE.TXT)

Copyright (c) 2014 Live Media Pty Ltd
