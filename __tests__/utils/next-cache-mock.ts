// Mock for next/cache to prevent Web API globals (Request, ReadableStream, etc.)
// from being required in jsdom test environment
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const unstable_cache = jest.fn(<T>(fn: (...args: any[]) => Promise<T>) => fn);

export const revalidatePath = jest.fn();
export const revalidateTag = jest.fn();
export const unstable_noStore = jest.fn();
