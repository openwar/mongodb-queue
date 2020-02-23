import mongoDbQueue from '../mongodb-queue';
import setupMongo from '../tests/setupMongo';

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

  it('should return `undefined` when getting a message from empty queue', async () => {
    const queue = mongoDbQueue(setupDb.db, queueName);

    expect(await queue.get()).toBeUndefined();
  });

  it('should handle single round trip message', async () => {
    const queue = mongoDbQueue(setupDb.db, queueName);

    const messageId = await queue.add('test message');

    expect(messageId).toBeDefined();

    const message = await queue.get();

    expect(message.id).toBeDefined();
    expect(typeof message.id).toBe('string');
    expect(message.ack).toBeDefined();
    expect(typeof message.ack).toBe('string');
    expect(message.createdAt).toBeDefined();
    expect(message.createdAt instanceof Date).toBeTruthy();
    expect(message.updatedAt).toBeDefined();
    expect(message.updatedAt instanceof Date).toBeTruthy();
    expect(message.tries).toBeDefined();
    expect(typeof message.tries).toBe('number');
    expect(message.tries).toBe(1);
    expect(message.payload).toBe('test message');

    const id = await queue.ack(message.ack);
    expect(id).toBeDefined();
  });

  it('should not allow an message to be acknowledged twice', async () => {
    const queue = mongoDbQueue(setupDb.db, queueName);

    await queue.add('test message');
    const message = await queue.get();
    await queue.ack(message.ack);

    await expect(queue.ack(message.ack)).rejects.toThrow(
      /^Queue.ack\(\): Unidentified ack : (.+)$/,
    );
  });

  it('should retry messages', async () => {
    const queue = mongoDbQueue(setupDb.db, queueName);

    await queue.add('test message for retry');

    const messageToIgnore = await queue.get({ visibility: 1 });

    await new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });

    const message = await queue.get();

    expect(messageToIgnore.tries).toBe(1);
    expect(message.tries).toBe(2);

    expect(message.id).toBe(messageToIgnore.id);
    expect(message.payload).toBe('test message for retry');
    expect(message.payload).toBe(messageToIgnore.payload);

    const id = await queue.ack(message.ack);

    expect(id).toBeDefined();
  });

  it('should throw when not passing a valid queue name', () => {
    expect(() => mongoDbQueue(setupDb.db, '')).toThrow(
      /^Please provide a queue name$/,
    );
  });

  describe('payloads', () => {
    it('should allow string', async () => {
      const queue = mongoDbQueue(setupDb.db, queueName);

      await queue.add('test message');

      const message = await queue.get();

      expect(message.payload).toEqual('test message');
    });

    it('should allow number', async () => {
      const queue = mongoDbQueue(setupDb.db, queueName);

      await queue.add(12);

      const message = await queue.get();

      expect(message.payload).toEqual(12);
    });

    it('should allow boolean', async () => {
      const queue = mongoDbQueue(setupDb.db, queueName);

      await queue.add(false);

      expect((await queue.get()).payload).toEqual(false);

      await queue.add(true);

      expect((await queue.get()).payload).toEqual(true);
    });

    it('should allow object', async () => {
      const queue = mongoDbQueue(setupDb.db, queueName);

      const payload = { something: 'complex' };
      await queue.add(payload);

      const message = await queue.get();

      expect(message.payload).toEqual({ something: 'complex' });
      expect(message.payload).not.toBe(payload);
    });

    it('should allow array', async () => {
      const queue = mongoDbQueue(setupDb.db, queueName);

      const payload = ['test message', { test: 'message' }];
      await queue.add(payload);

      const message = await queue.get();

      expect(message.payload).toEqual(['test message', { test: 'message' }]);
      expect(message.payload).not.toBe(payload);
    });
  });

  describe('createIndexes', () => {
    beforeEach(async () => {
      await setupDb.db.dropCollection(queueName);
    });

    it('should create indexes on collection', async () => {
      const queue = mongoDbQueue(setupDb.db, queueName);
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

  describe('parallel messages processing', () => {
    const total = 25;

    it('should handle multiple parallel processes', async () => {
      const queue = mongoDbQueue(setupDb.db, queueName);

      const messageIdPromises = [];

      for (let i = 0; i < total; i++) {
        messageIdPromises.push(queue.add('test message'));
      }

      const messageIds = await Promise.all(messageIdPromises);

      expect(messageIds).toHaveLength(total);

      const messages = await Promise.all(
        messageIds.map(async () => await queue.get()),
      );

      expect(messages).toHaveLength(total);

      await Promise.all(
        messages.map(async (message) => await queue.ack(message.ack)),
      );
    });

    it('should show correct stats based on current state', async () => {
      const queue = mongoDbQueue(setupDb.db, queueName);

      const messageIdPromises = [];

      for (let i = 0; i < total; i++) {
        messageIdPromises.push(queue.add('test message'));
      }

      const messageIds = await Promise.all(messageIdPromises);

      expect(messageIds).toHaveLength(total);
      expect(await queue.size()).toBe(25);
      expect(await queue.total()).toBe(25);
      expect(await queue.inFlight()).toBe(0);
      expect(await queue.done()).toBe(0);

      const messages = await Promise.all(
        messageIds.map(async () => await queue.get()),
      );

      expect(messages).toHaveLength(total);
      expect(await queue.size()).toBe(0);
      expect(await queue.total()).toBe(25);
      expect(await queue.inFlight()).toBe(25);
      expect(await queue.done()).toBe(0);

      await Promise.all(
        messages.map(async (message) => await queue.ack(message.ack)),
      );

      expect(await queue.size()).toBe(0);
      expect(await queue.total()).toBe(25);
      expect(await queue.inFlight()).toBe(0);
      expect(await queue.done()).toBe(25);
    });
  });
});
