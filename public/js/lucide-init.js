/**
 * Universal Lucide Icons Initializer & Reactive Observer
 * Garantiza la carga y renderizado automático e instantáneo de iconos Lucide en todo el sitio,
 * tanto en la carga inicial como ante mutaciones dinámicas del DOM (innerHTML, tabs, tooltips).
 */
(function() {
  function initLucideIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try {
        window.lucide.createIcons();
      } catch (e) {
        console.warn('Lucide createIcons warning:', e);
      }
    }
  }

  // Exponer función global
  window.renderIcons = initLucideIcons;

  // 1. Ejecución inmediata si el script ya está presente
  initLucideIcons();

  // 2. Ejecución en eventos de ciclo de vida del documento
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLucideIcons);
  } else {
    initLucideIcons();
  }
  window.addEventListener('load', initLucideIcons);

  // 3. Polling de respaldo para scripts asíncronos o con defer
  var attempts = 0;
  var interval = setInterval(function() {
    attempts++;
    initLucideIcons();
    var unrendered = document.querySelector('i[data-lucide]');
    if (!unrendered && attempts > 10) {
      clearInterval(interval);
    }
    if (attempts >= 30) {
      clearInterval(interval);
    }
  }, 120);

  // 4. MutationObserver reactivo: Detecta inserciones dinámicas de <i data-lucide="...">
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function(mutations) {
      var hasNewIcons = false;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var node = m.addedNodes[j];
            if (node.nodeType === 1) { // Node.ELEMENT_NODE
              if (node.hasAttribute && node.hasAttribute('data-lucide')) {
                hasNewIcons = true;
                break;
              }
              if (node.querySelector && node.querySelector('i[data-lucide], [data-lucide]')) {
                hasNewIcons = true;
                break;
              }
            }
          }
        }
        if (hasNewIcons) break;
      }

      if (hasNewIcons) {
        initLucideIcons();
      }
    });

    function startObserving() {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserving);
    } else {
      startObserving();
    }
  }
})();
