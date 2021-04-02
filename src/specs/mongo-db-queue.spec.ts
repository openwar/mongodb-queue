import mongoDbQueue from '../mongodb-queue';
import setupMongo from './__helpers__/setup-mongo';

describe('mongodb-queue', () => {
  const queueName = 'testing-default-queue';
  const setupDb = setupMongo();

  beforeAll(async () => {
    await setupDb.connect();
  });

  afterEach(async () => {
    await setupDb.db.collection(queueName).deleteMany({});
  });

  afterAll(async () => {
    await setupDb.client?.close();
  });

  it('returns `undefined` when getting a message from empty queue', async () => {
    const queue = mongoDbQueue(setupDb.db, queueName);

    expect(await queue.get()).toBeUndefined();
  });

  it('handles single round trip message', async () => {
    const queue = mongoDbQueue<string>(setupDb.db, queueName);

    const messageId = await queue.add('test message');

    expect(messageId).toBeDefined();

    const message = await queue.get();

    expect(message).toBeDefined();
    expect(message?.id).toBeDefined();
    expect(typeof message?.id).toBe('string');
    expect(message?.id).toBe(messageId);
    expect(message?.ack).toBeDefined();
    expect(typeof message?.ack).toBe('string');
    expect(message?.createdAt).toBeDefined();
    expect(message?.createdAt).toBeInstanceOf(Date);
    expect(message?.updatedAt).toBeDefined();
    expect(message?.updatedAt).toBeInstanceOf(Date);
    expect(message?.tries).toBeDefined();
    expect(typeof message?.tries).toBe('number');
    expect(message?.tries).toBe(1);
    expect(message?.occurrences).toBe(1);
    expect(message?.payload).toBe('test message');

    // @ts-expect-error check is defined above
    const id = await queue.ack(message.ack);
    expect(id).toBeDefined();
  });

  it('does not allow an message to be acknowledged twice', async () => {
    const queue = mongoDbQueue<string>(setupDb.db, queueName);

    await queue.add('test message');
    const message = await queue.get();

    expect(message).toBeDefined();

    // @ts-expect-error check is defined above
    await queue.ack(message.ack);

    // @ts-expect-error check is defined above
    await expect(queue.ack(message.ack)).rejects.toThrow(
      /^Queue.ack\(\): Unidentified ack : (.+)$/,
    );
  });

  it('throws when not passing a db', () => {
    // @ts-expect-error testing without required db param
    expect(() => mongoDbQueue()).toThrow(
      /^Please provide a mongodb.MongoClient.db$/,
    );
  });

  it('throws when not passing a valid queue name', () => {
    // @ts-expect-error testing without required queue name param
    expect(() => mongoDbQueue(setupDb.db)).toThrow(
      /^Please provide a queue name$/,
    );
    expect(() => mongoDbQueue(setupDb.db, '')).toThrow(
      /^Please provide a queue name$/,
    );
  });
});
