// TESTS/setup/test-setup.ts
import '@testing-library/jest-dom';

// Mock window.fetch if needed
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};