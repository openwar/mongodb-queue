/*
 * Copyright (c) 2020-2022 Filipe Guerra
 * https://github.com/openwar/mongodb-queue
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import crypto from 'crypto';
import type { Db, FilterQuery, ObjectId, UpdateQuery } from 'mongodb';

// some helper functions
function id() {
  return crypto.randomBytes(16).toString('hex');
}

type MessageSchema = {
  _id: ObjectId;
  createdAt: Date;
  updatedAt?: Date;
  visible: Date;
  payload: unknown;
  ack?: string;
  tries: number;
  occurrences?: number;
};

export type Message<T = unknown> = {
  id: string;
  ack: string;
  createdAt: Date;
  updatedAt: Date;
  payload: T;
  tries: number;
  occurrences?: number;
};

export interface MongoDbQueue<T = unknown> {
  createIndexes(): Promise<void>;

  add(payload: T, hashKey?: keyof T | T): Promise<string>;

  get(options?: { visibility?: number }): Promise<Message<T> | undefined>;

  ping(ack: string, options?: { visibility?: number }): Promise<string>;

  ack(ack: string): Promise<string>;

  total(): Promise<number>;

  size(): Promise<number>;

  inFlight(): Promise<number>;

  done(): Promise<number>;
}

class MongoDbQueueImpl<T = unknown> implements MongoDbQueue {
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

  async add(payload: T, hashKey?: keyof T | T): Promise<string> {
    const now = new Date();

    const insertFields = {
      createdAt: now,
      visible: now,
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

    let filter: FilterQuery<MessageSchema> = {
      payload: { $eq: hashKey },
    };

    if (typeof payload === 'object') {
      filter = {
        [`payload.${hashKey}`]: payload[hashKey as keyof T],
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
      { upsert: true, returnDocument: 'after' },
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
    const sort = {
      _id: 1,
    };
    const update: UpdateQuery<MessageSchema> = {
      $inc: { tries: 1 },
      $set: {
        updatedAt: new Date(now),
        ack: id(),
        visible: new Date(now + visibility * 1000),
      },
    };

    const result = await this.collection.findOneAndUpdate(query, update, {
      sort: sort,
      returnDocument: 'after',
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

export default function mongoDbQueue<T = unknown>(
  db: Db,
  name: string,
  options: { visibility?: number } = {},
): MongoDbQueue<T> {
  return new MongoDbQueueImpl<T>(db, name, options);
}
