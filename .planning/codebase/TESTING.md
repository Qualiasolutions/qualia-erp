# Testing Patterns

**Analysis Date:** 2026-03-01

## Test Framework

**Runner:**

- Jest 30.x (Next.js integration via `next/jest`)
- Config: `jest.config.ts`

**Assertion Library:**

- Jest built-in matchers
- `@testing-library/jest-dom` for DOM assertions

**Run Commands:**

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report (50% threshold)
npm test -- path/to/test # Run single test file
```

**TypeScript Support:**

- Jest configured with Next.js preset handles TypeScript automatically
- No additional ts-jest configuration needed

## Test File Organization

**Location:**

- Co-located with source in `__tests__/` directory at project root
- Pattern: `__tests__/{category}/{file}.test.{ts,tsx}`

**Naming:**

- Test files: `*.test.ts` or `*.test.tsx`
- Utility files: `__tests__/utils/render.tsx` (test helpers)

**Structure:**

```
__tests__/
├── lib/
│   ├── validation.test.ts
│   └── voice-assistant-intelligence.test.ts
├── components/
│   ├── button.test.tsx
│   └── dashboard-meetings.test.tsx
└── utils/
    └── render.tsx              # Custom render + test factories
```

**Coverage Paths:**

- `lib/**/*.{ts,tsx}`
- `components/**/*.{ts,tsx}`
- `app/**/*.{ts,tsx}`
- Excludes: `**/*.d.ts`, `**/node_modules/**`

**Ignored Paths:**

- `<rootDir>/node_modules/`
- `<rootDir>/.next/`
- `<rootDir>/__tests__/utils/` (test utilities not counted)

## Test Structure

**Suite Organization:**

```typescript
describe('Validation Schemas', () => {
  describe('createIssueSchema', () => {
    it('validates a valid issue', () => {
      const validIssue = {
        title: 'Test Issue',
        description: 'This is a test issue',
        status: 'Todo',
        priority: 'Medium',
      };

      const result = createIssueSchema.safeParse(validIssue);
      expect(result.success).toBe(true);
    });

    it('requires a title', () => {
      const invalidIssue = { description: 'No title provided' };

      const result = createIssueSchema.safeParse(invalidIssue);
      expect(result.success).toBe(false);
      if (!result.success) {
        const titleError = result.error.issues?.find((e) => e.path.includes('title'));
        expect(titleError).toBeDefined();
      }
    });
  });
});
```

**Patterns:**

- Nested `describe()` blocks for logical grouping
- One assertion per test (prefer focused tests)
- Use descriptive test names: `it('requires a title')` not `it('test 1')`
- Group related tests under parent `describe()`

**Test Lifecycle:**

- Setup: Jest's `beforeAll()`, `beforeEach()` (minimal usage in current tests)
- Teardown: `afterAll()`, `afterEach()` (used in jest.setup.ts for console mocking)

## Mocking

**Framework:** Jest built-in mocking

**Patterns:**

**Next.js Router Mock:**

```typescript
// jest.setup.ts
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
```

**Next.js Image Mock:**

```typescript
// jest.setup.ts
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage(props: any) {
    const { src, alt, ...rest } = props;
    return Object.assign(document.createElement('img'), { src, alt, ...rest });
  },
}));
```

**Component Testing:**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const handleClick = jest.fn();

render(<Button onClick={handleClick}>Click me</Button>);
await user.click(screen.getByRole('button'));

expect(handleClick).toHaveBeenCalledTimes(1);
```

**What to Mock:**

- Next.js router and navigation hooks
- Next.js Image component
- External API calls (Supabase, AI SDK)
- Browser APIs not available in jsdom (IntersectionObserver, ResizeObserver)

**What NOT to Mock:**

- Utility functions (test them directly)
- Internal components (integration test instead)
- Simple pure functions

## Fixtures and Factories

**Test Data:**
Located in `__tests__/utils/render.tsx`:

```typescript
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: null,
  role: 'employee' as const,
  ...overrides,
});

export const createMockProject = (overrides = {}) => ({
  id: 'test-project-id',
  name: 'Test Project',
  description: 'A test project',
  status: 'active' as const,
  project_group: 'active' as const,
  workspace_id: 'test-workspace-id',
  created_at: new Date().toISOString(),
  ...overrides,
});
```

**Available Factories:**

- `createMockUser()`
- `createMockProject()`
- `createMockIssue()`
- `createMockTeam()`
- `createMockClient()`
- `createMockMeeting()`
- `createMockPhase()`
- `createMockPhaseItem()`

**Usage:**

```typescript
const project = createMockProject({ name: 'Custom Name', status: 'Launched' });
```

**Location:**

- `__tests__/utils/render.tsx` – Test data factories + custom render

## Coverage

**Requirements:** 50% threshold across all metrics

**Thresholds (jest.config.ts):**

```typescript
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
},
```

**Current Coverage:** ~1.68% (from CLAUDE.md tech debt notes)

- **Status:** Below threshold, needs significant improvement
- **Priority:** P1 remediation item

**View Coverage:**

```bash
npm run test:coverage
```

**Output:**

- Terminal: Summary table
- HTML: `coverage/lcov-report/index.html`

## Test Types

**Unit Tests:**

- Scope: Individual functions, schemas, utilities
- Approach: Test in isolation with mocked dependencies
- Examples:
  - Zod schema validation (`__tests__/lib/validation.test.ts`)
  - Utility functions (date formatting, string manipulation)

**Component Tests:**

- Scope: React components rendered in isolation
- Approach: Testing Library queries + user-event interactions
- Examples:
  - Button variants and click handlers (`__tests__/components/button.test.tsx`)
  - Form inputs and validation
  - Conditional rendering based on props

**Integration Tests:**

- Scope: Multiple components or modules working together
- Approach: Not yet implemented extensively
- Planned: Server actions + database interactions (requires test DB)

**E2E Tests:**

- Framework: Not configured
- Status: Not used
- Future: Consider Playwright for critical user flows

## Common Patterns

**Async Testing:**

```typescript
import userEvent from '@testing-library/user-event';

it('handles click events', async () => {
  const user = userEvent.setup();
  const handleClick = jest.fn();

  render(<Button onClick={handleClick}>Click me</Button>);

  await user.click(screen.getByRole('button'));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

**Error Testing (Zod Validation):**

```typescript
it('validates status enum', () => {
  const invalidStatus = {
    title: 'Test Issue',
    status: 'InvalidStatus',
  };

  const result = createIssueSchema.safeParse(invalidStatus);
  expect(result.success).toBe(false);
});

it('requires a title', () => {
  const invalidIssue = { description: 'No title provided' };

  const result = createIssueSchema.safeParse(invalidIssue);
  expect(result.success).toBe(false);
  if (!result.success) {
    const titleError = result.error.issues?.find((e) => e.path.includes('title'));
    expect(titleError).toBeDefined();
  }
});
```

**Component Variant Testing:**

```typescript
it('renders with different variants', () => {
  const { rerender } = render(<Button variant="destructive">Delete</Button>);
  expect(screen.getByRole('button')).toHaveClass('bg-destructive');

  rerender(<Button variant="outline">Outline</Button>);
  expect(screen.getByRole('button')).toHaveClass('border');

  rerender(<Button variant="ghost">Ghost</Button>);
  expect(screen.getByRole('button')).toHaveClass('hover:bg-accent');
});
```

**Testing Disabled State:**

```typescript
it('is disabled when disabled prop is true', async () => {
  const user = userEvent.setup();
  const handleClick = jest.fn();

  render(
    <Button disabled onClick={handleClick}>
      Disabled
    </Button>
  );

  const button = screen.getByRole('button');
  expect(button).toBeDisabled();

  await user.click(button);
  expect(handleClick).not.toHaveBeenCalled();
});
```

**Testing Custom Render (with Providers):**

```typescript
// __tests__/utils/render.tsx
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      {children}
    </ThemeProvider>
  );
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { customRender as render };
```

**FormData Testing:**

```typescript
it('parses valid form data', () => {
  const formData = new FormData();
  formData.append('title', 'Test Issue');
  formData.append('status', 'Todo');

  const result = parseFormData(createIssueSchema, formData);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.title).toBe('Test Issue');
  }
});

it('converts empty strings to null', () => {
  const formData = new FormData();
  formData.append('title', 'Test Issue');
  formData.append('description', '');

  const result = parseFormData(createIssueSchema, formData);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.description).toBeNull();
  }
});
```

## Test Environment

**Environment:** jsdom (simulated browser)

- Configured in `jest.config.ts`: `testEnvironment: 'jsdom'`
- Provides: `document`, `window`, DOM APIs
- Missing: Some modern browser APIs (requires polyfills or mocks)

**Setup File:**

- `jest.setup.ts` runs before all tests
- Imports `@testing-library/jest-dom` for DOM matchers
- Mocks Next.js modules (router, image)
- Suppresses known React warnings

**Module Name Mapper:**

```typescript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
}
```

- Resolves `@/*` imports to project root

## Testing Library Queries

**Preferred Query Priority:**

1. `getByRole()` – Most accessible, preferred
2. `getByLabelText()` – For form fields
3. `getByText()` – For text content
4. `getByTestId()` – Last resort

**Examples:**

```typescript
// Preferred: By role
const button = screen.getByRole('button', { name: /click me/i });

// Form labels
const input = screen.getByLabelText(/email address/i);

// Text content
const heading = screen.getByText(/welcome/i);

// Link with accessible name
const link = screen.getByRole('link', { name: /link button/i });
```

**Assertions:**

- `.toBeInTheDocument()` – Element exists
- `.toHaveClass()` – CSS class present
- `.toBeDisabled()` – Element disabled
- `.toHaveAttribute()` – Attribute check
- `.toHaveBeenCalledTimes()` – Mock call count

## Current Test Coverage Gaps

**Untested Areas (from codebase analysis):**

- Server actions (`app/actions/*.ts`) – No tests for mutations
- SWR hooks (`lib/swr.ts`) – No tests for data fetching
- Dashboard components (`components/today-dashboard/`) – Minimal tests
- AI tools (`lib/ai/tools/`) – No tests
- Email sending (`lib/email.ts`) – No tests

**Priority for New Tests:**

1. Server actions (auth, authorization, business logic)
2. Validation schemas (expand coverage)
3. Critical components (TasksWidget, ProjectDetail)
4. Utility functions (date, string manipulation)

## Testing Conventions

**File Naming:**

- Test files match source file name: `validation.ts` → `validation.test.ts`
- Component tests: `button.tsx` → `button.test.tsx`

**Test Naming:**

- Use `describe()` for grouping by feature/function
- Use `it()` or `test()` for individual test cases (prefer `it()` for readability)
- Names should be descriptive: "validates status enum" not "test 2"

**Assertion Style:**

- One logical assertion per test (prefer focused tests)
- Use type guards for Zod validation results:
  ```typescript
  if (!result.success) {
    expect(result.error).toBeDefined();
  }
  ```

**Test Data:**

- Use factory functions from `__tests__/utils/render.tsx`
- Override defaults only when relevant to test:
  ```typescript
  const project = createMockProject({ status: 'Launched' });
  ```

---

_Testing analysis: 2026-03-01_
