/**
 * Layout, Navegación y Modales Globales - SAT Guatemala
 * Proporciona control reactivo para pestañas, paleta de comandos (⌘K),
 * modales informativos y navegación responsive.
 */
(function() {
  'use strict';

  // 1. Control de Pestañas (Tab Switching)
  window.switchTab = function(tabId) {
    if (!tabId) return;

    // Actualizar botones de navegación desktop
    var tabBtns = document.querySelectorAll('#navTabsContainer button[role="tab"], #navTabsContainer .tab-link');
    tabBtns.forEach(function(btn) {
      var controls = btn.getAttribute('aria-controls') || btn.getAttribute('data-tab');
      if (controls === tabId || btn.getAttribute('href') === '#' + tabId) {
        btn.classList.add('active');
        btn.classList.remove('text-slate-400');
        btn.classList.add('text-white', 'font-bold');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active', 'text-white', 'font-bold');
        btn.classList.add('text-slate-400');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    // Actualizar contenidos de pestañas
    var tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(function(content) {
      if (content.id === tabId) {
        content.classList.remove('hidden');
        content.classList.add('active', 'block');
      } else {
        content.classList.add('hidden');
        content.classList.remove('active', 'block');
      }
    });

    // Notificar redibujado de gráficos si existen
    if (typeof window.resizeAllCharts === 'function') {
      window.resizeAllCharts();
    }
    if (typeof window.renderIcons === 'function') {
      window.renderIcons();
    }
  };

  // 2. Control de Pestañas en Módulo Bitácora
  window.switchBitacoraTab = function(tabId) {
    if (!tabId) return;

    var bitacoraBtns = document.querySelectorAll('[onclick^="switchBitacoraTab"]');
    bitacoraBtns.forEach(function(btn) {
      if (btn.getAttribute('onclick').indexOf(tabId) !== -1) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    var contents = document.querySelectorAll('.bitacora-tab-content');
    contents.forEach(function(content) {
      if (content.id === tabId) {
        content.classList.remove('hidden');
        content.classList.add('active', 'block');
      } else {
        content.classList.add('hidden');
        content.classList.remove('active', 'block');
      }
    });

    if (typeof window.renderIcons === 'function') {
      window.renderIcons();
    }
  };

  // 3. Paleta de Comandos (⌘K / Ctrl+K)
  window.toggleCommandPalette = function() {
    var modal = document.getElementById('cmdPaletteModal');
    if (!modal) return;
    var isHidden = modal.classList.contains('hidden');
    if (isHidden) {
      modal.classList.remove('hidden');
      var input = document.getElementById('cmdPaletteInput');
      if (input) {
        input.value = '';
        setTimeout(function() { input.focus(); }, 50);
      }
    } else {
      modal.classList.add('hidden');
    }
  };

  window.filterCommandPalette = function(query) {
    var list = document.getElementById('cmdPaletteList');
    if (!list) return;
    var items = list.querySelectorAll('.cmd-item, div[onclick]');
    var q = (query || '').toLowerCase().trim();
    items.forEach(function(item) {
      var text = item.textContent.toLowerCase();
      item.style.display = text.indexOf(q) !== -1 ? '' : 'none';
    });
  };

  // 4. Modal de Metodología
  window.toggleMetodologiaModal = function() {
    var modal = document.getElementById('metodologiaModal');
    if (modal) {
      modal.classList.toggle('hidden');
    }
  };

  // 5. Modal de Atajos de Teclado (?)
  window.toggleShortcutsModal = function() {
    var modal = document.getElementById('shortcutsModal');
    if (modal) {
      modal.classList.toggle('hidden');
    }
  };

  // 6. Menú Drawer Móvil
  window.toggleMobileMenuDrawer = function() {
    var drawer = document.getElementById('mobileMenuDrawer');
    if (drawer) {
      drawer.classList.toggle('hidden');
    }
  };

  window.selectMobileTab = function(tabId) {
    window.switchTab(tabId);
    var drawer = document.getElementById('mobileMenuDrawer');
    if (drawer) {
      drawer.classList.add('hidden');
    }
  };

  // 7. Botón Scroll to Top
  window.scrollToTop = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 8. Eventos Globales de Teclado y Scroll
  document.addEventListener('keydown', function(e) {
    // Ctrl+K o Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      window.toggleCommandPalette();
      return;
    }

    // Escape para cerrar cualquier modal abierto
    if (e.key === 'Escape') {
      ['cmdPaletteModal', 'metodologiaModal', 'shortcutsModal', 'mobileMenuDrawer'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) {
          el.classList.add('hidden');
        }
      });
      return;
    }

    // Atajo ? para ayuda (cuando no se escribe en un input)
    if (e.key === '?' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      window.toggleShortcutsModal();
      return;
    }

    // Atajo Alt+R para resetear filtros
    if (e.altKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      if (typeof window.resetFilters === 'function') {
        window.resetFilters();
      }
      return;
    }
  });

  // Mostrar / Ocultar botón Scroll to Top según el desplazamiento
  window.addEventListener('scroll', function() {
    var btn = document.getElementById('btnScrollTop');
    if (!btn) return;
    if (window.scrollY > 280) {
      btn.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-16');
      btn.classList.add('opacity-100', 'translate-y-0');
    } else {
      btn.classList.remove('opacity-100', 'translate-y-0');
      btn.classList.add('opacity-0', 'pointer-events-none', 'translate-y-16');
    }
  }, { passive: true });

  // Inicializar Lucide al cargar el documento
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      if (typeof window.renderIcons === 'function') window.renderIcons();
    });
  } else {
    if (typeof window.renderIcons === 'function') window.renderIcons();
  }
})();
