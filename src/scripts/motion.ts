/**
 * Scroll motion. One IntersectionObserver for reveals, one throttled rAF
 * handler for parallax, both behind a single gate.
 *
 * Contract: never required for comprehension. Reveal styling is scoped to
 * `html.js` in CSS, so without JavaScript nothing is hidden in the first place;
 * when motion is disabled here, elements are marked visible immediately and no
 * scroll listener is ever attached.
 */

export function motionEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof IntersectionObserver === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function revealAll(): void {
  document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
}

function initReveals(): void {
  const targets = document.querySelectorAll('[data-reveal]');
  if (targets.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
  );

  targets.forEach((el) => observer.observe(el));
}

function initParallax(): void {
  const layers = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
  if (layers.length === 0) return;

  const active = new Set<HTMLElement>();
  const visibility = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          active.add(el);
          el.style.willChange = 'transform';
        } else {
          active.delete(el);
          el.style.willChange = '';
        }
      }
    },
    { rootMargin: '20% 0px' }
  );
  layers.forEach((el) => visibility.observe(el));

  let queued = false;
  const apply = () => {
    queued = false;
    const mid = window.innerHeight / 2;
    for (const el of active) {
      const rate = parseFloat(el.dataset.parallax ?? '0');
      if (!rate) continue;
      const offset = (el.getBoundingClientRect().top - mid) * rate;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    }
  };

  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  apply();
}

export function initMotion(): void {
  if (!motionEnabled()) {
    revealAll();
    return;
  }
  initReveals();
  initParallax();
}
