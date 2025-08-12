// Initialize theme before page render to prevent flash of unstyled content
(function() {
  const stored = localStorage.getItem('theme');
  const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const theme = stored || system;
  document.documentElement.dataset.theme = theme;
  
  // If llama theme is set, initialize llama rain after page loads
  if (theme === 'llama') {
    document.addEventListener('DOMContentLoaded', function() {
      // Delay slightly to ensure theme toggle component is loaded
      setTimeout(function() {
        if (typeof window.startLlamaRain === 'function') {
          window.startLlamaRain();
        }
      }, 100);
    });
  }
})();