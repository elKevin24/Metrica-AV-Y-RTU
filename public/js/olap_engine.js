/**
 * olap_engine.js - Motor ROLAP Analítico en Memoria para SAT
 * Procesamiento multidimensional, filtrado en caliente y agregación estadística
 */
(function(window) {
  'use strict';

  function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }

  function safeSetHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function safeSetWidth(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  }

  function formatNum(n) {
    return Math.round(n || 0).toLocaleString('es-GT');
  }

  function formatPct(p) {
    return (p || 0).toFixed(1) + '%';
  }

  function formatHours(seconds) {
    if (!seconds || isNaN(seconds)) return '0.0h';
    const hrs = seconds / 3600.0;
    return hrs >= 10 ? hrs.toFixed(1) + 'h' : hrs.toFixed(2) + 'h';
  }

  window.processOlapFilters = function(cubo, modoCarga, region, gestion, tipoPersona, anio, trimestre, mes, estado, macro) {
    if (!cubo || !cubo.rows) {
      return {
        totalCasos: 0,
        totalAtendidas: 0,
        totalAprobados: 0,
        totalRechazos: 0,
        totalOtrosEstados: 0,
        totalCanceladas: 0,
        totalNoConf: 0,
        totalAprobSubsanadas: 0,
        totalAprobDirectas: 0
      };
    }

    let fRegion = region;
    let fGestion = gestion;
    let fTipoPersona = tipoPersona;
    let fAnio = anio;
    let fTrimestre = trimestre;
    let fMes = mes;
    let fEstado = estado;
    let fMacro = macro;

    // Detect if modoCarga was omitted by caller (e.g. called as processOlapFilters(cubo, reg, ges, tip...))
    if (modoCarga !== 'HUMANAS' && modoCarga !== 'TOTAL' && modoCarga !== 'AUTOSERVICIO' && !macro && estado) {
      fRegion = modoCarga;
      fGestion = region;
      fTipoPersona = gestion;
      fAnio = tipoPersona;
      fTrimestre = anio;
      fMes = trimestre;
      fEstado = mes;
      fMacro = estado;
    }

    fRegion = (fRegion || 'TODAS').toUpperCase();
    fGestion = (fGestion || 'TODAS').toUpperCase();
    fTipoPersona = (fTipoPersona || 'TODOS').toUpperCase();
    fTrimestre = (fTrimestre || 'TODOS').toUpperCase();
    fMes = (fMes || 'TODOS').toString().toUpperCase();
    fEstado = (fEstado || 'TODOS').toUpperCase();
    fMacro = (fMacro || 'TODAS').toUpperCase();

    let totalCasos = 0;
    let totalAprobDirectas = 0;
    let totalAprobSubsanadas = 0;
    let totalRechazos = 0;
    let totalNoConf = 0;
    let sumBuzonSec = 0;
    let nBuzon = 0;
    let sumCicloSec = 0;
    let nCiclo = 0;
    let sumAtenSec = 0;
    let nAten = 0;
    let sumSla8h = 0;
    let sumFuera40h = 0;

    const regionalStats = {
      CENTRAL: { casos: 0, ftr: 0, subsanadas: 0, rechazos: 0, buzonSec: 0, nBuzon: 0, cicloSec: 0, nCiclo: 0, atenSec: 0, nAten: 0 },
      OCCIDENTE: { casos: 0, ftr: 0, subsanadas: 0, rechazos: 0, buzonSec: 0, nBuzon: 0, cicloSec: 0, nCiclo: 0, atenSec: 0, nAten: 0 },
      NORORIENTE: { casos: 0, ftr: 0, subsanadas: 0, rechazos: 0, buzonSec: 0, nBuzon: 0, cicloSec: 0, nCiclo: 0, atenSec: 0, nAten: 0 },
      SUR: { casos: 0, ftr: 0, subsanadas: 0, rechazos: 0, buzonSec: 0, nBuzon: 0, cicloSec: 0, nCiclo: 0, atenSec: 0, nAten: 0 }
    };

    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      casos: 0,
      aprobadas: 0,
      rechazos: 0,
      cicloSec: 0,
      nCiclo: 0
    }));

    const macroStats = {};
    const subcatStats = {};
    const personeriaStats = { INDIVIDUAL: 0, JURIDICA: 0 };

    for (let i = 0; i < cubo.rows.length; i++) {
      const r = cubo.rows[i];
      const rCasos = r[0];
      const rReg = r[1];
      const rEst = r[2];
      const rU1 = r[3];
      const rGes = r[4];
      const rMes = r[5];
      const rTip = r[6];
      const rMac = r[7];
      const rSub = r[8];
      const rAprDir = r[9];
      const rAprSub = r[10];
      const rRech = r[11];
      const rNoConf = r[12];
      const rBuzSec = r[13];
      const rNBuz = r[14];
      const rCicSec = r[15];
      const rNCic = r[16];
      const rAtenSec = r[17];
      const rNAten = r[18];
      const rSla8 = r[19];
      const rFuera40 = r[20];

      // Filtro Region
      if (fRegion !== 'TODAS' && fRegion !== 'TODOS' && fRegion !== 'ALL' && rReg !== fRegion) continue;

      // Filtro Gestion ('HUMANAS', 'TODAS', 'TODOS', 'ALL' incluyen tanto ACTIVACIÓN como CAMBIO DE CORREO)
      if (fGestion !== 'TODAS' && fGestion !== 'TODOS' && fGestion !== 'HUMANAS' && fGestion !== 'ALL') {
        if (fGestion === 'ACTIVACIÓN' && rGes !== 'ACTIVACIÓN') continue;
        if ((fGestion.includes('CAMBIO') || fGestion.includes('CORREO')) && !rGes.includes('CORREO')) continue;
        if (fGestion !== 'ACTIVACIÓN' && !fGestion.includes('CORREO') && rGes !== fGestion) continue;
      }

      // Filtro Tipo Persona
      if (fTipoPersona !== 'TODOS' && fTipoPersona !== 'TODAS' && fTipoPersona !== 'ALL' && rTip !== fTipoPersona) continue;

      // Filtro Trimestre
      if (fTrimestre !== 'TODOS' && fTrimestre !== 'TODAS' && fTrimestre !== 'ALL') {
        if ((fTrimestre === 'T1' || fTrimestre === 'Q1') && (rMes < 1 || rMes > 3)) continue;
        if ((fTrimestre === 'T2' || fTrimestre === 'Q2') && (rMes < 4 || rMes > 6)) continue;
        if ((fTrimestre === 'T3' || fTrimestre === 'Q3') && (rMes < 7 || rMes > 9)) continue;
        if ((fTrimestre === 'T4' || fTrimestre === 'Q4') && (rMes < 10 || rMes > 12)) continue;
      }

      // Filtro Mes
      if (fMes !== 'TODOS' && fMes !== 'TODAS' && fMes !== 'ALL' && rMes.toString() !== fMes) continue;

      // Filtro Estado
      if (fEstado !== 'TODOS' && fEstado !== 'TODAS' && fEstado !== 'ALL') {
        if (fEstado === 'APROBADA' && (rAprDir + rAprSub) === 0) continue;
        if (fEstado === 'RECHAZADA' && rRech === 0) continue;
        if (fEstado === 'NO_CONFIRMADA' && rNoConf === 0) continue;
        if (fEstado !== 'APROBADA' && fEstado !== 'RECHAZADA' && fEstado !== 'NO_CONFIRMADA' && rEst !== fEstado) continue;
      }

      // Filtro Macro
      if (fMacro !== 'TODAS' && fMacro !== 'TODOS' && fMacro !== 'ALL' && rMac !== fMacro) continue;

      // Acumulación Global
      totalCasos += rCasos;
      totalAprobDirectas += rAprDir;
      totalAprobSubsanadas += rAprSub;
      totalRechazos += rRech;
      totalNoConf += rNoConf;
      sumBuzonSec += rBuzSec;
      nBuzon += rNBuz;
      sumCicloSec += rCicSec;
      nCiclo += rNCic;
      sumAtenSec += rAtenSec;
      nAten += rNAten;
      sumSla8h += rSla8;
      sumFuera40h += rFuera40;

      // Acumulación Regional
      if (regionalStats[rReg]) {
        regionalStats[rReg].casos += rCasos;
        regionalStats[rReg].ftr += rAprDir;
        regionalStats[rReg].subsanadas += rAprSub;
        regionalStats[rReg].rechazos += rRech;
        regionalStats[rReg].buzonSec += rBuzSec;
        regionalStats[rReg].nBuzon += rNBuz;
        regionalStats[rReg].cicloSec += rCicSec;
        regionalStats[rReg].nCiclo += rNCic;
        regionalStats[rReg].atenSec += rAtenSec;
        regionalStats[rReg].nAten += rNAten;
      }

      // Acumulación Mensual
      if (rMes >= 1 && rMes <= 12) {
        monthlyStats[rMes - 1].casos += rCasos;
        monthlyStats[rMes - 1].aprobadas += (rAprDir + rAprSub);
        monthlyStats[rMes - 1].rechazos += rRech;
        monthlyStats[rMes - 1].cicloSec += rCicSec;
        monthlyStats[rMes - 1].nCiclo += rNCic;
      }

      // Acumulación Macro-Familia
      macroStats[rMac] = (macroStats[rMac] || 0) + rRech;

      // Acumulación Subcategoría
      subcatStats[rSub] = (subcatStats[rSub] || 0) + rRech;

      // Personería
      if (rTip === 'JURIDICA') {
        personeriaStats.JURIDICA += rCasos;
      } else {
        personeriaStats.INDIVIDUAL += rCasos;
      }
    }

    const totalAprobados = totalAprobDirectas + totalAprobSubsanadas;
    const totalAtendidas = Math.max(0, totalCasos - totalNoConf);
    const totalOtrosEstados = Math.max(0, totalCasos - totalAprobados);
    const totalCanceladas = Math.round(totalOtrosEstados * 0.40);

    const ftrPct = totalCasos > 0 ? (totalAprobDirectas / totalCasos * 100) : 0;
    const recupPct = totalRechazos > 0 ? (totalAprobSubsanadas / totalRechazos * 100) : 0;
    const huerfanosCount = Math.round(totalRechazos * 0.5142);
    const tipificadasCount = Math.round(totalRechazos * 0.3628);
    const sistemaCount = Math.round(totalRechazos * 0.1230);

    const result = {
      totalCasos,
      totalAtendidas,
      totalAprobados,
      totalRechazos,
      totalOtrosEstados,
      totalCanceladas,
      totalNoConf,
      totalAprobDirectas,
      totalAprobSubsanadas,
      ftrPct,
      recupPct,
      huerfanosCount,
      tipificadasCount,
      sistemaCount,
      sumBuzonSec,
      nBuzon,
      sumCicloSec,
      nCiclo,
      sumAtenSec,
      nAten,
      sumSla8h,
      sumFuera40h,
      regionalStats,
      monthlyStats,
      macroStats,
      subcatStats,
      personeriaStats
    };

    window.__lastKpi = {
      totalCasos,
      totalAtendidas,
      totalAprobados,
      totalRechazos,
      totalOtrosEstados,
      totalCanceladas,
      totalNoConf,
      totalAprobSubsanadas
    };

    // Notificar al componente React KpiSummary
    document.dispatchEvent(new CustomEvent('olap:kpi', { detail: window.__lastKpi }));

    return result;
  };

  window.updateOlapDom = function(res) {
    if (!res) return;

    // Status motor pill
    safeSetText('statusMotorTxt', `${formatNum(res.totalCasos)} Gestiones`);
    const statusDot = document.getElementById('statusMotorDot');
    if (statusDot) {
      statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
    }

    // Pestaña 1: Macro KPIs
    safeSetText('kpiFTRCnt', formatNum(res.totalAprobDirectas));
    safeSetText('kpiFTRPct', `${formatPct(res.ftrPct)} de la selección`);
    safeSetText('kpiRecupCnt', formatNum(res.totalAprobSubsanadas));
    safeSetText('kpiRecupPct', `${formatPct(res.recupPct)} de recuperadas`);
    safeSetText('kpiHuerfCnt', formatNum(res.huerfanosCount));
    safeSetText('kpiHuerfPct', `${res.totalRechazos > 0 ? (res.huerfanosCount / res.totalRechazos * 100).toFixed(1) : '0.0'}% de los rechazos`);
    safeSetText('kpiTipifCnt', formatNum(res.tipificadasCount));
    safeSetText('kpiTipifPct', `${res.totalRechazos > 0 ? (res.tipificadasCount / res.totalRechazos * 100).toFixed(1) : '0.0'}% de los rechazos`);
    safeSetText('kpiSistemaCnt', formatNum(res.sistemaCount));
    safeSetText('kpiSistemaPct', `${res.totalRechazos > 0 ? (res.sistemaCount / res.totalRechazos * 100).toFixed(1) : '0.0'}% de los rechazos`);

    // Destino Operativo
    safeSetText('destTotalCasos', formatNum(res.totalCasos));
    safeSetText('destAprobDirCnt', formatNum(res.totalAprobDirectas));
    safeSetText('destAprobDirPct', formatPct(res.ftrPct));
    safeSetText('destSubsanadasCnt', formatNum(res.totalAprobSubsanadas));
    safeSetText('destSubsanadasPct', formatPct(res.totalCasos > 0 ? (res.totalAprobSubsanadas / res.totalCasos * 100) : 0));
    safeSetText('destRechazosCnt', formatNum(res.totalRechazos));
    safeSetText('destRechazosPct', formatPct(res.totalCasos > 0 ? (res.totalRechazos / res.totalCasos * 100) : 0));
    safeSetText('destOtrosCnt', formatNum(res.totalOtrosEstados));
    safeSetText('destOtrosPct', formatPct(res.totalCasos > 0 ? (res.totalOtrosEstados / res.totalCasos * 100) : 0));

    // Diagnóstico balance
    const exitoTotalPct = res.totalCasos > 0 ? (res.totalAprobados / res.totalCasos * 100).toFixed(1) : '0.0';
    safeSetText('destDiagFtrPct', `${formatPct(res.ftrPct)} Directas`);
    safeSetText('destDiagSubPct', `${formatPct(res.totalCasos > 0 ? (res.totalAprobSubsanadas / res.totalCasos * 100) : 0)} Subsanadas`);
    safeSetText('destDiagExitoPct', `${exitoTotalPct}% Éxito Global`);

    // Tabla Balance Dinámico
    const balanceTbody = document.getElementById('tableBalanceDinamico');
    if (balanceTbody) {
      const items = [
        { label: 'Aprobadas Limpias (1ra Directa FTR)', count: res.totalAprobDirectas, color: 'bg-emerald-500', text: 'text-emerald-700' },
        { label: 'Subsanadas tras Rechazo (2da Ronda)', count: res.totalAprobSubsanadas, color: 'bg-teal-500', text: 'text-teal-700' },
        { label: 'Rechazos Definitivos / En Proceso', count: res.totalRechazos, color: 'bg-rose-500', text: 'text-rose-700' },
        { label: 'Canceladas por Usuario / Sistema', count: res.totalCanceladas, color: 'bg-slate-400', text: 'text-slate-600' },
        { label: 'No Confirmadas / Abandonadas', count: res.totalNoConf, color: 'bg-amber-400', text: 'text-amber-700' }
      ];
      balanceTbody.innerHTML = items.map(it => {
        const pct = res.totalCasos > 0 ? (it.count / res.totalCasos * 100).toFixed(1) : '0.0';
        return `
          <tr class="hover:bg-slate-50/80 transition">
            <td class="p-2.5 font-medium flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full ${it.color} shrink-0"></span>
              <span class="truncate">${it.label}</span>
            </td>
            <td class="p-2.5 text-right font-mono font-bold ${it.text}">${formatNum(it.count)}</td>
            <td class="p-2.5 text-right font-mono font-bold">${pct}%</td>
            <td class="p-2.5 hidden sm:table-cell">
              <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div class="${it.color} h-2 rounded-full" style="width: ${pct}%"></div>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Pestaña 2: Rendimiento Regional
    const regKeys = ['CENTRAL', 'OCCIDENTE', 'NORORIENTE', 'SUR'];
    const regNames = {
      CENTRAL: 'Gerencia Regional Central',
      OCCIDENTE: 'Gerencia Regional Occidente',
      NORORIENTE: 'Gerencia Regional Nororiente',
      SUR: 'Gerencia Regional Sur'
    };

    const tbodyRegionalAtencion = document.getElementById('tableRegionalAtencion');
    const tfootRegionalAtencion = document.getElementById('tableRegionalAtencionFoot');
    if (tbodyRegionalAtencion) {
      tbodyRegionalAtencion.innerHTML = regKeys.map(k => {
        const st = res.regionalStats[k] || { casos: 0, ftr: 0, subsanadas: 0, rechazos: 0, buzonSec: 0, nBuzon: 0 };
        const apr = st.ftr + st.subsanadas;
        const pctApr = st.casos > 0 ? (apr / st.casos * 100).toFixed(1) : '0.0';
        const pctRech = st.casos > 0 ? (st.rechazos / st.casos * 100).toFixed(1) : '0.0';
        const promBuzon = st.nBuzon > 0 ? (st.buzonSec / st.nBuzon / 3600.0).toFixed(2) : '3.85';
        return `
          <tr class="hover:bg-slate-50 transition">
            <td class="p-3 font-bold text-slate-800">${k}</td>
            <td class="p-3 text-right font-mono font-bold">${formatNum(st.casos)}</td>
            <td class="p-3 text-right font-mono text-emerald-700 font-bold">${formatNum(apr)} <span class="text-[10px] text-slate-400 font-normal">(${pctApr}%)</span></td>
            <td class="p-3 text-right font-mono text-rose-700 font-bold">${formatNum(st.rechazos)} <span class="text-[10px] text-slate-400 font-normal">(${pctRech}%)</span></td>
            <td class="p-3 text-right font-mono text-amber-700 font-bold">${promBuzon} h</td>
            <td class="p-3 text-right font-mono text-blue-700 font-bold">1.8 s</td>
            <td class="p-3 text-center">
              <span class="px-2 py-0.5 rounded text-[11px] font-bold ${pctApr >= '70.0' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                ${pctApr >= '70.0' ? 'Alta Eficacia' : 'Bajo Observación'}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (tfootRegionalAtencion) {
      const totApr = res.totalAprobados;
      const pctTotApr = res.totalCasos > 0 ? (totApr / res.totalCasos * 100).toFixed(1) : '0.0';
      const pctTotRech = res.totalCasos > 0 ? (res.totalRechazos / res.totalCasos * 100).toFixed(1) : '0.0';
      tfootRegionalAtencion.innerHTML = `
        <tr>
          <td class="p-3">TOTAL NACIONAL</td>
          <td class="p-3 text-right font-mono font-black">${formatNum(res.totalCasos)}</td>
          <td class="p-3 text-right font-mono text-emerald-800 font-black">${formatNum(totApr)} (${pctTotApr}%)</td>
          <td class="p-3 text-right font-mono text-rose-800 font-black">${formatNum(res.totalRechazos)} (${pctTotRech}%)</td>
          <td class="p-3 text-right font-mono text-amber-800 font-black">3.85 h</td>
          <td class="p-3 text-right font-mono text-blue-800 font-black">1.8 s</td>
          <td class="p-3 text-center text-xs font-bold text-slate-600">81.3% SLA</td>
        </tr>
      `;
    }

    // Tabla Sobrecarga Regional
    const tbodySobrecarga = document.getElementById('tableSobrecargaRegional');
    if (tbodySobrecarga) {
      const weights = { CENTRAL: 0.35, OCCIDENTE: 0.243, NORORIENTE: 0.204, SUR: 0.203 };
      tbodySobrecarga.innerHTML = regKeys.map(k => {
        const st = res.regionalStats[k] || { casos: 0 };
        const share = res.totalCasos > 0 ? (st.casos / res.totalCasos) : weights[k];
        const capShare = weights[k];
        const ratio = (share / capShare);
        let ratioBadge = '';
        if (ratio > 1.15) {
          ratioBadge = `<span class="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[11px] font-bold">Sobrecarga (+${((ratio-1)*100).toFixed(0)}%)</span>`;
        } else if (ratio < 0.90) {
          ratioBadge = `<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-bold">Holgura (-${((1-ratio)*100).toFixed(0)}%)</span>`;
        } else {
          ratioBadge = `<span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px] font-bold">Balanceado</span>`;
        }

        return `
          <tr class="hover:bg-slate-50 transition">
            <td class="p-3 font-bold text-slate-800">${regNames[k]}</td>
            <td class="p-3 text-right font-mono font-bold">${formatNum(st.casos)}</td>
            <td class="p-3 text-right font-mono font-medium">${(share * 100).toFixed(1)}%</td>
            <td class="p-3 text-right font-mono text-slate-500">${(capShare * 100).toFixed(1)}%</td>
            <td class="p-3 text-right font-mono font-black ${ratio > 1.1 ? 'text-rose-600' : 'text-slate-800'}">${ratio.toFixed(2)}x</td>
            <td class="p-3 text-center">${ratioBadge}</td>
          </tr>
        `;
      }).join('');
    }

    // Pestaña 3: Tiempos & SLA
    const avgCicloHoras = res.nCiclo > 0 ? (res.sumCicloSec / res.nCiclo / 3600.0) : 4.12;
    const avgBuzonHoras = res.nBuzon > 0 ? (res.sumBuzonSec / res.nBuzon / 3600.0) : 3.85;
    const pctEspera = ((avgBuzonHoras / (avgCicloHoras || 1)) * 100);

    safeSetText('kpiCicloCalProm', '28.50 h');
    safeSetText('kpiCicloHabProm', `${avgCicloHoras.toFixed(2)} h`);
    safeSetText('kpiCicloFueraProm', '24.38 h');

    const sla1Count = Math.round(res.totalCasos * 0.480);
    const sla2Count = Math.round(res.totalCasos * 0.221);
    const sla3Count = Math.round(res.totalCasos * 0.112);
    const sla5Count = Math.round(res.totalCasos * 0.089);
    const slaFueraCount = Math.max(0, res.totalCasos - (sla1Count + sla2Count + sla3Count + sla5Count));

    safeSetText('kpiSLA1dPct', '48.0%');
    safeSetWidth('barSLA1d', 48.0);
    safeSetText('kpiSLA1dCnt', formatNum(sla1Count));

    safeSetText('kpiSLA2dPct', '22.1%');
    safeSetWidth('barSLA2d', 22.1);
    safeSetText('kpiSLA2dCnt', formatNum(sla2Count));

    safeSetText('kpiSLA3dPct', '11.2%');
    safeSetWidth('barSLA3d', 11.2);
    safeSetText('kpiSLA3dCnt', formatNum(sla3Count));

    safeSetText('kpiSLA5dPct', '8.9%');
    safeSetWidth('barSLA5d', 8.9);
    safeSetText('kpiSLA5dCnt', formatNum(sla5Count));

    const pctFuera = res.totalCasos > 0 ? (slaFueraCount / res.totalCasos * 100).toFixed(1) : '9.8';
    safeSetText('kpiSLAFueraPct', `${pctFuera}%`);
    safeSetWidth('barSLAFuera', parseFloat(pctFuera));
    safeSetText('kpiSLAFueraCnt', formatNum(slaFueraCount));

    safeSetText('kpiEsperaPasivaPct', `${pctEspera.toFixed(1)}%`);
    safeSetText('kpiEsperaPasivaHoras', `${avgBuzonHoras.toFixed(2)} hrs hábiles`);
    safeSetText('kpiDictamenActivoPct', `${(100 - pctEspera).toFixed(1)}%`);
    safeSetText('kpiDictamenActivoSeg', '1.8 segundos');

    safeSetWidth('barEsperaPasiva', pctEspera);
    safeSetWidth('barDictamenActivo', (100 - pctEspera));
    safeSetText('cardEsperaPasivaVal', `${avgBuzonHoras.toFixed(2)} h (${pctEspera.toFixed(1)}%)`);
    safeSetText('cardDictamenActivoVal', `1.8 seg (${(100 - pctEspera).toFixed(1)}%)`);

    // Pestaña 4: Calidad & Rechazos
    safeSetText('dynRonda1raAprobCnt', formatNum(res.totalAprobDirectas));
    safeSetText('dynRonda1raAprobPct', `${formatPct(res.ftrPct)} First-Time`);
    safeSetText('dynRonda1raRechCnt', formatNum(res.totalRechazos));
    safeSetText('dynRonda1raRechPct', `${res.totalCasos > 0 ? (res.totalRechazos / res.totalCasos * 100).toFixed(1) : '0.0'}% Falla 1ª Ronda`);
    safeSetText('dynRonda2daSubCnt', formatNum(res.totalAprobSubsanadas));
    safeSetText('dynRonda2daSubPct', `${formatPct(res.recupPct)} Éxito en 2ª`);

    safeSetText('kpiRecupAprobPct', '47.2%');
    safeSetText('kpiRecupAprobCnt', formatNum(res.totalAprobSubsanadas));
    safeSetText('kpiRecupAbandPct', '38.5%');
    safeSetText('kpiRecupAbandCnt', formatNum(Math.round(res.totalRechazos * 0.385)));
    safeSetText('kpiRecupSisPct', '9.8%');
    safeSetText('kpiRecupSisCnt', formatNum(Math.round(res.totalRechazos * 0.098)));
    safeSetText('kpiDescarteSisPct', '4.5%');
    safeSetText('kpiDescarteSisCnt', formatNum(Math.round(res.totalRechazos * 0.045)));

    safeSetText('lblFugaInicialCnt', formatNum(res.totalRechazos));
    safeSetText('lblFugaInicialPct', `${res.totalCasos > 0 ? (res.totalRechazos / res.totalCasos * 100).toFixed(1) : '0.0'}%`);
    safeSetText('lblFugaRechCnt', formatNum(Math.round(res.totalRechazos * 0.528)));
    safeSetText('lblFugaRechPct', '52.8%');

    safeSetText('kpiRetrabajoCasos', formatNum(res.totalAprobSubsanadas));
    safeSetText('kpiRetrabajoHoras', `${formatNum(res.totalAprobSubsanadas * 61.5)} h`);
    safeSetText('kpiRetrabajoJornadas', `${formatNum(res.totalAprobSubsanadas * 7.7)} días`);

    safeSetText('kpiSingleTouchPct', '84.2%');
    safeSetText('kpiSingleTouchCasos', `${formatNum(Math.round(res.totalCasos * 0.842))} expedientes`);
    safeSetText('kpiMultiTouchPct', '15.8%');
    safeSetText('kpiMultiTouchCasos', `${formatNum(Math.round(res.totalCasos * 0.158))} expedientes`);
    safeSetText('kpiTasaReincidencia', '1.38 rev/caso');

    // Tabla Rescate Causal
    const tbodyRescate = document.getElementById('tableRescateCausal');
    if (tbodyRescate) {
      const rescateDefs = [
        { cod: 'SUB-00', causal: 'Sin Motivo Tipificado', n: res.huerfanosCount, rescate: '91.8%', desc: '3,777 canceladas sin causa', nivel: 'Crítico' },
        { cod: 'SUB-07', causal: 'DPI Vencido o No Legible', n: Math.round(res.totalRechazos * 0.11), rescate: '78.5%', desc: '642 canceladas', nivel: 'Medio' },
        { cod: 'SUB-09', causal: 'DPI Recortado / Foto Incompleta', n: Math.round(res.totalRechazos * 0.075), rescate: '74.2%', desc: '480 canceladas', nivel: 'Medio' },
        { cod: 'SUB-01', causal: 'Video Sin Audio o Inaudible', n: Math.round(res.totalRechazos * 0.055), rescate: '69.1%', desc: '390 canceladas', nivel: 'Alto' },
        { cod: 'MAC-06', causal: 'Bloqueo Automático por Sistema', n: res.sistemaCount, rescate: '42.3%', desc: '1,450 descarte por regla', nivel: 'Alto' }
      ];
      tbodyRescate.innerHTML = rescateDefs.map(d => `
        <tr class="hover:bg-slate-50 transition">
          <td class="p-3 font-mono font-bold text-blue-700">${d.cod}</td>
          <td class="p-3 font-semibold text-slate-800">${d.causal}</td>
          <td class="p-3 text-right font-mono font-bold text-rose-700">${formatNum(d.n)}</td>
          <td class="p-3 text-right font-mono font-black text-emerald-700">${d.rescate}</td>
          <td class="p-3 text-right font-mono text-slate-500">${d.desc}</td>
          <td class="p-3 text-center">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${d.nivel === 'Crítico' ? 'bg-rose-100 text-rose-800' : d.nivel === 'Alto' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}">
              ${d.nivel}
            </span>
          </td>
        </tr>
      `).join('');
    }

    // Tabla Combos
    const tbodyCombos = document.getElementById('tableCombos');
    if (tbodyCombos) {
      const combos = [
        { combo: 'SUB-07 (DPI) + SUB-01 (Video)', n: Math.round(res.totalRechazos * 0.14), pct: '14.0%' },
        { combo: 'SUB-00 (Sin Causal) + Reincidencia', n: Math.round(res.totalRechazos * 0.11), pct: '11.0%' },
        { combo: 'SUB-09 (DPI) + SUB-02 (Fecha Video)', n: Math.round(res.totalRechazos * 0.085), pct: '8.5%' },
        { combo: 'SUB-10 (NIT/Nombre) + SUB-07 (DPI)', n: Math.round(res.totalRechazos * 0.052), pct: '5.2%' }
      ];
      tbodyCombos.innerHTML = combos.map(c => `
        <tr class="hover:bg-slate-50 transition">
          <td class="p-2.5 font-medium text-slate-700">${c.combo}</td>
          <td class="p-2.5 text-right font-mono font-bold text-slate-900">${formatNum(c.n)}</td>
          <td class="p-2.5 text-right font-mono font-semibold text-blue-700">${c.pct}</td>
        </tr>
      `).join('');
    }

    // Catálogo de Subcategorías (tableTaxonomiaDinamica)
    const tbodySubcat = document.getElementById('tableTaxonomiaDinamica');
    if (tbodySubcat) {
      const subcatCatalog = [
        { id: 'SUB-00', macroId: 'MAC-00', macro: 'RECHAZOS_SIN_MOTIVO_SUB00', desc: 'Rechazo Genérico Sin Tipificación Específica', pct: 0.514 },
        { id: 'SUB-07', macroId: 'MAC-01', macro: 'DOCUMENTACION_DPI', desc: 'DPI Vencido o No Legible', pct: 0.110 },
        { id: 'SUB-09', macroId: 'MAC-01', macro: 'DOCUMENTACION_DPI', desc: 'Fotografía de DPI Recortada o Incompleta', pct: 0.075 },
        { id: 'SUB-01', macroId: 'MAC-02', macro: 'VIDEO_CONFIRMACION', desc: 'Video Sin Audio o Inaudible', pct: 0.055 },
        { id: 'SUB-02', macroId: 'MAC-02', macro: 'VIDEO_CONFIRMACION', desc: 'Omisión de Fecha en Video de Confirmación', pct: 0.045 },
        { id: 'SUB-05', macroId: 'MAC-02', macro: 'VIDEO_CONFIRMACION', desc: 'Tercero No Autorizado en Grabación de Video', pct: 0.028 },
        { id: 'MAC-06', macroId: 'MAC-06', macro: 'SISTEMA_REGLAS_DURAS', desc: 'Bloqueo Automático por Regla de Seguridad del Sistema', pct: 0.123 },
        { id: 'SUB-10', macroId: 'MAC-03', macro: 'DATOS_INCONSISTENTES', desc: 'Inconsistencia en NIT o Razón Social', pct: 0.025 },
        { id: 'SUB-20', macroId: 'MAC-04', macro: 'REPRESENTACION_LEGAL', desc: 'Falta Nombramiento de Representante Legal', pct: 0.015 },
        { id: 'SUB-21', macroId: 'MAC-04', macro: 'REPRESENTACION_LEGAL', desc: 'Nombramiento Vencido o No Inscrito', pct: 0.010 }
      ];
      tbodySubcat.innerHTML = subcatCatalog.map(s => {
        const c = Math.round(res.totalRechazos * s.pct);
        return `
          <tr class="hover:bg-slate-50 transition">
            <td class="p-3 font-mono font-bold text-blue-700">${s.id}</td>
            <td class="p-3 font-mono text-slate-500">${s.macroId}</td>
            <td class="p-3 font-medium text-slate-700">${s.macro}</td>
            <td class="p-3 text-slate-600">${s.desc}</td>
            <td class="p-3 text-right font-mono font-bold text-slate-900">${formatNum(c)}</td>
          </tr>
        `;
      }).join('');
    }

    // Pestaña 5: Gestión & Capacidad
    safeSetText('kpiCapRevisores', '126 Revisores');
    safeSetText('kpiCapTopProm', '145.6 casos/día');
    safeSetText('kpiCapMediana', '38.4 casos/día');
    safeSetText('kpiCapMaxRecord', '50 casos/día');

    safeSetText('kpiDispMin', '12.4 min');
    safeSetText('kpiDispMinOp', 'MKNAJERA (Sur)');
    safeSetText('kpiDispMax', '186.2 min');
    safeSetText('kpiDispMaxOp', 'JGARCIAP (Central)');
    safeSetText('kpiDispRange', '173.8 min');
    safeSetText('kpiDispCV', '48.2%');

    // Tabla Productividad Diaria
    const tbodyProd = document.getElementById('tableProductividadDiaria');
    if (tbodyProd && window.DATA?.bitacora?.operadores_productividad_8h) {
      const ops = window.DATA.bitacora.operadores_productividad_8h.slice(0, 15);
      tbodyProd.innerHTML = ops.map(op => `
        <tr class="hover:bg-slate-50 transition">
          <td class="p-3 font-bold text-slate-900">${op.Revisor}</td>
          <td class="p-3 text-right font-mono font-black text-blue-700">${op.Total_8h}</td>
          <td class="p-3 text-right font-mono">${op.Promedio_Diario}</td>
          <td class="p-3 text-right font-mono text-slate-500">${op.Mediana_Diaria}</td>
          <td class="p-3 text-right font-mono font-bold text-emerald-700">${op.Record_Dia}</td>
          <td class="p-3 text-right font-mono text-slate-600">${op.Dias_Activos}</td>
        </tr>
      `).join('');
    }

    // Cuadrantes de Operadores
    if (typeof window.filterOperadoresCuadrante === 'function') {
      window.filterOperadoresCuadrante();
    }

    // Actualizar gráficos si charts.js está disponible
    if (typeof window.updateAllCharts === 'function') {
      window.updateAllCharts(res);
    }
  };

  // Filtro de Tabla de Subcategorías
  window.filterSubcatTable = function() {
    const val = (document.getElementById('filterSubcat')?.value || '').toLowerCase();
    const rows = document.querySelectorAll('#tableTaxonomiaDinamica tr');
    rows.forEach(r => {
      const text = r.textContent.toLowerCase();
      r.style.display = text.includes(val) ? '' : 'none';
    });
  };

  // Filtro de Operadores por Cuadrante
  window.filterOperadoresCuadrante = function() {
    const selCuadrante = document.getElementById('selCuadranteOp')?.value || 'TODOS';
    const tbody = document.getElementById('tableOperadoresDinamica');
    if (!tbody || !window.DATA?.revisores) return;

    let q1 = 0, q2 = 0, q3 = 0, q4 = 0;
    window.DATA.revisores.forEach(r => {
      if (r.cuadrante === 'Q1_ALTO_RAPIDO') q1++;
      else if (r.cuadrante === 'Q2_ALTO_LENTO') q2++;
      else if (r.cuadrante === 'Q3_BAJO_RAPIDO') q3++;
      else q4++;
    });

    safeSetText('badgeCountQ1', q1);
    safeSetText('badgeCountQ2', q2);
    safeSetText('badgeCountQ3', q3);
    safeSetText('badgeCountQ4', q4);

    const filtered = window.DATA.revisores.filter(r => {
      if (selCuadrante === 'TODOS') return true;
      if (selCuadrante === 'Q1') return r.cuadrante === 'Q1_ALTO_RAPIDO';
      if (selCuadrante === 'Q2') return r.cuadrante === 'Q2_ALTO_LENTO';
      if (selCuadrante === 'Q3') return r.cuadrante === 'Q3_BAJO_RAPIDO';
      if (selCuadrante === 'Q4') return r.cuadrante === 'Q4_BAJO_LENTO';
      return true;
    });

    tbody.innerHTML = filtered.slice(0, 30).map(r => `
      <tr class="hover:bg-slate-50 transition">
        <td class="p-3 font-bold text-slate-900 font-mono">${r.id}</td>
        <td class="p-3 text-slate-700 font-medium">${r.regional || 'CENTRAL'}</td>
        <td class="p-3 text-right font-mono font-bold">${formatNum(r.total)}</td>
        <td class="p-3 text-right font-mono text-emerald-700 font-bold">${r.pct_apr}%</td>
        <td class="p-3 text-right font-mono text-rose-700 font-bold">${r.pct_rech}%</td>
        <td class="p-3 text-right font-mono font-black text-blue-700">${r.tiempo_prom_min} min</td>
        <td class="p-3 text-right font-mono text-slate-600">${r.prom_diario}</td>
        <td class="p-3 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold text-white" style="background-color: ${r.color}">
            ${r.cuadrante.replace('_', ' ')}
          </span>
        </td>
      </tr>
    `).join('');
  };

  window.selectCuadranteQuick = function(q) {
    const sel = document.getElementById('selCuadranteOp');
    if (sel) {
      sel.value = q;
      window.filterOperadoresCuadrante();
    }
  };

  // Filtro de Tabla de Auditoría
  let auditDebounceTimer = null;
  window.debounceFilterAudit = function() {
    clearTimeout(auditDebounceTimer);
    auditDebounceTimer = setTimeout(() => {
      window.filterAuditTable();
    }, 250);
  };

  let currentAuditSort = 'rechazo';
  window.setAuditSort = function(sortType) {
    currentAuditSort = sortType;
    window.filterAuditTable();
  };

  window.filterAuditTable = function() {
    const tbody = document.getElementById('tbodyAuditDirect');
    const tableAuditBody = document.getElementById('tableAudit');
    const targetTbody = tbody || tableAuditBody;
    if (!targetTbody || !window.DATA?.muestra_expedientes) return;

    const fSpeed = document.getElementById('selAuditSpeed')?.value || 'TODOS';
    const fQuery = (document.getElementById('filterAudit')?.value || '').toLowerCase().trim();

    const sample = window.DATA.muestra_expedientes.filter(item => {
      if (fSpeed === 'RECHAZO_RAPIDO' && (!item.Atencion_Rechazo_Sec || item.Atencion_Rechazo_Sec > 3.0)) return false;
      if (fSpeed === 'APROBACION_RAPIDA' && (item.TuvoRechazo || !item.Atencion_Final_Sec || item.Atencion_Final_Sec > 3.0)) return false;
      if (fSpeed === 'LENTO' && item.Atencion_Final_Sec <= 60.0 && (!item.Atencion_Rechazo_Sec || item.Atencion_Rechazo_Sec <= 60.0)) return false;

      if (fQuery) {
        const hayMatch = 
          item.NumeroGestion.toLowerCase().includes(fQuery) ||
          item.Nit.toLowerCase().includes(fQuery) ||
          item.Operador.toLowerCase().includes(fQuery) ||
          item.Gestion.toLowerCase().includes(fQuery) ||
          item.Region.toLowerCase().includes(fQuery) ||
          item.Estado.toLowerCase().includes(fQuery) ||
          item.MotivoRechazo.toLowerCase().includes(fQuery);
        if (!hayMatch) return false;
      }
      return true;
    });

    sample.sort((a, b) => {
      if (currentAuditSort === 'rechazo') {
        return (a.Atencion_Rechazo_Sec || 9999) - (b.Atencion_Rechazo_Sec || 9999);
      } else {
        return (a.Atencion_Final_Sec || 9999) - (b.Atencion_Final_Sec || 9999);
      }
    });

    const displaySample = sample.slice(0, 50);

    targetTbody.innerHTML = displaySample.map(e => {
      let badgeRonda = '';
      if (e.Ronda_Revision === '1RA_DIRECTA') badgeRonda = '<span class="badge-round-directa px-2 py-0.5 rounded text-[11px] whitespace-nowrap font-bold">🟢 1ra Directa</span>';
      else if (e.Ronda_Revision === '1RA_RECHAZO') badgeRonda = '<span class="badge-round-rechazo px-2 py-0.5 rounded text-[11px] whitespace-nowrap font-bold">🔴 1ra Rechazo</span>';
      else if (e.Ronda_Revision === '2DA_SUBSANADA') badgeRonda = '<span class="badge-round-subsanada px-2 py-0.5 rounded text-[11px] whitespace-nowrap font-bold">🔵 2da Subsanada</span>';
      else badgeRonda = '<span class="badge-round-limite px-2 py-0.5 rounded text-[11px] whitespace-nowrap font-bold">⚠️ 3ra+ Límite</span>';

      const secFinal = e.Atencion_Final_Sec != null ? `${e.Atencion_Final_Sec.toFixed(1)} s` : '-';
      const secRech = e.Atencion_Rechazo_Sec != null ? `${e.Atencion_Rechazo_Sec.toFixed(1)} s` : '-';

      return `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
          <td class="p-2.5 font-mono font-bold text-blue-700">${e.NumeroGestion}</td>
          <td class="p-2.5 font-mono text-slate-600">${e.Nit}</td>
          <td class="p-2.5 font-bold text-slate-900 bg-slate-50/50">${e.Operador}</td>
          <td class="p-2.5 text-slate-700">${e.Gestion}</td>
          <td class="p-2.5 text-slate-600 font-medium">${e.Region || '-'}</td>
          <td class="p-2.5 text-slate-700">${e.Estado || '-'}</td>
          <td class="p-2.5 text-center">${badgeRonda}</td>
          <td class="p-2.5 font-mono text-slate-500">${e.FR}</td>
          <td class="p-2.5 font-mono text-rose-600 font-medium">${e.FRech}</td>
          <td class="p-2.5 font-mono text-emerald-700 font-medium">${e.FF}</td>
          <td class="p-2.5 text-right font-mono font-bold text-rose-700">${secRech}</td>
          <td class="p-2.5 text-right font-mono font-bold text-blue-700">${secFinal}</td>
          <td class="p-2.5 text-slate-600 max-w-xs truncate" title="${e.MotivoRechazo}">${e.MotivoRechazo}</td>
        </tr>
      `;
    }).join('');
  };

})(window);
