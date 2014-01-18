Dictionary Format
=======================

Argot dictionaries are self describing, while still being built from basic building blocks.

The fundamental dictionaries are `meta` and `common`, the canonical versions can be found in the [Java source code](https://code.google.com/p/argot/) on Google code but are also reproduced here in the test directory for convenience.

Even though the dictionaries can describe arbitrarily complex types they do still exhibit a common format.


## Simple Types

| Type    | Description
|:------- |:--------- |
| `UInt*` | Unsigned Integer of (*/8) bytes
| `UVInt` | Unsigned Integer of variable bytes. A bit in the high marker indicates that there is more to read
| `Utf8`  | A variable length UTF-8 encode string. The length is indicated prior in a `UVInt`
| & many more to be added



## Custom and Complex Types


### Aliases

| Name            | Type
|:--------------- |:--------- |
| `group`*        | `UVInt`
| `name`          | `Utf8`
| `minor`         | `UInt8`
| `major`         | `UInt8`
| `section-size`  | `UInt8`
| `stream-id`     | `UVInt`

* group is the id of a parent (if there is one).

### Type Definitions (AKA "Locations")

| Type                        | Description
|:--------------------------- |:--------- |
| Dictionary Base             | A marker indicating the start of a dictionary section. Contains no data of its own.
| Definition name             | A composite of `group`, and then `name`
| Definition name and version | A composite of `Definition name` and version (itself a composite of `major` and then `minor`)
| & many more to be added



### Enhanced Type Definitions

I should probably give this a better name..

| Type            | Description
|:--------------- |:--------- |
| `id`            | `UVint` - IDs are assigned sequentially in the series and are zero based.
| `location`*     | A type definition, see above
| `structure`     | A `UVInt` specifying the size, followed by size * bytes of strucure data.
|                 | As for the structure format, more details forthcoming..

* I don't know why it's called location.

### Type Definition Series

Definitions often comie in a series, the series format is as follows.

| Name            | Description
|:--------------- |:--------- |
| `series-size`   | `UVint` specifying the number of type definitions to expect
| Then `series-size` instances of
| Type Definition | A type definition, see above


## File Format

The files are divided into three regions dubbed `core`, `messages` and `final`. Howver, they are all still very similar in their structure.

### Core

The first region, this contains the core body and a number of extensions.

It is read in the following order,

| Type            | Description
|:--------------- |:--------- |
| `section-size`  | 1-m. Followed by the same number of sections
| `core`          | A type definition series
| Then `section-size` - 1 instances of
| `extension`     | A `UVInt` containing the series size in bytes*, and then a type definition series


* The series is prefixed with the number of definitions so this size is redundent for our purposes


### Messages

The second region containing more definitions

| Type            | Description
|:--------------- |:--------- |
| `section-size`  | 1-m. Followed by the same number of sections
| Then `section-size` instances of type definition serieses


### Final

One final type definition series.


### The whole file

| Type
|:--------------- |
| `core`
| `messages`
| `ident`, a `UVInt` that should match the ID of the first (and only?) `definition-name`
| `final`
