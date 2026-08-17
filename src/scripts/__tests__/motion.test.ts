import { describe, it, expect, afterEach } from 'vitest';
import { motionEnabled, initMotion } from '../motion';

const original = globalThis.window;
const originalDocument = globalThis.document;

function stubWindow(reduce: boolean, withObserver = true) {
  (globalThis as any).window = {
    matchMedia: (q: string) => ({ matches: q.includes('reduce') ? reduce : false }),
  };
  (globalThis as any).IntersectionObserver = withObserver ? function () {} : undefined;
}

afterEach(() => {
  (globalThis as any).window = original;
  (globalThis as any).document = originalDocument;
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

describe('initMotion', () => {
  it('adds the js reveal-gate class, so it is only ever set when this module actually ran', () => {
    // Reduced motion, so initMotion takes the early revealAll() path — no
    // IntersectionObserver plumbing needed to observe the class getting added.
    stubWindow(true);
    const classes = new Set<string>();
    (globalThis as any).document = {
      documentElement: { classList: { add: (c: string) => classes.add(c) } },
      querySelectorAll: () => [],
    };

    initMotion();

    expect(classes.has('js')).toBe(true);
  });
});
