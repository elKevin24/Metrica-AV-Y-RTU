import Lenis from 'lenis';

let lenisInstance: Lenis | null = null;

export function initSmoothScroll() {
  if (typeof window === 'undefined') return;

  if (lenisInstance) {
    lenisInstance.destroy();
  }

  lenisInstance = new Lenis({
    duration: 1.0,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.2,
  });

  (window as any).lenis = lenisInstance;

  function raf(time: number) {
    lenisInstance?.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);
}

// Inicializar en carga de página y transiciones de Astro
if (typeof document !== 'undefined') {
  initSmoothScroll();
  document.addEventListener('astro:page-load', () => {
    initSmoothScroll();
  });
}
