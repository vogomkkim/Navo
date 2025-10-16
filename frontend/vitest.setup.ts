import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock EventSource for jsdom environment
const mockEventSource = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  readyState: 1, // EventSource.OPEN
  onopen: vi.fn(),
  onmessage: vi.fn(),
  onerror: vi.fn(),
};

global.EventSource = vi.fn(() => mockEventSource) as any;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
