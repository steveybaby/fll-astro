import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(process.cwd(), 'public/theme-init.js'), 'utf8');

function run(stored: string | null, prefersDark = false) {
  const store = new Map<string, string>();
  if (stored !== null) store.set('theme', stored);

  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: vi.fn((k: string, v: string) => { store.set(k, v); }),
  };
  const classes = new Set<string>();
  const documentElement = { dataset: {} as Record<string, string>, classList: { add: (c: string) => classes.add(c) } };
  const doc = { documentElement, addEventListener: vi.fn() };
  const win = { matchMedia: (q: string) => ({ matches: q.includes('dark') ? prefersDark : false }) };

  // eslint-disable-next-line no-new-func
  new Function('window', 'document', 'localStorage', 'setTimeout', SRC)(
    win, doc, localStorage, vi.fn()
  );

  return { theme: documentElement.dataset.theme, classes, setItem: localStorage.setItem, store };
}

describe('theme-init', () => {
  it('migrates a stored llama theme to glow and persists it', () => {
    const r = run('llama');
    expect(r.theme).toBe('glow');
    expect(r.setItem).toHaveBeenCalledWith('theme', 'glow');
    expect(r.store.get('theme')).toBe('glow');
  });

  it('passes valid stored themes through untouched', () => {
    expect(run('dark').theme).toBe('dark');
    expect(run('light').theme).toBe('light');
    expect(run('glow').theme).toBe('glow');
  });

  it('falls back to the system preference when nothing is stored', () => {
    expect(run(null, true).theme).toBe('dark');
    expect(run(null, false).theme).toBe('light');
  });

  it('falls back to the system preference for an unrecognised stored value', () => {
    expect(run('banana', true).theme).toBe('dark');
  });

  it('does not add the js reveal-gate class — motion.ts owns that now, since it is the module that actually clears it', () => {
    expect(run(null).classes.has('js')).toBe(false);
  });
});
