# mongodb-queue

[![NPM version][npm-image]][npm-url] ![Build Status][workflow-ci-url]
[![license][license-image]][license-url] [![install size][size-image]][size-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![codecov][codecov-image]][codecov-url]

A really light-weight way to create queues with a nice API if you're already
using MongoDB.

## Getting started

Install using yarn:

```bash
yarn add @openwar/mongodb-queue
```

Or npm:

```bash
npm install @openwar/mongodb-queue
```

Create a connection to your MongoDB database, and use it to create a queue
object:

```js
import { MongoClient } from 'mongodb';
import mongoDbQueue from '@openwar/mongodb-queue';

const url = 'mongodb://localhost:27017/';
const client = new MongoClient(url, { useUnifiedTopology: true });

await client.connect();

const db = client.db('test');
const queue = mongoDbQueue(db, 'my-queue');

// ...
```

Add a message to a queue:

```js
const id = await queue.add('Hello World!');
// Message with payload 'Hello World!' added.
// 'id' is returned, useful for logging.
```

Get a message from the queue:

```js
const msg = await queue.get();
console.log('msg.id %s', msg.id);
console.log('msg.ack %s', msg.ack);
console.log('msg.payload %o', msg.payload); // 'Hello, World!'
console.log('msg.tries %d', msg.tries);
```

Ping a message to keep its visibility open for long-running tasks:

```js
const id = await queue.ping(msg.ack);
// Visibility window now increased for this message id.
// 'id' is returned, useful for logging.
```

Ack a message (and remove it from the queue):

```js
const id = queue.ack(msg.ack);
// This msg removed from queue for this ack.
// The 'id' of the message is returned, useful for logging.
```

If you haven't already, you should call this to make sure indexes have been
added in MongoDB. Of course, if you've called this once (in some kind one-off
script) you don't need to call it in your program. Of course, check the
[changelog](./CHANGELOG.md) to see if you need to update them with new releases:

```js
await queue.createIndexes();
```

## Creating a Queue

To create a queue, call the exported function with the `MongoClient`, the name
and a set of options. The MongoDB collection used is the same name as the name
passed in:

```js
import mongoDbQueue from '@openwar/mongodb-queue';

// an instance of a queue
const queue = mongoDbQueue(db, 'queue');
```

To pass in options for the queue:

```js
const resizeQueue = mongoDbQueue(db, 'resize-queue', {
  visibility: 30,
});
```

This example shows a queue with a message visibility of 30 seconds.

## Options

### name

This is the name of the MongoDB Collection you wish to use to store the
messages. Each queue you create will be it's own collection.

e.g.

```js
const resizeImageQueue = mongoDbQueue(db, 'resize-image-queue');
const notifyOwnerQueue = mongoDbQueue(db, 'notify-owner-queue');
```

This will create two collections in MongoDB called `resize-image-queue` and
`notify-owner-queue`.

While using 2 instances of the same queue name won't interfere with each other
and will play along nicely, it is not advisable. Instead please use the same
instance in your code. This is specially important if you use different options
for the queue, since it might lead to inconsistent behavior.

### visibility - Message Visibility Window in seconds

Default: `30`

By default, if you don't acknowledge a message within the first 30 seconds after
receiving it, it is placed back in the queue so it can be fetched again. This is
called the visibility window.

You may set this visibility window on a per queue basis. For example, to set the
visibility to 15 seconds:

```js
const queue = mongoDbQueue(db, 'queue', { visibility: 15 });
```

All messages in this queue now have a visibility window of 15 seconds, instead
of the default 30 seconds.

## Operations

### .add()

You can add a `string` to the queue:

```js
const id = await queue.add('Hello, World!');
// Message with payload 'Hello, World!' added.
// 'id' is returned, useful for logging.
```

Or add an object of your choosing:

```js
const id = await queue.add({ err: 'E_BORKED', msg: 'Broken' });
// Message with payload `{ err: 'E_BORKED', msg: 'Broken' }` added.
// 'id' is returned, useful for logging.
```

Or add array as a message:

```js
const id = await queue.add(['msg1', 'msg2', 'msg3']);
// Message with payload `['msg1', 'msg2', 'msg3']` added.
// 'id' is returned, useful for logging.
```

In case your messages can be duplicated (like events that occur multiple times
in a short period), you can use the optional `hashKey` parameter to prevent this
event from being duplicated in the queue. This is extremely useful if you are
doing notifications or handling events from external sources (like webhooks).

```js
const payload = { id: 'msg1', msg: 'Possible duplicated message' };
const id1 = await queue.add(payload, 'id');
const id2 = await queue.add(payload, 'id');
// Only one Message with `payload` added.
// 'id1' is the same as 'id2', and it is useful for logging.
```

In case your message doesn't have an idempotent key, you can easily generate one
and append it to your payload.

```js
import crypto from 'crypto';

const payload = { id: 'msg1', msg: 'Possible duplicated message' };
const hash = crypto
  .createHash('sha1')
  .update(JSON.stringify(payload))
  .digest('hex');

const hash = crypto.createHash('sha1');
const id1 = await queue.add({ ...payload, hash }, 'hash');
const id2 = await queue.add({ ...payload, hash }, 'hash');
// Only one Message with `payload` added.
// 'id1' is the same as 'id2', and it is useful for logging.
```

In case your messages are just list of ids that should be unique (e.g: users to
process based on some event based queue), you can easily pass the payload as the
`hashKey`.

```js
const payload = 'some-unique-id';
const id1 = await queue.add(payload, payload);
const id2 = await queue.add(payload, payload);
// Only one Message with `payload` added.
// 'id1' is the same as 'id2', and it is useful for logging.
```

It will also work with numbers for those of you that still use integers/longs
for ids.

```js
const payload = 123456789;
const id1 = await queue.add(payload, payload);
const id2 = await queue.add(payload, payload);
// Only one Message with `payload` added.
// 'id1' is the same as 'id2', and it is useful for logging.
```

### .get()

Retrieve a message from the queue:

```js
const msg = await queue.get();
// You can now process the message
// The message will be `undefined` if the queue is empty.
```

You can choose the visibility of an individual retrieved message by passing the
`visibility` option:

```js
const msg = await queue.get({ visibility: 10 });
// You can now process the message for 10 seconds before it goes back into the
// queue if not acknowledged, instead of the duration that is set on the queue
// in general
```

Message will have the following structure:

```js
{
  // ID of the message
  id: '533b1eb64ee78a57664cc76c',
  // ID for ack and ping operations
  ack: 'c8a3cc585cbaaacf549d746d7db72f69',
  // Payload passed when the message was addded
  payload: 'Hello, World!',
  // Number of times this message has been retrieved from queue without being
  // acknowledged
  tries: 1,
}
```

### .ack()

After you have received an item from a queue and processed it, you can delete it
by calling `.ack()` with the unique `ack` id returned from the message:

```js
const msg = await queue.get();
// process the message
const id = await queue.ack(msg.ack);
// this message has now been removed from the queue
```

### .ping()

After you have received an item from a queue and you are taking a while to
process it, you can `.ping()` the message to tell the queue that you are still
alive and continuing to process the message:

```js
const msg = await queue.get();
// some partial processing of the message...
const id = await queue.ping(msg.ack);
// this message has had it's visibility window extended
// keep processing the message
```

You can also choose the visibility time that gets added by the ping operation by
passing the `visibility` option:

```js
const msg = await queue.get();
const id = await queue.ping(msg.ack, { visibility: 10 });
// this message has had its visibility window extended by 10 seconds instead of
// the visibilty set by the queue in general
```

### .total()

Returns the total number of messages that has ever been in the queue, including
all current messages:

```js
const count = queue.total();
console.log('This queue has seen %d messages', count);
```

### .size()

Returns the total number of messages that are waiting in the queue.

```js
const count = queue.size();
console.log('This queue has %d current messages', count);
```

### .inFlight()

Returns the total number of messages that are currently in flight. i.e. that
have been received but not yet acknowledged:

```js
const count = queue.inFlight();
console.log('A total of %d messages are currently being processed', count);
```

### .done()

Returns the total number of messages that have been processed correctly in the
queue:

```js
const queue.done();
console.log('This queue has processed %d messages', count);
```

### Notes about stats numbers

If you add up `.size() + .inFlight() + .done()` then you should get `.total()`,
but this will only be approximate since these are different operations hitting
the database at slightly different times. Hence, a message or two might be
counted twice or not at all depending on message turnover at any one time. You
should not rely on these numbers for anything, but are included as
approximations at any point in time for stats or health monitoring of the queue.

## Use of MongoDB

Whilst using MongoDB recently and having a need for lightweight queues, I
realized that the atomic operations that MongoDB provides are ideal for this
kind of job.

Since everything it atomic, it is impossible to lose messages in or around your
application. I guess MongoDB could lose them, but it's a safer bet it won't
compared to your own application.

As an example of the atomic nature being used, messages stay in the same
collection and are never moved around or deleted, just a couple of fields are
set, incremented or deleted. We always use MongoDB's excellent
`collection.findAndModify()` so that each message is updated atomically inside
MongoDB and we never have to fetch something, change it and store it back.

## Acknowledgements

This is heavily based on
[@chilts's work](https://github.com/chilts/mongodb-queue), but wanted to use
more modern approach (like promises and typescript) and a few changes for my
requirements.

This package is not a full replacement of the forked one, since I did remove
some features (like `clean()`, `deadQueue` and `maxRetries`) as well as allowing
the messages to be arrays. In my case I want to be able to add any message type
and as for the other features, I don't need them and might add them later.

## License

This project it [MIT licensed](./LICENSE).

[npm-image]: https://badge.fury.io/js/%40openwar%2Fmongodb-queue.svg
[npm-url]: https://www.npmjs.com/package/@openwar/mongodb-queue
[license-image]: https://img.shields.io/npm/l/@openwar/mongodb-queue
[license-url]: https://www.npmjs.com/package/@openwar/mongodb-queue
[workflow-ci-url]:
  https://github.com/openwar/mongodb-queue/workflows/CI/badge.svg
[size-image]: https://packagephobia.com/badge?p=@openwar/mongodb-queue
[size-url]: https://packagephobia.com/result?p=@openwar/mongodb-queue
[daviddm-image]: https://david-dm.org/openwar/mongodb-queue.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/openwar/mongodb-queue
[codecov-image]:
  https://codecov.io/gh/openwar/mongodb-queue/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/openwar/mongodb-queue
