// Runs before first paint. Sets the theme attribute to avoid a flash, adds the
// `js` class that gates all reveal styling, and migrates the retired `llama`
// theme id to `glow`. Kept dependency-free and non-module so it can be inlined.
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
  document.documentElement.classList.add('js');

  if (theme === 'glow') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () {
        if (typeof window.startSpores === 'function') window.startSpores();
      }, 100);
    });
  }
})();
