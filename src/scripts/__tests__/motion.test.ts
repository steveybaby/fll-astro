import { describe, it, expect, afterEach } from 'vitest';
import { motionEnabled } from '../motion';

const original = globalThis.window;

function stubWindow(reduce: boolean, withObserver = true) {
  (globalThis as any).window = {
    matchMedia: (q: string) => ({ matches: q.includes('reduce') ? reduce : false }),
  };
  (globalThis as any).IntersectionObserver = withObserver ? function () {} : undefined;
}

afterEach(() => {
  (globalThis as any).window = original;
  delete (globalThis as any).IntersectionObserver;
});

describe('motionEnabled', () => {
  it('is true when motion is allowed and IntersectionObserver exists', () => {
    stubWindow(false);
    expect(motionEnabled()).toBe(true);
  });

  it('is false when the user prefers reduced motion', () => {
    stubWindow(true);
    expect(motionEnabled()).toBe(false);
  });

  it('is false when IntersectionObserver is unavailable', () => {
    stubWindow(false, false);
    expect(motionEnabled()).toBe(false);
  });

  it('is false during server-side rendering', () => {
    (globalThis as any).window = undefined;
    expect(motionEnabled()).toBe(false);
  });
});
