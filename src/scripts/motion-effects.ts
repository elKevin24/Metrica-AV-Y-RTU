import { animate, stagger } from 'motion';

export function animateVisibleCards(containerSelector = '.tab-content:not(.hidden)') {
  if (typeof window === 'undefined') return;

  const container = document.querySelector(containerSelector);
  if (!container) return;

  const allCards = container.querySelectorAll('.bg-white, .card-hover, [id^="kpi"]');
  // Excluir elementos contenidos dentro de islas de React (astro-island) para prevenir desajustes de hidratación
  const cards = Array.from(allCards).filter(el => !el.closest('astro-island'));
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
