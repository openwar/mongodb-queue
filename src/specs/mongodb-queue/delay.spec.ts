import mongoDbQueue from '../../mongodb-queue';
import setupMongo from '../__helpers__/setup-mongo';
import sleep from '../__helpers__/sleep';

describe('delay', () => {
  const queueName = 'testing-delay-queue';
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

  it("allows messages to be added with a longer visibility time than queue's default", async () => {
    const queue = mongoDbQueue<string>(setupDb.db, queueName);

    await queue.add('test delayed message processing', { delay: 1 });

    let message = await queue.get();

    expect(message).not.toBeDefined();

    await sleep(500);

    message = await queue.get();

    expect(message).not.toBeDefined();

    await sleep(1000);

    message = await queue.get();

    expect(message).toBeDefined();

    // @ts-expect-error check is defined above
    await queue.ack(message.ack);
  }, 2000);
});
