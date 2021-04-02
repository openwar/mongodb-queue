import mongoDbQueue from '../../mongodb-queue';
import setupMongo from '../__helpers__/setup-mongo';

describe('parallel', () => {
  const queueName = 'testing-parallel-queue';
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

  it('handles multiple parallel processes', async () => {
    const queue = mongoDbQueue<string>(setupDb.db, queueName);

    const messageIdPromises = [...new Array(25)].map(() => {
      return queue.add('test message');
    });

    const messageIds = await Promise.all(messageIdPromises);

    expect(messageIds).toHaveLength(25);

    const messages = await Promise.all(
      messageIds.map(async () => await queue.get()),
    );

    expect(messages).toHaveLength(25);

    await Promise.all(
      // @ts-expect-error check is defined above
      messages.map(async (message) => await queue.ack(message.ack)),
    );
  });
});
