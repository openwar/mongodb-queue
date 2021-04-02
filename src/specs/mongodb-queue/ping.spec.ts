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
      visibility: 3,
    });

    await queue.add('test slow message processing');

    const message = await queue.get();

    expect(message).toBeDefined();

    await sleep(2000);

    // @ts-expect-error check is defined above
    await queue.ping(message.ack);

    await sleep(2000);

    // @ts-expect-error check is defined above
    await queue.ack(message.ack);
  }, 10000);

  it('does not allow acknowledged messages to be pinged', async () => {
    const queue = mongoDbQueue<string>(setupDb.db, queueName, {
      visibility: 5,
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
  }, 10000);

  it('allows messages to extend visibility time during ping', async () => {
    const queue = mongoDbQueue<string>(setupDb.db, queueName, {
      visibility: 2,
    });

    await queue.add('test slow message processing');

    const message = await queue.get();

    expect(message).toBeDefined();

    await sleep(1000);

    // @ts-expect-error check is defined above
    await queue.ping(message.ack, { visibility: 5 });

    await sleep(3000);

    // @ts-expect-error check is defined above
    await queue.ack(message.ack);
  }, 10000);
});
