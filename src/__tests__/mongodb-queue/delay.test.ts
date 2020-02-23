import MongoDbQueue from '../../mongodb-queue';
import setupMongo from '../../tests/setupMongo';

/**
 * The delay tests are separate to run it in parallel. These tests require some
 * time to pass and thus should be executed separately.
 */
describe('mongodb-queue', () => {
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

  describe('delay', () => {
    it('should respect queue delay when getting messages', async () => {
      const queue = new MongoDbQueue(setupDb.db, queueName, { delay: 2 });

      await queue.add('test delayed message');

      // no messages yet
      expect(await queue.get()).toBeUndefined();

      await new Promise((resolve) => {
        setTimeout(resolve, 2500);
      });

      const message = await queue.get();

      expect(message).toBeDefined();
    });

    it('should respect the delay override when adding messages to the queue', async () => {
      const queue = new MongoDbQueue(setupDb.db, queueName);

      await queue.add('I am delayed by 2 seconds', { delay: 2 });

      // no messages yet
      expect(await queue.get()).toBeUndefined();

      await new Promise((resolve) => {
        setTimeout(resolve, 2500);
      });

      const message = await queue.get();

      expect(message).toBeDefined();
    });

    it('should get messages out of order based on custom delays', async () => {
      const queue = new MongoDbQueue(setupDb.db, queueName);

      await queue.add('I am delayed by 2 seconds', { delay: 2 });
      await queue.add('test message');

      expect((await queue.get()).payload).toBe('test message');

      expect(await queue.get()).toBeUndefined();

      await new Promise((resolve) => {
        setTimeout(resolve, 2500);
      });

      const message = await queue.get();

      expect(message.payload).toBe('I am delayed by 2 seconds');
    });
  });
});
