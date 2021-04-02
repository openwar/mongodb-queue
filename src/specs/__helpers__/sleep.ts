// can't use util.promisify - JSDOM is has custom setTimeout implementation
export default function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
