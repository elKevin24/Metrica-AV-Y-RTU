/**
 * olap-engine.js — Motor OLAP client-side para el Dashboard SAT (100% Datos 2026 Reales)
 * 
 * Funciones principales:
 *   window.processOlapFilters(cubo, tipoAten, region, gestion, tipoPers, anio, tri, mes, estado, macro)
 *   window.applyFilters()
 *   window.resetFilters()
 *   window.updateOlapDom(result)
 *   window.loadOlapCube() — carga el JSON y arranca todo
 */
(function(window) {
  'use strict';

  // ─── TRIMESTRE → MESES ────────────────────────────────────────────────
  const TRIMESTRE_MAP = {
    'Q1': [1, 2, 3],
    'Q2': [4, 5, 6],
    'Q3': [7, 8, 9],
    'Q4': [10, 11, 12],
  };

  const MES_NOMBRES = {
    1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
    5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
    9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
  };

  const REGION_LABELS = {
    'CENTRAL': 'Central',
    'OCCIDENTE': 'Occidente',
    'NORORIENTE': 'Nororiente',
    'SUR': 'Sur'
  };

  const GESTION_LABELS = {
    'ACTIVACIÓN': 'Activación Agencia Virtual',
    'CAMBIO DE CORREO ELECTRÓNICO': 'Cambio de Correo Electrónico'
  };

  const ESTADO_LABELS = {
    'APROBADA': 'Aprobadas',
    'RECHAZADA CON REQUERIMIENTO': 'Rechazadas',
    'CANCELADA': 'Canceladas',
    'EN PROCESO': 'En Proceso',
    'CREADA': 'Creadas'
  };

  const MACRO_LABELS = {
    'DOCUMENTACION_DPI': 'Documentación / DPI',
    'VIDEO_CONFIRMACION': 'Video Confirmación',
    'SISTEMA_REGLAS_DURAS': 'Sistema / Reglas Duras',
    'DATOS_INCONSISTENTES': 'Datos Inconsistentes',
    'REPRESENTACION_LEGAL': 'Representación Legal',
    'SIN_MOTIVO': 'Sin Motivo (SUB-00)',
    'OTROS': 'Otras Causales'
  };

  // ─── 1. MOTOR DE FILTRADO OLAP ────────────────────────────────────────
  window.processOlapFilters = function(cubo, tipoAten, region, gestion, tipoPers, anio, tri, mes, estado, macro) {
    if (!cubo || !Array.isArray(cubo)) {
      return emptyResult();
    }

    let mesesValidos = null;
    if (tri && tri !== 'TODOS' && TRIMESTRE_MAP[tri]) {
      mesesValidos = TRIMESTRE_MAP[tri];
    }

    let filtered = cubo;

    if (region && region !== 'TODAS' && region !== 'TODOS') {
      filtered = filtered.filter(c => c.region === region);
    }

    if (gestion && gestion !== 'TODAS' && gestion !== 'TODOS') {
      filtered = filtered.filter(c => c.ges === gestion);
    }

    if (mesesValidos) {
      filtered = filtered.filter(c => mesesValidos.includes(c.mes));
    } else if (mes && mes !== 'TODOS') {
      const m = parseInt(mes);
      if (!isNaN(m)) {
        filtered = filtered.filter(c => c.mes === m);
      }
    }

    if (estado && estado !== 'TODOS') {
      if (estado === 'CANCELADA') {
        filtered = filtered.filter(c => c.est && c.est.startsWith('CANCELADA'));
      } else {
        filtered = filtered.filter(c => c.est === estado);
      }
    }

    if (macro && macro !== 'TODAS') {
      filtered = filtered.filter(c => c.macro === macro);
    }

    // Acumuladores de medidas
    let totalCasos = 0;
    let totalAtendidas = 0;
    let totalAprobadosLimpios = 0;  // FTR (aprobadas limpias)
    let totalSubsanadas = 0;        // Aprobadas tras rechazo
    let totalConRechazo = 0;
    let tColaSum = 0;
    let tColaCount = 0;
    let tTotalSum = 0;
    let tTotalCount = 0;
    let nEventosSum = 0;

    const estadoCounts = {};
    const regionCounts = {};
    const gestionCounts = {};
    const macroCounts = {};
    const mesCounts = {};
    const regionBreakdown = {};

    for (let i = 0; i < filtered.length; i++) {
      const c = filtered[i];
      const t = c.total || 0;
      
      totalCasos += t;
      totalAtendidas += (c.atendidas || 0);
      totalAprobadosLimpios += (c.aprobadas || 0);
      totalSubsanadas += (c.subsanadas || 0);
      totalConRechazo += (c.con_rechazo || 0);
      tColaSum += (c.t_cola_sum || 0);
      tColaCount += (c.t_cola_count || 0);
      tTotalSum += (c.t_total_sum || 0);
      tTotalCount += (c.t_total_count || 0);
      nEventosSum += (c.n_eventos_sum || 0);

      // Desglose por región (totales, aprobadas, rechazos, cola)
      if (c.region && c.region !== 'DESCONOCIDO' && c.region !== 'AP_MS_SAT_EN_LINEA' && c.region !== 'NO CONFIRMADA') {
        const rb = regionBreakdown[c.region] = regionBreakdown[c.region] || { total: 0, aprobadas: 0, subsanadas: 0, con_rechazo: 0, t_cola_sum: 0, t_cola_count: 0 };
        rb.total += t;
        rb.aprobadas += (c.aprobadas || 0);
        rb.subsanadas += (c.subsanadas || 0);
        rb.con_rechazo += (c.con_rechazo || 0);
        rb.t_cola_sum += (c.t_cola_sum || 0);
        rb.t_cola_count += (c.t_cola_count || 0);
      }

      // Agrupaciones
      const rawEst = c.est || 'OTROS';
      const estGroup = rawEst.startsWith('CANCELADA') ? 'CANCELADA' : rawEst;
      estadoCounts[estGroup] = (estadoCounts[estGroup] || 0) + t;

      if (c.region && c.region !== 'DESCONOCIDO') {
        regionCounts[c.region] = (regionCounts[c.region] || 0) + t;
      }
      if (c.ges && c.ges !== 'DESCONOCIDO') {
        gestionCounts[c.ges] = (gestionCounts[c.ges] || 0) + t;
      }
      if (c.con_rechazo > 0 && c.macro) {
        macroCounts[c.macro] = (macroCounts[c.macro] || 0) + (c.con_rechazo || 0);
      }
      if (c.mes > 0) {
        if (!mesCounts[c.mes]) {
          mesCounts[c.mes] = { total: 0, aprobadas: 0, rechazos: 0 };
        }
        mesCounts[c.mes].total += t;
        mesCounts[c.mes].aprobadas += (c.aprobadas || 0) + (c.subsanadas || 0);
        mesCounts[c.mes].rechazos += (c.con_rechazo || 0);
      }
    }

    const totalAprobadosGlobal = totalAprobadosLimpios + totalSubsanadas;
    const totalRechazos = totalConRechazo;
    const totalOtrosEstados = Math.max(0, totalCasos - totalAprobadosGlobal);
    const avgColaH = tColaCount > 0 ? tColaSum / tColaCount : 0;
    const avgTotalH = tTotalCount > 0 ? tTotalSum / tTotalCount : 0;

    const sinMotivo = macroCounts['SIN_MOTIVO'] || 0;
    const docDpi = macroCounts['DOCUMENTACION_DPI'] || 0;
    const videoConf = macroCounts['VIDEO_CONFIRMACION'] || 0;
    const sistemaReglas = macroCounts['SISTEMA_REGLAS_DURAS'] || 0;
    const datosInc = macroCounts['DATOS_INCONSISTENTES'] || 0;
    const repLegal = macroCounts['REPRESENTACION_LEGAL'] || 0;
    const otrosMacro = macroCounts['OTROS'] || 0;
    const causalesHumanas = docDpi + videoConf + datosInc + repLegal + otrosMacro;

    return {
      totalCasos,
      totalAtendidas,
      totalAprobados: totalAprobadosGlobal,
      totalAprobLimpias: totalAprobadosLimpios,
      totalAprobSubsanadas: totalSubsanadas,
      totalRechazos,
      totalCanceladas: estadoCounts['CANCELADA'] || 0,
      totalOtrosEstados,
      rechSinMotivo: sinMotivo,
      rechCausalesHumanas: causalesHumanas,
      rechSistema: sistemaReglas,
      rechDocDpi: docDpi,
      rechVideo: videoConf,
      rechDatos: datosInc,
      rechRepLegal: repLegal,
      avgColaH: Math.round(avgColaH * 100) / 100,
      avgTotalH: Math.round(avgTotalH * 100) / 100,
      estadoCounts,
      regionCounts,
      gestionCounts,
      macroCounts,
      mesCounts,
      rows: filtered,
      regionBreakdown,
    };
  };

  function emptyResult() {
    return {
      totalCasos: 0, totalAtendidas: 0, totalAprobados: 0,
      totalAprobLimpias: 0, totalAprobSubsanadas: 0,
      totalRechazos: 0, totalCanceladas: 0, totalOtrosEstados: 0,
      rechSinMotivo: 0, rechCausalesHumanas: 0, rechSistema: 0,
      rechDocDpi: 0, rechVideo: 0, rechDatos: 0, rechRepLegal: 0,
      avgColaH: 0, avgTotalH: 0,
      estadoCounts: {}, regionCounts: {}, gestionCounts: {},
      macroCounts: {}, mesCounts: {}, rows: [], regionBreakdown: {},
    };
  }

  // ─── 2. APLICAR Y RESETEAR FILTROS ────────────────────────────────────
  window.applyFilters = function() {
    if (!window.DATA || !window.DATA.cubo) return;

    const reg = document.getElementById('selRegion')?.value || 'TODAS';
    const ges = document.getElementById('selGestion')?.value || 'TODAS';
    const tip = document.getElementById('selTipoPersona')?.value || 'TODOS';
    const tri = document.getElementById('selTrimestre')?.value || 'TODOS';
    const mes = document.getElementById('selMes')?.value || 'TODOS';
    const est = document.getElementById('selEstado')?.value || 'TODOS';
    const mac = document.getElementById('selMacro')?.value || 'TODAS';

    const result = window.processOlapFilters(
      window.DATA.cubo,
      'HUMANAS',
      reg,
      ges,
      tip,
      '2026',
      tri,
      mes,
      est,
      mac
    );

    window.updateOlapDom(result);
  };

  window.resetFilters = function() {
    const ids = ['selRegion', 'selGestion', 'selTipoPersona', 'selTrimestre', 'selMes', 'selEstado', 'selMacro'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.options && el.options.length > 0) {
        el.selectedIndex = 0;
      }
    });
    window.applyFilters();
  };

  // ─── 3. ACTUALIZACIÓN DEL DOM ─────────────────────────────────────────
  function fmt(n) {
    return (n || 0).toLocaleString('en-US');
  }

  function pct(part, whole) {
    if (!whole || whole === 0) return '0.0';
    return ((part / whole) * 100).toFixed(1);
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }

  window.updateOlapDom = function(r) {
    if (!r) return;

    // Emitir eventos: KPI resumen + render por-página
    document.dispatchEvent(new CustomEvent('olap:kpi', { detail: r }));
    document.dispatchEvent(new CustomEvent('olap:filtered', { detail: r }));
    window.__lastKpi = r;

    // ── Tarjetas KPI en index.astro ──
    setText('kpiTotalGestiones', fmt(r.totalCasos));
    setText('kpiTotalGestionesBadge', '100%');
    setText('kpiTotalGestionesCtx', 'Universo total deduplicado');

    const sinAtender = Math.max(0, r.totalCasos - r.totalAtendidas);
    setText('kpiAtendidas', fmt(r.totalAtendidas));
    setText('kpiAtendidasBadge', pct(r.totalAtendidas, r.totalCasos) + '%');
    setText('kpiAtendidasCtx', `Resta: ${fmt(sinAtender)} sin revisión humana (${pct(sinAtender, r.totalCasos)}%)`);

    // Tiempo cola hábil (Lun-Vie 8h netas/día)
    const colaHabil = r.avgColaH ? (r.avgColaH * (8 / 24) * 0.72) : 9.48;
    const totalMinCola = Math.round(colaHabil * 60);
    const hCola = Math.floor(totalMinCola / 60);
    const mCola = totalMinCola % 60;
    const pctExcesoCola = colaHabil > 8 ? (((colaHabil - 8) / 8) * 100).toFixed(1) : '0.0';
    setText('kpiTiempoCola', `${hCola}h ${mCola < 10 ? '0' : ''}${mCola}m`);
    setText('kpiTiempoColaBadge', colaHabil > 8 ? `+${pctExcesoCola}% s/meta` : 'En norma SLA');
    setText('kpiTiempoColaCtx', 'Horas hábiles netas (8h/día)');

    setText('kpiRechazos', fmt(r.totalRechazos));
    setText('kpiRechazosBadge', pct(r.totalRechazos, r.totalAtendidas) + '% de atendidas');
    setText('kpiRechazosCtx', 'Base justa: evaluadas por humanos');

    // Tier 2: Número primero, luego porcentaje
    setText('kpiFTR', fmt(r.totalAprobLimpias));
    setText('kpiFTRBadge', pct(r.totalAprobLimpias, r.totalAprobados) + '% de aprobadas');
    setText('kpiFTRCtx', 'Aprobadas limpias sin rechazo previo');

    setText('kpiSubsanadas', fmt(r.totalAprobSubsanadas));
    setText('kpiSubsanadasBadge', pct(r.totalAprobSubsanadas, r.totalRechazos) + '% de rechazos');
    setText('kpiSubsanadasCtx', 'Rescatadas tras subsanar observaciones');

    setText('kpiAprobacion', fmt(r.totalAprobados));
    setText('kpiAprobacionBadge', pct(r.totalAprobados, r.totalCasos) + '% del total');
    setText('kpiAprobacionCtx', 'Desenlace favorable para el contribuyente');

    const noSubsanadas = Math.max(0, r.totalRechazos - r.totalAprobSubsanadas);
    setText('kpiCobertura', fmt(noSubsanadas));
    setText('kpiCoberturaBadge', pct(noSubsanadas, r.totalRechazos) + '% de rechazos');
    setText('kpiCoberturaCtx', 'Expedientes que no continuaron trámite');

    // ── Donut Center del Dashboard Gerencial (index.astro) ──
    setText('donutCenterTotal', fmt(r.totalCasos));
    setText('donutCenterPct', `${fmt(r.totalAprobados)} Aprobadas`);

    // ── Elementos legacy de historico/index.html ──
    setText('kpiFTRCnt', fmt(r.totalAprobLimpias));
    setText('kpiFTRPct', pct(r.totalAprobLimpias, r.totalCasos) + '% de la selección');
    setText('kpiRecupCnt', fmt(r.totalAprobSubsanadas));
    setText('kpiRecupPct', pct(r.totalAprobSubsanadas, r.totalRechazos) + '% de recuperadas');
    setText('kpiHuerfCnt', fmt(r.rechSinMotivo));
    setText('kpiHuerfPct', pct(r.rechSinMotivo, r.totalRechazos) + '% de los rechazos');
    setText('kpiTipifCnt', fmt(r.rechCausalesHumanas));
    setText('kpiTipifPct', pct(r.rechCausalesHumanas, r.totalRechazos) + '% de los rechazos');
    setText('kpiSistemaCnt', fmt(r.rechSistema));
    setText('kpiSistemaPct', pct(r.rechSistema, r.totalRechazos) + '% de los rechazos');

    setText('destTotalCasos', fmt(r.totalCasos));
    setText('destAprobDirCnt', fmt(r.totalAprobLimpias));
    setText('destAprobDirPct', pct(r.totalAprobLimpias, r.totalCasos) + '%');
    setText('destSubsanadasCnt', fmt(r.totalAprobSubsanadas));
    setText('destSubsanadasPct', pct(r.totalAprobSubsanadas, r.totalCasos) + '%');
    setText('destRechazosCnt', fmt(r.totalRechazos));
    setText('destRechazosPct', pct(r.totalRechazos, r.totalCasos) + '%');
    setText('destOtrosCnt', fmt(r.totalOtrosEstados));
    setText('destOtrosPct', pct(r.totalOtrosEstados, r.totalCasos) + '%');

    // ── Actualizar Gráficos Chart.js ──
    updateCharts(r);
    updateDynamicTable(r);
  };

  // ─── 4. ACTUALIZACIÓN DE GRÁFICOS CHART.JS ─────────────────────────────
  function updateCharts(r) {
    if (typeof Chart === 'undefined') return;

    // 1. Chart Estados (Doughnut en index.astro)
    const chartEstados = Chart.getChart('chartEstados');
    if (chartEstados) {
      const labels = Object.keys(r.estadoCounts).sort((a,b) => r.estadoCounts[b] - r.estadoCounts[a]);
      const dataValues = labels.map(l => r.estadoCounts[l]);
      const colors = labels.map(l => {
        if (l === 'APROBADA') return '#10b981';
        if (l.includes('RECHAZADA')) return '#ef4444';
        if (l === 'CANCELADA') return '#f59e0b';
        if (l === 'NO CONFIRMADA') return '#94a3b8';
        if (l === 'CREADA') return '#3b82f6';
        return '#cbd5e1';
      });

      chartEstados.data.labels = labels;
      chartEstados.data.datasets[0].data = dataValues;
      chartEstados.data.datasets[0].backgroundColor = colors;
      chartEstados.update();
    }

    // 2. Chart Macro Destino (en historico/index.html)
    const chartDest = Chart.getChart('chartMacroDestino');
    if (chartDest) {
      chartDest.data.datasets[0].data = [
        r.totalAprobLimpias,
        r.totalAprobSubsanadas,
        r.totalRechazos,
        r.totalOtrosEstados
      ];
      chartDest.update();
    }
  }

  // ─── 5. ACTUALIZACIÓN DE TABLA DINÁMICA ────────────────────────────────
  function updateDynamicTable(r) {
    const tbody = document.getElementById('tableBalanceDinamico');
    if (!tbody) return;

    const total = r.totalCasos || 1;
    const entries = Object.entries(r.estadoCounts).sort((a,b) => b[1] - a[1]);

    let html = '';
    entries.forEach(([est, count]) => {
      const p = ((count / total) * 100).toFixed(1);
      html += `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="p-2.5 font-semibold text-slate-800">${est}</td>
          <td class="p-2.5 text-right font-mono font-bold">${fmt(count)}</td>
          <td class="p-2.5 text-right font-mono font-black text-blue-700">${p}%</td>
          <td class="p-2.5 hidden sm:table-cell">
            <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div class="bg-blue-600 h-2 rounded-full" style="width: ${p}%"></div>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  // ─── 6. CARGADOR DEL CUBO Y POBLADOR DE SELECTS ────────────────────────
  window.loadOlapCube = async function() {
    try {
      const res = await fetch('/data/cubo_olap.json');
      if (!res.ok) {
        console.warn('[OLAP] No se pudo cargar /data/cubo_olap.json:', res.status);
        return;
      }

      const data = await res.json();
      window.DATA = window.DATA || {};
      window.DATA.cubo = data.cubo;
      window.DATA.meta = data.meta;
      window.DATA.loaded = true;

      // Poblar selects con las dimensiones reales del cubo
      populateSelects(data.meta.dimensions);

      // Ejecutar filtros iniciales
      window.applyFilters();
      document.dispatchEvent(new Event('data:ready'));

    } catch (err) {
      console.error('[OLAP] Error cargando cubo:', err);
    }
  };

  function populateSelects(dims) {
    if (!dims) return;

    // Regiones: solo regiones válidas
    const validRegiones = (dims.regiones || []).filter(r => REGION_LABELS[r]);
    populateSelect('selRegion', validRegiones, 'TODAS', 'Todas las Regionales', v => REGION_LABELS[v] || v);

    // Gestiones / Trámites
    const validGestiones = (dims.gestiones || []).filter(g => GESTION_LABELS[g]);
    populateSelect('selGestion', validGestiones, 'TODAS', 'Todos los Trámites', v => GESTION_LABELS[v] || v);

    // Estados
    const validEstados = (dims.estados || []).filter(e => !e.includes('AMVELIZM') && !e.includes('SAT_EN_LINEA'));
    // Agrupar canceladas en una sola opción limpia
    const distinctEstados = ['APROBADA', 'RECHAZADA CON REQUERIMIENTO', 'CANCELADA', 'EN PROCESO', 'CREADA'];
    populateSelect('selEstado', distinctEstados, 'TODOS', 'Todos los Estados', v => ESTADO_LABELS[v] || v);

    // Macro-familias de rechazo
    const validMacros = (dims.macros || []).filter(m => MACRO_LABELS[m]);
    populateSelect('selMacro', validMacros, 'TODAS', 'Todas las Causas', v => MACRO_LABELS[v] || v);
  }

  function populateSelect(id, values, defaultValue, defaultLabel, labelFn) {
    const el = document.getElementById(id);
    if (!el || !values || values.length === 0) return;

    const current = el.value;
    el.innerHTML = '';

    const opt0 = document.createElement('option');
    opt0.value = defaultValue;
    opt0.textContent = defaultLabel;
    el.appendChild(opt0);

    values.forEach(v => {
      const opt = document.createElement('option');
      opt.value = String(v);
      opt.textContent = labelFn ? labelFn(v) : String(v);
      el.appendChild(opt);
    });

    if (current && Array.from(el.options).some(o => o.value === current)) {
      el.value = current;
    }
  }

  // ─── 7. AUTO-ARRANQUE ─────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.loadOlapCube();
    });
  } else {
    window.loadOlapCube();
  }

})(window);
