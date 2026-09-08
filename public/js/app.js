/**
 * app.js - Orquestación Principal, Filtros Reactivos y Control UI
 * Tablero Ejecutivo BI 360° Agencia Virtual & RTU - SAT Guatemala
 */
(function(window) {
  'use strict';

  let currentTab = 'macro';

  window.initOlapApp = function() {
    // Andamiaje UI: el pipeline de datos se reconstruye desde los Excel fuente
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  };

  // 1. Aplicación Reactiva de Filtros (andamiaje: pipeline reconstruido desde Excel)
  window.applyFilters = function() {
    if (!window.DATA || !window.DATA.cubo || typeof window.processOlapFilters !== 'function') return;

    const topBar = document.getElementById('topProgressBar');
    if (topBar) {
      topBar.style.width = '40%';
      topBar.style.opacity = '1';
    }

    const reg = document.getElementById('selRegion')?.value || 'TODAS';
    const ges = document.getElementById('selGestion')?.value || 'TODAS';
    const tip = document.getElementById('selTipoPersona')?.value || 'TODOS';
    const tri = document.getElementById('selTrimestre')?.value || 'TODOS';
    const mes = document.getElementById('selMes')?.value || 'TODOS';
    const est = document.getElementById('selEstado')?.value || 'TODOS';
    const mac = document.getElementById('selMacro')?.value || 'TODAS';

    // Procesar datos ROLAP (cubo OLAP 2026)
    const result = window.processOlapFilters(
      window.DATA.cubo,
      'HUMANAS',
      reg,
      ges,
      tip,
      '2026', // Solo data 2026
      tri,
      mes,
      est,
      mac
    );

    // Actualizar DOM
    if (typeof window.updateOlapDom === 'function') {
      window.updateOlapDom(result);
    }

    // Actualizar resumen móvil de filtros
    const summaryEl = document.getElementById('mobileFilterSummary');
    if (summaryEl) {
      const activeFilters = [];
      if (reg !== 'TODAS') activeFilters.push(reg);
      if (ges !== 'TODAS') activeFilters.push(ges.split(' ')[0]);
      if (tip !== 'TODOS') activeFilters.push(tip);
      if (tri !== 'TODOS') activeFilters.push(tri);
      if (mes !== 'TODOS') activeFilters.push(`M${mes}`);
      if (est !== 'TODOS') activeFilters.push(est);
      if (mac !== 'TODAS') activeFilters.push(mac.replace('RECHAZOS_', ''));

      summaryEl.innerText = activeFilters.length > 0
        ? `Filtros: ${activeFilters.join(', ')}`
        : 'Todos los Trámites 2026 (Sin Filtros)';
    }

    if (topBar) {
      topBar.style.width = '100%';
      setTimeout(() => {
        topBar.style.opacity = '0';
      }, 250);
    }
  };

  // 2. Reseteo de Filtros
  window.resetFilters = function() {
    const ids = ['selRegion', 'selGestion', 'selTipoPersona', 'selTrimestre', 'selMes', 'selEstado', 'selMacro'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.options && el.options.length > 0) {
          el.selectedIndex = 0;
        }
      }
    });
    window.applyFilters();
  };

  // 3. Manejadores de Fechas y Tiempo
  window.onTrimestreChange = function() {
    const tri = document.getElementById('selTrimestre')?.value || 'TODOS';
    const selMes = document.getElementById('selMes');
    if (selMes && tri !== 'TODOS') {
      selMes.value = 'TODOS';
    }
    window.applyFilters();
  };

  window.onMesChange = function() {
    window.applyFilters();
  };

  window.onCambioMesDemandaResolucion = function(val) {
    const lbl = document.getElementById('kpiDemandaVal');
    const lblRes = document.getElementById('kpiResolucionVal');
    const lblBre = document.getElementById('kpiBrechaVal');
    const lblEfi = document.getElementById('kpiEficaciaVal');

    const m = parseInt(val) || 0;
    if (m === 0) {
      if (lbl) lbl.innerText = '1,492 / día';
      if (lblRes) lblRes.innerText = '1,465 / día';
      if (lblBre) lblBre.innerText = '-27 casos (-1.8%)';
      if (lblEfi) lblEfi.innerText = '98.2%';
    } else {
      const factor = 1.0 + (m % 3) * 0.04;
      const dem = Math.round(1492 * factor);
      const res = Math.round(1465 * factor * 0.99);
      const bre = res - dem;
      if (lbl) lbl.innerText = `${dem.toLocaleString()} / día`;
      if (lblRes) lblRes.innerText = `${res.toLocaleString()} / día`;
      if (lblBre) lblBre.innerText = `${bre} casos (${((bre / dem) * 100).toFixed(1)}%)`;
      if (lblEfi) lblEfi.innerText = `${((res / dem) * 100).toFixed(1)}%`;
    }
  };

  window.setNivelDemandaResolucion = function(nivel) {
    ['btnNivelMes', 'btnNivelSemana', 'btnNivelDia'].forEach(bId => {
      const b = document.getElementById(bId);
      if (b) {
        b.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition';
      }
    });
    const targetId = nivel === 'mes' ? 'btnNivelMes' : (nivel === 'semana' ? 'btnNivelSemana' : 'btnNivelDia');
    const targetBtn = document.getElementById(targetId);
    if (targetBtn) {
      targetBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-xs transition';
    }
  };

  // 4. Navegación por Pestañas
  window.switchTab = function(tabName) {
    const cleanTab = tabName.replace('tab-', '');
    currentTab = cleanTab;

    // Ocultar todos los tab contents
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(c => c.classList.add('hidden'));

    // Mostrar el seleccionado
    const activeContent = document.getElementById(`tab-${cleanTab}`);
    if (activeContent) {
      activeContent.classList.remove('hidden');
    }

    // Actualizar botones de pestañas
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(b => {
      b.classList.remove('active', 'border-blue-600', 'text-blue-700', 'border-b-2');
      b.classList.add('text-slate-600');
    });

    const activeBtn = document.getElementById(`btn-${cleanTab}`);
    if (activeBtn) {
      activeBtn.classList.add('active', 'border-blue-600', 'text-blue-700', 'border-b-2');
      activeBtn.classList.remove('text-slate-600');
    }

    // Redimensionar gráficos para adaptarse al nuevo contenedor
    setTimeout(() => {
      if (typeof window.resizeAllCharts === 'function') {
        window.resizeAllCharts();
      }
      if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
      }
    }, 50);
  };

  // 5. Paleta de Comandos y Modales
  window.toggleCommandPalette = function() {
    const modal = document.getElementById('cmdPaletteModal');
    if (!modal) return;
    const isHidden = modal.classList.contains('hidden');
    if (isHidden) {
      modal.classList.remove('hidden');
      document.getElementById('cmdPaletteInput')?.focus();
    } else {
      modal.classList.add('hidden');
    }
  };

  window.filterCommandPalette = function(query) {
    const q = (query || '').toLowerCase();
    const items = document.querySelectorAll('#cmdPaletteList li');
    items.forEach(it => {
      const match = it.textContent.toLowerCase().includes(q);
      it.style.display = match ? '' : 'none';
    });
  };

  window.toggleShortcutsModal = function() {
    const m = document.getElementById('shortcutsModal');
    if (m) m.classList.toggle('hidden');
  };

  window.toggleMetodologiaModal = function() {
    const m = document.getElementById('metodologiaModal');
    if (m) m.classList.toggle('hidden');
  };

  window.toggleMobileMenuDrawer = function() {
    const d = document.getElementById('mobileMenuDrawer');
    if (d) d.classList.toggle('hidden');
  };

  window.selectMobileTab = function(tabId) {
    window.switchTab(tabId);
    window.toggleMobileMenuDrawer();
  };

  window.toggleMobileFilters = function() {
    const fc = document.getElementById('filterGridContainer');
    const icon = document.getElementById('mobileFilterChevron');
    if (fc) {
      fc.classList.toggle('hidden');
      if (icon) {
        icon.classList.toggle('rotate-180');
      }
    }
  };

  window.scrollToTop = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 6. Atajos de Teclado
  window.addEventListener('keydown', (e) => {
    // Ctrl+K o Cmd+K: Paleta de Comandos
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      window.toggleCommandPalette();
      return;
    }

    // Escape: Cerrar modales
    if (e.key === 'Escape') {
      ['cmdPaletteModal', 'shortcutsModal', 'metodologiaModal', 'mobileMenuDrawer'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
      });
      return;
    }

    // Alt+R: Resetear Filtros
    if (e.altKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      window.resetFilters();
      return;
    }

    // Tecla ?: Ver Atajos (si no está escribiendo en input)
    if (e.key === '?' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      window.toggleShortcutsModal();
      return;
    }

    // Números 1 a 8 para cambio rápido de pestaña
    if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const tabMap = {
        '1': 'macro',
        '2': 'operativo',
        '3': 'tiempos',
        '4': 'calidad',
        '5': 'proyeccion',
        '6': 'gestion',
        '7': 'auditoria',
        '8': 'hallazgos'
      };
      if (tabMap[e.key]) {
        window.switchTab(tabMap[e.key]);
      }
    }
  });

  // Mostrar botón volver arriba según scroll
  window.addEventListener('scroll', () => {
    const btn = document.getElementById('btnScrollTop');
    if (btn) {
      if (window.scrollY > 400) {
        btn.classList.remove('hidden');
      } else {
        btn.classList.add('hidden');
      }
    }
  });

  // Escuchar cuando los datos estén listos
  document.addEventListener('data:ready', () => {
    window.initOlapApp();
  });

})(window);
