import mongoDbQueue from '../../mongodb-queue';
import setupMongo from '../__helpers__/setup-mongo';

describe('duplicates', () => {
  const queueName = 'testing-duplicates-queue';
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

  it.each`
    value                                | hashKey
    ${{ something: 'complex' }}          | ${'something'}
    ${{ id: 'id1', value: 'something' }} | ${'id1'}
    ${{ id: 'id2', value: 'something' }} | ${'value'}
  `(
    'allows objects with `$value` : `$hashKey`',
    async ({
      value,
      hashKey,
    }: {
      value: Record<string, string>;
      hashKey: string;
    }) => {
      const queue = mongoDbQueue(setupDb.db, queueName);

      const payload = value;

      const messageId1 = await queue.add(payload, { hashKey });
      const messageId2 = await queue.add(payload, { hashKey });

      expect(messageId1).toBeDefined();
      expect(messageId2).toBeDefined();
      expect(messageId2).toBe(messageId1);
      expect((await queue.get())?.occurrences).toBe(2);
      expect(await queue.size()).toBe(0);
    },
  );

  it.each`
    value
    ${'test message'}
    ${''}
  `('allows string with `$value`', async ({ value }: { value: string }) => {
    const queue = mongoDbQueue<string>(setupDb.db, queueName);

    const payload = value;

    const messageId1 = await queue.add(payload, { hashKey: payload });
    const messageId2 = await queue.add(payload, { hashKey: payload });

    expect(messageId1).toBeDefined();
    expect(messageId2).toBeDefined();
    expect(messageId2).toBe(messageId1);
    expect((await queue.get())?.occurrences).toBe(2);
    expect(await queue.size()).toBe(0);
  });

  it.each`
    value
    ${0}
    ${10}
    ${-20}
  `('allows number with `$value`', async ({ value }: { value: number }) => {
    const queue = mongoDbQueue<number>(setupDb.db, queueName);

    const payload = value;

    const messageId1 = await queue.add(payload, { hashKey: payload });
    const messageId2 = await queue.add(payload, { hashKey: payload });

    expect(messageId1).toBeDefined();
    expect(messageId2).toBeDefined();
    expect(messageId2).toBe(messageId1);
    expect((await queue.get())?.occurrences).toBe(2);
    expect(await queue.size()).toBe(0);
  });

  it.each`
    value
    ${true}
    ${false}
  `('allows boolean with `$value`', async ({ value }: { value: boolean }) => {
    const queue = mongoDbQueue<boolean>(setupDb.db, queueName);

    const payload = value;

    const messageId1 = await queue.add(payload, { hashKey: payload });
    const messageId2 = await queue.add(payload, { hashKey: payload });

    expect(messageId1).toBeDefined();
    expect(messageId2).toBeDefined();
    expect(messageId2).toBe(messageId1);
    expect((await queue.get())?.occurrences).toBe(2);
    expect(await queue.size()).toBe(0);
  });

  describe('with legacy signature', () => {
    it.each`
      value                                | hashKey
      ${{ something: 'complex' }}          | ${'something'}
      ${{ id: 'id1', value: 'something' }} | ${'id1'}
      ${{ id: 'id2', value: 'something' }} | ${'value'}
    `(
      'allows objects with `$value` : `$hashKey`',
      async ({
        value,
        hashKey,
      }: {
        value: Record<string, string>;
        hashKey: string;
      }) => {
        const queue = mongoDbQueue(setupDb.db, queueName);

        const payload = value;

        const messageId1 = await queue.add(payload, hashKey);
        const messageId2 = await queue.add(payload, hashKey);

        expect(messageId1).toBeDefined();
        expect(messageId2).toBeDefined();
        expect(messageId2).toBe(messageId1);
        expect((await queue.get())?.occurrences).toBe(2);
        expect(await queue.size()).toBe(0);
      },
    );

    it.each`
      value
      ${'test message'}
      ${''}
    `('allows string with `$value`', async ({ value }: { value: string }) => {
      const queue = mongoDbQueue<string>(setupDb.db, queueName);

      const payload = value;

      const messageId1 = await queue.add(payload, payload);
      const messageId2 = await queue.add(payload, payload);

      expect(messageId1).toBeDefined();
      expect(messageId2).toBeDefined();
      expect(messageId2).toBe(messageId1);
      expect((await queue.get())?.occurrences).toBe(2);
      expect(await queue.size()).toBe(0);
    });

    it.each`
      value
      ${0}
      ${10}
      ${-20}
    `('allows number with `$value`', async ({ value }: { value: number }) => {
      const queue = mongoDbQueue<number>(setupDb.db, queueName);

      const payload = value;

      const messageId1 = await queue.add(payload, payload);
      const messageId2 = await queue.add(payload, payload);

      expect(messageId1).toBeDefined();
      expect(messageId2).toBeDefined();
      expect(messageId2).toBe(messageId1);
      expect((await queue.get())?.occurrences).toBe(2);
      expect(await queue.size()).toBe(0);
    });

    it.each`
      value
      ${true}
      ${false}
    `('allows boolean with `$value`', async ({ value }: { value: boolean }) => {
      const queue = mongoDbQueue<boolean>(setupDb.db, queueName);

      const payload = value;

      const messageId1 = await queue.add(payload, payload);
      const messageId2 = await queue.add(payload, payload);

      expect(messageId1).toBeDefined();
      expect(messageId2).toBeDefined();
      expect(messageId2).toBe(messageId1);
      expect((await queue.get())?.occurrences).toBe(2);
      expect(await queue.size()).toBe(0);
    });
  });
});
