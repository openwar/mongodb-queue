import { Db, MongoClient } from 'mongodb';

class SetupMongo {
  private _client: MongoClient;
  private _dbName: string;

  get client(): MongoClient {
    return this._client;
  }

  get db(): Db {
    return this.client.db(this._dbName);
  }

  constructor(url: string, dbName: string) {
    this._client = new MongoClient(url);
    this._dbName = dbName;
  }

  async connect(): Promise<void> {
    await this._client.connect();
  }
}

export default function setupMongo(): SetupMongo {
  const url = process.env.MONGO_URL || 'mongodb://localhost:27017/';
  const dbName = process.env.MONGO_DB_NAME;

  if (!dbName) {
    throw new Error(
      'Please provide a `MONGO_DB_NAME` environment variable for testing',
    );
  }

  return new SetupMongo(url, dbName);
}
