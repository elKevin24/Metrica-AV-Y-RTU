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

  // 1-2. Filtros unificados → olap-engine.js (window.applyFilters / window.resetFilters)
  //      Definidos en public/js/olap-engine.js; aquí SOLO conveniencia de alias.
  window.applyFilters = window.applyFilters || function() {};
  window.resetFilters = window.resetFilters || function() {};

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
      if (cleanTab === 'auditoria' && typeof window.initTableAuditDirect === 'function') {
        window.initTableAuditDirect();
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

  // 6. DataTables de Auditoría Granular con Sticky Header y Cards Responsivas
  let dtAuditDirectInstance = null;
  window.initTableAuditDirect = function() {
    const tableEl = document.getElementById('tableAuditDirect');
    const tbody = document.getElementById('tbodyAuditDirect');
    if (!tableEl || !tbody) return;
    if (tableEl.dataset.initialized === 'true') return;

    const base = (typeof window !== 'undefined' && window.__BASE_URL__) ? window.__BASE_URL__.replace(/\/$/, '') : '';
    fetch(`${base}/data/auditoria_muestra.json`.replace('//', '/'))
      .then(r => r.json())
      .then(data => {
        if (!data || !data.muestra_expedientes) return;
        tableEl.dataset.initialized = 'true';

        let html = '';
        data.muestra_expedientes.forEach(e => {
          const secFinal = e.Atencion_Final_Sec;
          const secRech = e.Atencion_Rechazo_Sec;
          const hrsFinal = (secFinal != null && !isNaN(secFinal)) ? (secFinal / 3600.0).toFixed(4) + ' h' : '-';
          const hrsRech = (secRech != null && !isNaN(secRech)) ? (secRech / 3600.0).toFixed(4) + ' h' : '-';
          const ciclo = (e.Ciclo_Habil_Hrs != null && !isNaN(e.Ciclo_Habil_Hrs)) ? Number(e.Ciclo_Habil_Hrs).toFixed(2) + ' h' : '-';

          let badgeRonda = '';
          if (e.Ronda_Revision === '1RA_DIRECTA') {
            badgeRonda = '<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap">🟢 1ra Directa</span>';
          } else if (e.Ronda_Revision === '1RA_RECHAZO') {
            badgeRonda = '<span class="bg-rose-100 text-rose-800 border border-rose-300 font-bold px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap">🔴 1ra Rechazo</span>';
          } else if (e.Ronda_Revision === '2DA_SUBSANADA') {
            badgeRonda = '<span class="bg-blue-100 text-blue-800 border border-blue-300 font-bold px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap">🔵 2da Subsanada</span>';
          } else {
            badgeRonda = '<span class="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap">⚠️ 3ra+ Límite</span>';
          }

          let badgeEstado = '';
          if (e.Estado === 'APROBADA') {
            badgeEstado = '<span class="text-emerald-700 font-bold whitespace-nowrap">Aprobada</span>';
          } else if (e.Estado && e.Estado.includes('RECHAZADA')) {
            badgeEstado = '<span class="text-rose-600 font-bold whitespace-nowrap">Rechazada</span>';
          } else {
            badgeEstado = `<span class="text-slate-600 font-medium whitespace-nowrap">${e.Estado || '-'}</span>`;
          }

          const orderFinal = (secFinal != null && !isNaN(secFinal)) ? (secFinal / 3600.0) : 999999;
          const orderRech = (secRech != null && !isNaN(secRech)) ? (secRech / 3600.0) : 999999;
          const orderCiclo = (e.Ciclo_Habil_Hrs != null && !isNaN(e.Ciclo_Habil_Hrs)) ? Number(e.Ciclo_Habil_Hrs) : 999999;

          html += `
            <tr>
              <td data-label="ID Expediente" class="font-mono font-bold text-blue-700">${e.NumeroGestion}</td>
              <td data-label="Operador" class="font-bold text-slate-800">${e.Operador}</td>
              <td data-label="Tipo Trámite" class="text-slate-700">${e.Gestion}</td>
              <td data-label="Ronda" class="text-center">${badgeRonda}</td>
              <td data-label="Región" class="text-slate-600 font-medium">${e.Region}</td>
              <td data-label="Estado">${badgeEstado}</td>
              <td data-label="Causal Rechazo" class="text-slate-600 max-w-xs truncate" title="${e.MotivoRechazo}">${e.MotivoRechazo || '-'}</td>
              <td data-label="Tiempo Atención" class="text-right font-mono text-emerald-700 font-bold" data-order="${orderFinal}">${hrsFinal}</td>
              <td data-label="Tiempo Rechazo" class="text-right font-mono text-rose-600 font-bold" data-order="${orderRech}">${hrsRech}</td>
              <td data-label="Ciclo Hábil" class="text-right font-mono text-purple-700 font-bold" data-order="${orderCiclo}">${ciclo}</td>
            </tr>
          `;
        });
        tbody.innerHTML = html;

        if (window.jQuery && window.jQuery.fn && window.jQuery.fn.DataTable) {
          if (window.jQuery.fn.DataTable.isDataTable('#tableAuditDirect')) {
            window.jQuery('#tableAuditDirect').DataTable().destroy();
          }
          dtAuditDirectInstance = window.jQuery('#tableAuditDirect').DataTable({
            pageLength: 25,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
            order: [[7, 'asc']], // Ordenar por Tiempo Atención por defecto
            columnDefs: [
              { targets: [7, 8, 9], type: 'num' }
            ],
            language: {
              lengthMenu: "Mostrar _MENU_ expedientes",
              zeroRecords: "No se encontraron expedientes",
              info: "Mostrando _START_ a _END_ de _TOTAL_ expedientes",
              infoEmpty: "Mostrando 0 expedientes",
              infoFiltered: "(filtrado de _MAX_ expedientes)",
              search: "Buscar expediente:",
              paginate: {
                first: "Primero",
                last: "Último",
                next: "Siguiente →",
                previous: "← Anterior"
              }
            }
          });
        }
        if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
          lucide.createIcons();
        }
      })
      .catch(err => console.error('Error cargando datos de auditoría:', err));
  };

  window.toggleAuditDirectView = function(mode) {
    const table = document.getElementById('tableAuditDirect');
    const btnTable = document.getElementById('btnAuditDirectTable');
    const btnCards = document.getElementById('btnAuditDirectCards');
    if (!table) return;

    if (mode === 'cards') {
      table.classList.add('dt-card-view');
      if (btnCards) btnCards.className = 'px-2.5 py-1 rounded-lg transition bg-white text-blue-700 shadow-xs flex items-center gap-1.5 font-bold';
      if (btnTable) btnTable.className = 'px-2.5 py-1 rounded-lg transition text-slate-600 hover:text-slate-900 flex items-center gap-1.5 font-medium';
    } else {
      table.classList.remove('dt-card-view');
      if (btnTable) btnTable.className = 'px-2.5 py-1 rounded-lg transition bg-white text-blue-700 shadow-xs flex items-center gap-1.5 font-bold';
      if (btnCards) btnCards.className = 'px-2.5 py-1 rounded-lg transition text-slate-600 hover:text-slate-900 flex items-center gap-1.5 font-medium';
    }
  };

  // Inicializar al cargar si se accede directamente a la pestaña de auditoría
  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#tab-auditoria' || window.location.hash.includes('auditoria')) {
      window.switchTab('auditoria');
    }
  });

})(window);

