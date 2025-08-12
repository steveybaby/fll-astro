// Rickroll Mode - Stealth FLL Edition 🎵
// Activated with ?mode=rr URL parameter
(function() {
  'use strict';
  
  const RICKROLL_URL = 'https://creations.mtdv.me/videos/fll-unearthed-video';
  
  // Check if rickroll mode is enabled
  function isRickrollModeEnabled() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('mode') === 'rr';
  }
  
  // Check if a URL is external (not same domain)
  function isExternalLink(url) {
    try {
      const link = new URL(url, window.location.origin);
      return link.hostname !== window.location.hostname;
    } catch (e) {
      return false;
    }
  }
  
  // Initialize rickroll mode
  function initRickrollMode() {
    if (!isRickrollModeEnabled()) {
      return;
    }
    
    console.log('🎵 RICKROLL MODE ACTIVATED 🎵');
    console.log('All external links have been... enhanced 😏');
    
    // Intercept all clicks on links
    document.addEventListener('click', function(event) {
      const link = event.target.closest('a');
      
      if (!link || !link.href) {
        return;
      }
      
      // Check if it's an external link
      if (isExternalLink(link.href)) {
        event.preventDefault();
        event.stopPropagation();
        
        // Add a slight delay to make it feel more natural
        setTimeout(() => {
          window.open(RICKROLL_URL, '_blank');
        }, 100);
        
        console.log('🎵 Never gonna give you up! External link rickrolled:', link.href);
      }
    }, true);
    
    // Also intercept any programmatic navigation attempts
    const originalOpen = window.open;
    window.open = function(url, ...args) {
      if (url && isExternalLink(url)) {
        console.log('🎵 Window.open rickrolled:', url);
        return originalOpen.call(this, RICKROLL_URL, ...args);
      }
      return originalOpen.call(this, url, ...args);
    };
    
    // Add subtle indicator that rickroll mode is active (only in console)
    console.log('%c🎵 FLL RICKROLL MODE ACTIVE 🎵', 
                'color: #ff6b6b; font-size: 16px; font-weight: bold;');
    console.log('%cAll external links are now enhanced with premium FLL content! 😏', 
                'color: #4ecdc4; font-size: 12px;');
  }
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRickrollMode);
  } else {
    initRickrollMode();
  }
})();