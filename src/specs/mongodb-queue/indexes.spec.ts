import mongoDbQueue from '../../mongodb-queue';
import setupMongo from '../__helpers__/setup-mongo';

describe('indexes', () => {
  const queueName = 'testing-indexes-queue';
  const setupDb = setupMongo();

  beforeAll(async () => {
    await setupDb.connect();
  });

  afterEach(async () => {
    await setupDb.db.dropCollection(queueName);
  });

  afterAll(async () => {
    await setupDb.client?.close();
  });

  it('creates indexes on collection', async () => {
    const queue = mongoDbQueue<string>(setupDb.db, queueName);
    // create an message to make sure collection exists in the system
    await queue.add('test message');

    expect(
      await setupDb.db.collection(queueName).indexInformation(),
    ).toMatchSnapshot();

    await queue.createIndexes();

    expect(
      await setupDb.db.collection(queueName).indexInformation(),
    ).toMatchSnapshot();
  });
});
