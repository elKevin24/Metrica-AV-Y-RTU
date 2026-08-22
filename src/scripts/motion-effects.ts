import { animate, stagger } from 'motion';

export function animateVisibleCards(containerSelector = '.tab-content:not(.hidden)') {
  if (typeof window === 'undefined') return;

  const container = document.querySelector(containerSelector);
  if (!container) return;

  const cards = container.querySelectorAll('.bg-white, .card-hover, [id^="kpi"]');
  if (cards.length > 0) {
    animate(
      cards,
      {
        opacity: [0, 1],
        y: [8, 0],
      },
      {
        delay: stagger(0.03, { start: 0.05 }),
        duration: 0.35,
        easing: 'ease-out',
      }
    );
  }
}

// Escuchar cambios de pestañas y carga de datos
if (typeof window !== 'undefined') {
  window.addEventListener('dataReady', () => {
    animateVisibleCards('#tab-macro');
  });

  document.addEventListener('astro:page-load', () => {
    animateVisibleCards();
  });
}
