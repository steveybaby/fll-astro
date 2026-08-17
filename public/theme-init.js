// Runs before first paint. Sets the theme attribute to avoid a flash and
// migrates the retired `llama` theme id to `glow`. Kept dependency-free and
// non-module so it can be inlined.
//
// Does NOT add the `js` reveal-gate class — that happens in motion.ts, the
// module that actually clears it. Adding it here only proved "the classic
// theme-init script ran", not "the module bundle that reveals content ran";
// if the module failed (no module support, a failed chunk fetch, an
// exception earlier in the bundle), every [data-reveal] element would stay
// at opacity: 0 forever.
(function () {
  var LEGACY = { llama: 'glow' };
  var VALID = { light: 1, dark: 1, glow: 1 };

  var stored = null;
  try { stored = localStorage.getItem('theme'); } catch (e) { stored = null; }

  if (stored && LEGACY[stored]) {
    stored = LEGACY[stored];
    try { localStorage.setItem('theme', stored); } catch (e) { /* private mode */ }
  }
  if (stored && !VALID[stored]) stored = null;

  var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  var theme = stored || system;

  document.documentElement.dataset.theme = theme;

  if (theme === 'glow') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () {
        if (typeof window.startSpores === 'function') window.startSpores();
      }, 100);
    });
  }
})();
