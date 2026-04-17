import '@testing-library/jest-dom';

// Polyfill Web APIs for Next.js stream utils in jsdom environment
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder as typeof global.TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js headers — default to empty cookie store so server actions that call
// cookies() (e.g. assertNotImpersonating) don't throw "called outside request scope".
// Individual test files can override via jest.mock('next/headers', ...) at the top.
jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: jest.fn(() => undefined),
    getAll: jest.fn(() => []),
    has: jest.fn(() => false),
    set: jest.fn(),
    delete: jest.fn(),
  })),
  headers: jest.fn(async () => ({
    get: jest.fn(() => null),
    has: jest.fn(() => false),
    entries: jest.fn(() => [][Symbol.iterator]()),
  })),
}));

// Mock Next.js image - use function syntax to avoid JSX parsing issues
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: function MockImage(props: any) {
    const { src, alt, ...rest } = props;
    return Object.assign(document.createElement('img'), { src, alt, ...rest });
  },
}));

// Suppress console errors in tests (optional - remove if you want to see them)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
