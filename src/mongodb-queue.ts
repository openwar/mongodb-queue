/*
 * Copyright (c) 2020-2026 Filipe Guerra
 * https://github.com/openwar/mongodb-queue
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * A lightweight MongoDB-based message queue with TypeScript support, atomic
 * operations, and message deduplication.
 *
 * @example
 * ```ts
 * import { MongoClient } from 'mongodb';
 * import mongoDbQueue from '@openwar/mongodb-queue';
 *
 * const client = new MongoClient('mongodb://localhost:27017/');
 * await client.connect();
 *
 * const db = client.db('my-app');
 * const queue = mongoDbQueue(db, 'my-queue');
 *
 * // Add a message
 * await queue.add({ task: 'process-image', id: 123 });
 *
 * // Get and process a message
 * const msg = await queue.get();
 * if (msg) {
 *   console.log(msg.payload);
 *   await queue.ack(msg.ack);
 * }
 * ```
 *
 * @module
 */

import crypto from 'node:crypto';
import type { Db, Filter, UpdateFilter } from 'mongodb';

// some helper functions
function id() {
  return crypto.randomBytes(16).toString('hex');
}

type MessageSchema = {
  createdAt: Date;
  updatedAt?: Date;
  visible: Date;
  payload: unknown;
  ack?: string;
  tries: number;
  occurrences?: number;
};

/**
 * A message retrieved from the queue.
 *
 * @typeParam T - The type of the message payload
 */
export type Message<T = unknown> = {
  /**
   * Unique identifier for the message
   */
  id: string;
  /**
   * Acknowledgement token used for {@link MongoDbQueue.ack} and
   * {@link MongoDbQueue.ping}
   */
  ack: string;
  /**
   * When the message was first added to the queue
   */
  createdAt: Date;
  /**
   * When the message was last updated
   */
  updatedAt: Date;
  /**
   * The message payload
   */
  payload: T;
  /**
   * Number of times this message has been retrieved without being acknowledged
   */
  tries: number;
  /**
   * Number of times a duplicate message was added (when using hashKey)
   */
  occurrences?: number;
};

type AddOptions<T> = {
  hashKey?: keyof T | T;
  delay?: number;
};

/**
 * A MongoDB-backed message queue interface.
 *
 * @typeParam T - The type of message payloads in this queue
 */
export interface MongoDbQueue<T = unknown> {
  /**
   * Creates the required indexes for optimal queue performance.
   * Call this once when setting up your queue.
   */
  createIndexes(): Promise<void>;

  /**
   * Adds a message to the queue.
   *
   * @param payload - The message payload
   * @param options - Optional settings for delay and deduplication
   * @returns The ID of the added message
   */
  add(payload: T, options?: AddOptions<T>): Promise<string>;

  /**
   * Retrieves the next available message from the queue.
   * The message becomes invisible to other consumers for the visibility
   * timeout.
   *
   * @param options - Optional visibility timeout override
   * @returns The message, or undefined if the queue is empty
   */
  get(options?: { visibility?: number }): Promise<Message<T> | undefined>;

  /**
   * Extends the visibility timeout for a message being processed.
   * Use this for long-running tasks to prevent the message from being
   * redelivered.
   *
   * @param ack - The acknowledgement token from the message
   * @param options - Optional visibility timeout override
   * @returns The message ID
   */
  ping(ack: string, options?: { visibility?: number }): Promise<string>;

  /**
   * Acknowledges successful processing of a message, removing it from the
   * queue.
   *
   * @param ack - The acknowledgement token from the message
   * @returns The message ID
   */
  ack(ack: string): Promise<string>;

  /** Returns the total number of messages ever added to the queue. */
  total(): Promise<number>;

  /** Returns the number of messages waiting to be processed. */
  size(): Promise<number>;

  /** Returns the number of messages currently being processed. */
  inFlight(): Promise<number>;

  /** Returns the number of successfully processed messages. */
  done(): Promise<number>;
}

class MongoDbQueueImpl implements MongoDbQueue {
  private _db: Db;
  private _name: string;
  private _visibility: number;

  private get collection() {
    return this._db.collection<MessageSchema>(this._name);
  }

  constructor(db: Db, name: string, options: { visibility?: number } = {}) {
    if (!db) {
      throw new Error('Please provide a mongodb.MongoClient.db');
    }
    if (!name) {
      throw new Error('Please provide a queue name');
    }

    this._db = db;
    this._name = name;
    this._visibility = options.visibility || 30;
  }

  async createIndexes() {
    await this.collection.createIndex({ deleted: 1, visible: 1 });
    await this.collection.createIndex(
      { ack: 1 },
      { unique: true, sparse: true },
    );
  }

  async add<T>(
    payload: NonNullable<T>,
    options?: AddOptions<T>,
  ): Promise<string> {
    const hashKey = options?.hashKey;
    const delay = options?.delay ?? 0;
    const now = Date.now();

    const insertFields = {
      createdAt: new Date(now),
      visible: new Date(now + delay * 1000),
      payload,
      tries: 0,
    };

    if (hashKey === undefined) {
      const result = await this.collection.insertOne({
        ...insertFields,
        occurrences: 1,
      });

      return result.insertedId.toHexString();
    }

    let filter: Filter<MessageSchema> = {
      payload: { $eq: hashKey },
    };

    if (typeof payload === 'object') {
      filter = {
        [`payload.${String(hashKey)}`]: payload[hashKey as keyof T],
      };
    }

    const message = await this.collection.findOneAndUpdate(
      filter,
      {
        $inc: { occurrences: 1 },
        $set: {
          updatedAt: new Date(),
        },
        $setOnInsert: insertFields,
      },
      { upsert: true, returnDocument: 'after', includeResultMetadata: true },
    );

    if (!message.value) {
      throw new Error(`Queue.add(): Failed add message`);
    }

    return message.value._id.toHexString();
  }

  async get<T>(
    options: { visibility?: number } = {},
  ): Promise<Message<T> | undefined> {
    const visibility = options.visibility || this._visibility;

    const now = Date.now();

    const query = {
      deleted: null,
      visible: { $lte: new Date(now) },
    };
    const update: UpdateFilter<MessageSchema> = {
      $inc: { tries: 1 },
      $set: {
        updatedAt: new Date(now),
        ack: id(),
        visible: new Date(now + visibility * 1000),
      },
    };

    const result = await this.collection.findOneAndUpdate(query, update, {
      sort: { _id: 1 },
      returnDocument: 'after',
      includeResultMetadata: true,
    });

    const message = result.value;

    // nothing in the queue
    if (!message) return;

    if (!message.ack || !message.updatedAt) {
      throw new Error(`Queue.get(): Failed to update message`);
    }

    // convert to an external representation
    return {
      id: message._id.toHexString(),
      ack: message.ack,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      payload: message.payload as T,
      tries: message.tries,
      occurrences: message.occurrences ?? 1,
    };
  }

  async ping(
    ack: string,
    options: { visibility?: number } = {},
  ): Promise<string> {
    const now = Date.now();

    const visibility = options.visibility || this._visibility;
    const query = {
      ack: ack,
      visible: { $gt: new Date(now) },
      deleted: null,
    };
    const update = {
      $set: {
        visible: new Date(now + visibility * 1000),
      },
    };

    const message = await this.collection.findOneAndUpdate(query, update, {
      returnDocument: 'after',
      includeResultMetadata: true,
    });

    if (!message.value) {
      throw new Error(`Queue.ping(): Unidentified ack : ${ack}`);
    }

    return message.value._id.toHexString();
  }

  async ack(ack: string): Promise<string> {
    const now = Date.now();
    const query = {
      ack: ack,
      visible: { $gt: new Date(now) },
      deleted: null,
    };
    const update = {
      $set: {
        deleted: new Date(now),
      },
    };

    const message = await this.collection.findOneAndUpdate(query, update, {
      returnDocument: 'after',
      includeResultMetadata: true,
    });

    if (!message.value) {
      throw new Error(`Queue.ack(): Unidentified ack : ${ack}`);
    }

    return message.value._id.toHexString();
  }

  async total() {
    return await this.collection.countDocuments();
  }

  async size() {
    const query = {
      deleted: null,
      visible: { $lte: new Date() },
    };

    return await this.collection.countDocuments(query);
  }

  async inFlight() {
    const query = {
      ack: { $exists: true },
      visible: { $gt: new Date() },
      deleted: null,
    };

    return await this.collection.countDocuments(query);
  }

  async done() {
    const query = {
      deleted: { $exists: true },
    };

    return await this.collection.countDocuments(query);
  }
}

/**
 * Creates a new MongoDB-backed message queue.
 *
 * @typeParam T - The type of message payloads in this queue
 * @param db - A MongoDB database instance
 * @param name - The name of the queue (used as the collection name)
 * @param options - Optional queue configuration
 * @param options.visibility - Default visibility timeout in seconds
 *   (default: 30)
 * @returns A new queue instance
 *
 * @example
 * ```ts
 * const queue = mongoDbQueue<MyPayload>(db, 'my-queue', { visibility: 60 });
 * ```
 */
export default function mongoDbQueue<T = unknown>(
  db: Db,
  name: string,
  options: { visibility?: number } = {},
): MongoDbQueue<T> {
  return new MongoDbQueueImpl(db, name, options);
}
