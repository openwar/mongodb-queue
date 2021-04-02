import mongoDbQueue from '../../mongodb-queue';
import setupMongo from '../__helpers__/setup-mongo';

describe('payloads', () => {
  const queueName = 'testing-payloads-queue';
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
    value
    ${'test message'}
    ${''}
  `('allows string with `$value`', async ({ value }: { value: string }) => {
    const queue = mongoDbQueue<string>(setupDb.db, queueName);

    await queue.add(value);

    const message = await queue.get();

    expect(message?.payload).toEqual(value);
  });

  it.each`
    value
    ${0}
    ${10}
    ${-20}
  `('allows numbers with `$value`', async ({ value }: { value: number }) => {
    const queue = mongoDbQueue<number>(setupDb.db, queueName);

    await queue.add(value);

    const message = await queue.get();

    expect(message?.payload).toEqual(value);
  });

  it.each`
    value
    ${true}
    ${false}
  `('allows boolean with `$value`', async ({ value }: { value: boolean }) => {
    const queue = mongoDbQueue<boolean>(setupDb.db, queueName);

    await queue.add(value);

    expect((await queue.get())?.payload).toEqual(value);
  });

  it('allows objects', async () => {
    type Complex = { something: string };

    const queue = mongoDbQueue<Complex>(setupDb.db, queueName);

    const payload = { something: 'complex' };
    await queue.add(payload);

    const message = await queue.get();

    expect(message?.payload).toEqual({ something: 'complex' });
    expect(message?.payload).not.toBe(payload);
  });

  it.each`
    value
    ${[]}
    ${[-2, 0, 3]}
  `('allows arrays with `$value`', async ({ value }: { value: number[] }) => {
    const queue = mongoDbQueue<number[]>(setupDb.db, queueName);

    const payload = [...value];
    await queue.add(payload);

    const message = await queue.get();

    expect(message?.payload).toEqual(value);
    expect(message?.payload).not.toBe(payload);
  });

  it('allows complex arrays', async () => {
    type Complex = string | { test: string };

    const queue = mongoDbQueue<Complex[]>(setupDb.db, queueName);

    const payload = ['test message', { test: 'message' }];
    await queue.add(payload);

    const message = await queue.get();

    expect(message?.payload).toEqual(['test message', { test: 'message' }]);
    expect(message?.payload).not.toBe(payload);
  });
});
