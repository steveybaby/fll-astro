// Rickroll Mode - Stealth FLL Edition 🎵
// Activated with ?mode=rr URL parameter
(function() {
  'use strict';
  
  const RICKROLL_URL = 'https://creations.mtdv.me/videos/fll-unearthed-video';
  
  // Check if rickroll mode is enabled
  function isRickrollModeEnabled() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    console.log('🎵 Checking rickroll mode, URL params:', window.location.search, 'mode:', mode);
    return mode === 'rr';
  }
  
  // Check if a URL is external (not same domain)
  function isExternalLink(url) {
    try {
      const link = new URL(url, window.location.origin);
      const isExternal = link.hostname !== window.location.hostname;
      console.log('🔍 Link check:', url, 'hostname:', link.hostname, 'current:', window.location.hostname, 'external:', isExternal);
      return isExternal;
    } catch (e) {
      console.log('❌ URL parsing error:', e);
      return false;
    }
  }
  
  // Initialize rickroll mode
  function initRickrollMode() {
    const isEnabled = isRickrollModeEnabled();
    console.log('🎵 Rickroll mode check:', isEnabled);
    
    if (!isEnabled) {
      console.log('❌ Rickroll mode not enabled. Add ?mode=rr to URL to activate.');
      return;
    }
    
    console.log('🎵 RICKROLL MODE ACTIVATED 🎵');
    console.log('All external links have been... enhanced 😏');
    
    // Add visual indicator to body for debugging
    document.body.setAttribute('data-rickroll', 'active');
    
    // Intercept all clicks on links
    document.addEventListener('click', function(event) {
      console.log('👆 Click detected on:', event.target);
      const link = event.target.closest('a');
      
      if (!link || !link.href) {
        console.log('❌ No link found or no href');
        return;
      }
      
      console.log('🔗 Link found:', link.href);
      
      // Check if it's an external link
      if (isExternalLink(link.href)) {
        console.log('🎯 EXTERNAL LINK DETECTED! Rickrolling...');
        event.preventDefault();
        event.stopPropagation();
        
        // Add a slight delay to make it feel more natural
        setTimeout(() => {
          console.log('🚀 Opening rickroll URL:', RICKROLL_URL);
          window.open(RICKROLL_URL, '_blank');
        }, 100);
        
        console.log('🎵 Never gonna give you up! External link rickrolled:', link.href);
      } else {
        console.log('✅ Internal link, allowing normal navigation');
      }
    }, true);
    
    // Also intercept any programmatic navigation attempts
    const originalOpen = window.open;
    window.open = function(url, ...args) {
      console.log('🌐 Window.open called with:', url);
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
    console.log('%cTry clicking any external link to test!', 
                'color: #ffa500; font-size: 12px;');
  }
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRickrollMode);
  } else {
    // Add a small delay to ensure everything is loaded
    setTimeout(initRickrollMode, 100);
  }
})();