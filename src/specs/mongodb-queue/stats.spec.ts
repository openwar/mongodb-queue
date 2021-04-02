import mongoDbQueue from '../../mongodb-queue';
import setupMongo from '../__helpers__/setup-mongo';

describe('stats', () => {
  const queueName = 'testing-stats-queue';
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

  it('shows correct stats based on current state', async () => {
    const queue = mongoDbQueue<string>(setupDb.db, queueName);

    const messageIdPromises = [...new Array(25)].map(() => {
      return queue.add('test message');
    });

    const messageIds = await Promise.all(messageIdPromises);

    expect(messageIds).toHaveLength(25);
    expect(await queue.size()).toBe(25);
    expect(await queue.total()).toBe(25);
    expect(await queue.inFlight()).toBe(0);
    expect(await queue.done()).toBe(0);

    const messages = await Promise.all(
      messageIds.map(async () => await queue.get()),
    );

    expect(messages).toHaveLength(25);
    expect(await queue.size()).toBe(0);
    expect(await queue.total()).toBe(25);
    expect(await queue.inFlight()).toBe(25);
    expect(await queue.done()).toBe(0);

    await Promise.all(
      // @ts-expect-error check is defined above
      messages.map(async (message) => await queue.ack(message.ack)),
    );

    expect(await queue.size()).toBe(0);
    expect(await queue.total()).toBe(25);
    expect(await queue.inFlight()).toBe(0);
    expect(await queue.done()).toBe(25);
  });
});
