import mongoDbQueue from '../../mongodb-queue';
import setupMongo from '../../tests/setupMongo';

/**
 * The ping tests are separate to run it in parallel. These tests require some
 * time to pass and thus should be executed separately.
 */
describe('mongodb-queue', () => {
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

  describe('ping', () => {
    it('should allow messages to run longer than visibility time', async () => {
      const queue = mongoDbQueue<string>(setupDb.db, queueName, {
        visibility: 3,
      });

      await queue.add('test slow message processing');

      const message = await queue.get();

      expect(message).toBeDefined();

      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });

      await queue.ping(message.ack);

      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });

      await queue.ack(message.ack);
    }, 10000);

    it('should not allow acknowledged messages to be pinged', async () => {
      const queue = mongoDbQueue<string>(setupDb.db, queueName, {
        visibility: 5,
      });

      await queue.add('test message');

      const message = await queue.get();

      expect(message).toBeDefined();

      await queue.ack(message.ack);

      expect(queue.ping(message.ack)).rejects.toThrow(
        /Queue.ping\(\): Unidentified ack : (.+)/,
      );
    }, 10000);

    it('should allow messages to extend visibility time during ping', async () => {
      const queue = mongoDbQueue<string>(setupDb.db, queueName, {
        visibility: 2,
      });

      await queue.add('test slow message processing');

      const message = await queue.get();

      expect(message).toBeDefined();

      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      await queue.ping(message.ack, { visibility: 5 });

      await new Promise((resolve) => {
        setTimeout(resolve, 3000);
      });

      await queue.ack(message.ack);
    }, 10000);
  });
});
