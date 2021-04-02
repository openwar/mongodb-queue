import mongoDbQueue from '../../mongodb-queue';
import setupMongo from '../__helpers__/setup-mongo';
import sleep from '../__helpers__/sleep';

describe('ping', () => {
  const queueName = 'testing-ping-queue';
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

  it('allows messages to run longer than visibility time', async () => {
    const queue = mongoDbQueue<string>(setupDb.db, queueName, {
      visibility: 1,
    });

    await queue.add('test slow message processing');

    const message = await queue.get();

    expect(message).toBeDefined();

    await sleep(500);

    // @ts-expect-error check is defined above
    await queue.ping(message.ack);

    await sleep(500);

    // @ts-expect-error check is defined above
    await queue.ping(message.ack);

    await sleep(500);

    // @ts-expect-error check is defined above
    await queue.ack(message.ack);
  }, 2000);

  it('does not allow acknowledged messages to be pinged', async () => {
    const queue = mongoDbQueue<string>(setupDb.db, queueName, {
      visibility: 1,
    });

    await queue.add('test message');

    const message = await queue.get();

    expect(message).toBeDefined();

    // @ts-expect-error check is defined above
    await queue.ack(message.ack);

    // @ts-expect-error check is defined above
    expect(queue.ping(message.ack)).rejects.toThrow(
      /Queue.ping\(\): Unidentified ack : (.+)/,
    );
  }, 2000);

  it('allows messages to extend visibility time during ping', async () => {
    const queue = mongoDbQueue<string>(setupDb.db, queueName, {
      visibility: 1,
    });

    await queue.add('test slow message processing');

    const message = await queue.get();

    expect(message).toBeDefined();

    await sleep(250);

    // @ts-expect-error check is defined above
    await queue.ping(message.ack, { visibility: 5 });

    await sleep(1500);

    // @ts-expect-error check is defined above
    await queue.ack(message.ack);
  }, 2000);

  it('does not allow messages to be pinged after visibility time', async () => {
    const queue = mongoDbQueue<string>(setupDb.db, queueName, {
      visibility: 0.5,
    });

    await queue.add('test message');

    const message = await queue.get();

    expect(message).toBeDefined();

    await sleep(1000);

    // @ts-expect-error check is defined above
    expect(queue.ack(message.ack)).rejects.toThrow(
      /Queue.ack\(\): Unidentified ack : (.+)/,
    );
  }, 10000);
});
