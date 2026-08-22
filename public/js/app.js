// Controlador Principal y Renderizador de la Aplicación
let dtAuditMainInstance = null;

function initSelectors() {
    const selMes = document.getElementById('selMes');
    DATA.opciones.meses.forEach(m => { selMes.innerHTML += `<option value="${m}">${m}</option>`; });

    const selReg = document.getElementById('selRegion');
    DATA.opciones.regiones.forEach(r => { selReg.innerHTML += `<option value="${r}">${r}</option>`; });

    const selEst = document.getElementById('selEstado');
    DATA.opciones.estados.forEach(e => { selEst.innerHTML += `<option value="${e}">${e}</option>`; });

    const selMac = document.getElementById('selMacro');
    DATA.opciones.macro_familias.forEach(m => { selMac.innerHTML += `<option value="${m}">${m}</option>`; });
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-pill, .tab-btn').forEach(el => el.classList.remove('active'));
    
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
        targetContent.classList.remove('hidden');
    }
    
    const btnMap = {
        'tab-macro': 'btn-macro',
        'tab-operativo': 'btn-operativo',
        'tab-tiempos': 'btn-tiempos',
        'tab-calidad': 'btn-calidad',
        'tab-gestion': 'btn-gestion',
        'tab-auditoria': 'btn-auditoria'
    };
    
    const btnId = btnMap[tabId];
    if (btnId) {
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.add('active');
    }
    
    if (window.lucide) lucide.createIcons();
    
    if (tabId === 'tab-gestion' && typeof dtAuditMainInstance !== 'undefined' && dtAuditMainInstance) {
        dtAuditMainInstance.columns.adjust().draw();
    }
}

function resetFilters() {
    document.getElementById('selGestion').value = 'HUMANAS';
    document.getElementById('selAnio').value = 'TODOS';
    document.getElementById('selMes').value = 'TODOS';
    document.getElementById('selRegion').value = 'TODAS';
    document.getElementById('selEstado').value = 'TODOS';
    document.getElementById('selMacro').value = 'TODAS';
    applyFilters();
}

function applyFilters() {
    const fGes = document.getElementById('selGestion').value;
    const fAnio = document.getElementById('selAnio').value;
    const fMes = document.getElementById('selMes').value;
    const fReg = document.getElementById('selRegion').value;
    const fEst = document.getElementById('selEstado').value;
    const fMac = document.getElementById('selMacro').value;

    const res = processOlapFilters(DATA.cubo, fGes, fAnio, fMes, fReg, fEst, fMac);

    // 1. Pestaña 1
    document.getElementById('kpiUniverso').innerText = res.totalCasos.toLocaleString();
    document.getElementById('kpiAprobados').innerText = res.totalAprobados.toLocaleString();
    document.getElementById('kpiTasaAprobacion').innerText = res.totalCasos > 0 ? ((res.totalAprobados/res.totalCasos)*100).toFixed(1) + '%' : '0%';
    document.getElementById('kpiRechazos').innerText = res.totalRechazos.toLocaleString();
    document.getElementById('kpiTasaRechazo').innerText = res.totalCasos > 0 ? ((res.totalRechazos/res.totalCasos)*100).toFixed(1) + '%' : '0%';

    const secCreacionAtenHab = res.nCreacionAtenHab > 0 ? (res.sumCreacionAtenHab / res.nCreacionAtenHab) : 0;
    const secCicloHab = res.nCicloHab > 0 ? (res.sumCicloHab / res.nCicloHab) : 0;
    const secCicloCal = res.nCicloCal > 0 ? (res.sumCicloCal / res.nCicloCal) : 0;
    
    document.getElementById('kpiTiempoAtencion').innerText = formatAdaptiveTime(secCreacionAtenHab);
    document.getElementById('lblTiempoAtencionCal').innerText = 'Promedio Hábil Real';
    document.getElementById('kpiCicloHab').innerText = formatAdaptiveTime(secCicloHab);
    document.getElementById('lblCicloCal').innerText = 'Calendario: ' + formatAdaptiveTime(secCicloCal);

    const tbBal = document.getElementById('tableBalanceDinamico');
    tbBal.innerHTML = '';
    Object.keys(res.estCounts).sort((a,b) => res.estCounts[b] - res.estCounts[a]).forEach(est => {
        const cnt = res.estCounts[est];
        const pct = res.totalCasos > 0 ? ((cnt / res.totalCasos)*100).toFixed(2) : 0;
        tbBal.innerHTML += `<tr>
            <td class="p-2.5 font-medium text-slate-800">${est}</td>
            <td class="p-2.5 text-right font-mono text-slate-600">${cnt.toLocaleString()}</td>
            <td class="p-2.5 text-right font-bold text-blue-700">${pct}%</td>
        </tr>`;
    });

    // 2. Pestaña 2
    const activeMonths = DATA.meses_lista.filter(m => res.monthMap[m]);
    const mAtenTrend = activeMonths.map(m => res.monthMap[m].nAten > 0 ? parseFloat((res.monthMap[m].sumAten / res.monthMap[m].nAten / 3600.0).toFixed(2)) : 0);
    const mCasosTrend = activeMonths.map(m => res.monthMap[m].casos);

    const buzonCentral = activeMonths.map(m => (res.monthRegMap['CENTRAL'][m] && res.monthRegMap['CENTRAL'][m].nBuzon > 0) ? parseFloat((res.monthRegMap['CENTRAL'][m].sumBuzon / res.monthRegMap['CENTRAL'][m].nBuzon / 3600.0).toFixed(2)) : null);
    const buzonOccidente = activeMonths.map(m => (res.monthRegMap['OCCIDENTE'][m] && res.monthRegMap['OCCIDENTE'][m].nBuzon > 0) ? parseFloat((res.monthRegMap['OCCIDENTE'][m].sumBuzon / res.monthRegMap['OCCIDENTE'][m].nBuzon / 3600.0).toFixed(2)) : null);
    const buzonSur = activeMonths.map(m => (res.monthRegMap['SUR'][m] && res.monthRegMap['SUR'][m].nBuzon > 0) ? parseFloat((res.monthRegMap['SUR'][m].sumBuzon / res.monthRegMap['SUR'][m].nBuzon / 3600.0).toFixed(2)) : null);
    const buzonNororiente = activeMonths.map(m => (res.monthRegMap['NORORIENTE'][m] && res.monthRegMap['NORORIENTE'][m].nBuzon > 0) ? parseFloat((res.monthRegMap['NORORIENTE'][m].sumBuzon / res.monthRegMap['NORORIENTE'][m].nBuzon / 3600.0).toFixed(2)) : null);

    if (chartLineBuzonRegInst) {
        chartLineBuzonRegInst.data.labels = activeMonths;
        chartLineBuzonRegInst.data.datasets[0].data = buzonCentral;
        chartLineBuzonRegInst.data.datasets[1].data = buzonOccidente;
        chartLineBuzonRegInst.data.datasets[2].data = buzonSur;
        chartLineBuzonRegInst.data.datasets[3].data = buzonNororiente;
        chartLineBuzonRegInst.update();
    }

    const bolsonCentral = activeMonths.map(m => (res.monthRegMap['CENTRAL'][m] && res.monthRegMap['CENTRAL'][m].nBolson > 0) ? parseFloat((res.monthRegMap['CENTRAL'][m].sumBolson / res.monthRegMap['CENTRAL'][m].nBolson / 60.0).toFixed(1)) : null);
    const bolsonOccidente = activeMonths.map(m => (res.monthRegMap['OCCIDENTE'][m] && res.monthRegMap['OCCIDENTE'][m].nBolson > 0) ? parseFloat((res.monthRegMap['OCCIDENTE'][m].sumBolson / res.monthRegMap['OCCIDENTE'][m].nBolson / 60.0).toFixed(1)) : null);
    const bolsonSur = activeMonths.map(m => (res.monthRegMap['SUR'][m] && res.monthRegMap['SUR'][m].nBolson > 0) ? parseFloat((res.monthRegMap['SUR'][m].sumBolson / res.monthRegMap['SUR'][m].nBolson / 60.0).toFixed(1)) : null);
    const bolsonNororiente = activeMonths.map(m => (res.monthRegMap['NORORIENTE'][m] && res.monthRegMap['NORORIENTE'][m].nBolson > 0) ? parseFloat((res.monthRegMap['NORORIENTE'][m].sumBolson / res.monthRegMap['NORORIENTE'][m].nBolson / 60.0).toFixed(1)) : null);

    if (chartLineBolsonRegInst) {
        chartLineBolsonRegInst.data.labels = activeMonths;
        chartLineBolsonRegInst.data.datasets[0].data = bolsonCentral;
        chartLineBolsonRegInst.data.datasets[1].data = bolsonOccidente;
        chartLineBolsonRegInst.data.datasets[2].data = bolsonSur;
        chartLineBolsonRegInst.data.datasets[3].data = bolsonNororiente;
        chartLineBolsonRegInst.update();
    }

    if (chartComboTrendInst) {
        chartComboTrendInst.data.labels = activeMonths;
        chartComboTrendInst.data.datasets[0].data = mCasosTrend;
        chartComboTrendInst.data.datasets[1].data = mAtenTrend;
        chartComboTrendInst.update();
    }

    const tbRegD = document.getElementById('tableRegionalDinamica');
    tbRegD.innerHTML = '';
    ['CENTRAL', 'OCCIDENTE', 'SUR', 'NORORIENTE'].forEach(regName => {
        const r = res.regMap[regName];
        const pctAp = r.casos > 0 ? ((r.aprob / r.casos)*100).toFixed(1) : '0.0';
        const pctRe = r.casos > 0 ? ((r.rech / r.casos)*100).toFixed(1) : '0.0';
        const secBuz = r.nBuzon > 0 ? (r.sumBuzon / r.nBuzon) : 0;
        const secBol = r.nBolson > 0 ? (r.sumBolson / r.nBolson) : 0;
        const secAte = r.nAte > 0 ? (r.sumAte / r.nAte) : 0;
        const secCic = r.nCiclo > 0 ? (r.sumCiclo / r.nCiclo) : 0;
        const sla1Pct = r.nCiclo > 0 ? ((r.sla1d / r.nCiclo)*100).toFixed(1) : '0.0';

        tbRegD.innerHTML += `<tr>
            <td class="p-3 font-bold text-slate-900">${regName}</td>
            <td class="p-3 text-right font-mono text-slate-600">${r.casos.toLocaleString()}</td>
            <td class="p-3 text-right font-bold text-emerald-700 bg-emerald-50/40">${pctAp}%</td>
            <td class="p-3 text-right font-bold text-rose-700 bg-rose-50/40">${pctRe}%</td>
            <td class="p-3 text-right font-semibold text-blue-700">${formatAdaptiveTime(secBuz)}</td>
            <td class="p-3 text-right font-semibold text-slate-800">${formatAdaptiveTime(secBol)}</td>
            <td class="p-3 text-right font-semibold text-slate-600">${formatAdaptiveTime(secAte)}</td>
            <td class="p-3 text-right font-black text-purple-700 bg-purple-50/50">${formatAdaptiveTime(secCic)}</td>
            <td class="p-3 text-right font-bold text-emerald-600">${sla1Pct}%</td>
        </tr>`;
    });

    // 3. Pestaña 3
    const totSLA = res.nCicloHab;
    const pct1d = totSLA > 0 ? ((res.sla1d / totSLA)*100).toFixed(1) : '0.0';
    const pct2d = totSLA > 0 ? ((res.sla2d / totSLA)*100).toFixed(1) : '0.0';
    const pct3d = totSLA > 0 ? ((res.sla3d / totSLA)*100).toFixed(1) : '0.0';
    const pct5d = totSLA > 0 ? ((res.sla5d / totSLA)*100).toFixed(1) : '0.0';
    const pctFuera = totSLA > 0 ? ((res.slaFuera / totSLA)*100).toFixed(1) : '0.0';

    document.getElementById('kpiSLA1dPct').innerText = pct1d + '%';
    document.getElementById('kpiSLA1dCnt').innerText = res.sla1d.toLocaleString() + ' expedientes';
    document.getElementById('barSLA1d').style.width = pct1d + '%';

    document.getElementById('kpiSLA2dPct').innerText = pct2d + '%';
    document.getElementById('kpiSLA2dCnt').innerText = res.sla2d.toLocaleString() + ' expedientes';
    document.getElementById('barSLA2d').style.width = pct2d + '%';

    document.getElementById('kpiSLA3dPct').innerText = pct3d + '%';
    document.getElementById('kpiSLA3dCnt').innerText = res.sla3d.toLocaleString() + ' expedientes';
    document.getElementById('barSLA3d').style.width = pct3d + '%';

    document.getElementById('kpiSLA5dPct').innerText = pct5d + '%';
    document.getElementById('kpiSLA5dCnt').innerText = res.sla5d.toLocaleString() + ' expedientes';
    document.getElementById('barSLA5d').style.width = pct5d + '%';

    document.getElementById('kpiSLAFueraPct').innerText = pctFuera + '%';
    document.getElementById('kpiSLAFueraCnt').innerText = res.slaFuera.toLocaleString() + ' rezagados';
    document.getElementById('barSLAFuera').style.width = pctFuera + '%';

    const tbTiemposD = document.getElementById('bodyTiemposDinamicos');
    tbTiemposD.innerHTML = `
        <tr>
            <td class="p-3 font-bold text-slate-900">1. Espera en Cola (Buzón General)</td>
            <td class="p-3 text-slate-600 font-mono">FechaAsignacion - FechaCreacion</td>
            <td class="p-3 text-right font-mono text-slate-600">${res.nBuzonHab.toLocaleString()}</td>
            <td class="p-3 text-right font-black text-emerald-700 bg-emerald-50/40">${formatAdaptiveTime(res.nBuzonHab > 0 ? (res.sumBuzonHab/res.nBuzonHab) : 0)}</td>
            <td class="p-3 text-right text-slate-500">${formatAdaptiveTime(res.nBuzonCal > 0 ? (res.sumBuzonCal/res.nBuzonCal) : 0)}</td>
        </tr>
        <tr>
            <td class="p-3 font-bold text-slate-900">2. En Bandeja (Bolsón del Agente)</td>
            <td class="p-3 text-slate-600 font-mono">FechaRevision - FechaAsignacion</td>
            <td class="p-3 text-right font-mono text-slate-600">${res.nBolson.toLocaleString()}</td>
            <td class="p-3 text-right font-black text-blue-700 bg-blue-50/40">${formatAdaptiveTime(res.nBolson > 0 ? (res.sumBolson/res.nBolson) : 0)}</td>
            <td class="p-3 text-right text-slate-500">-</td>
        </tr>
        <tr class="bg-rose-50/30">
            <td class="p-3 font-bold text-rose-900">3A. Atención en Rechazo</td>
            <td class="p-3 text-rose-700 font-mono">FechaRechazo - FechaRevision</td>
            <td class="p-3 text-right font-mono text-rose-800">${res.nAtencionRechazo.toLocaleString()}</td>
            <td class="p-3 text-right font-black text-rose-700 bg-rose-50">${formatAdaptiveTime(res.nAtencionRechazo > 0 ? (res.sumAtencionRechazo/res.nAtencionRechazo) : 0)}</td>
            <td class="p-3 text-right text-slate-500">-</td>
        </tr>
        <tr class="bg-emerald-50/30">
            <td class="p-3 font-bold text-emerald-900">3B. Atención Resolutiva / Aprobación</td>
            <td class="p-3 text-emerald-700 font-mono">FechaFinaliza - FechaRevision</td>
            <td class="p-3 text-right font-mono text-emerald-800">${res.nAtencionFinal.toLocaleString()}</td>
            <td class="p-3 text-right font-black text-emerald-700 bg-emerald-50">${formatAdaptiveTime(res.nAtencionFinal > 0 ? (res.sumAtencionFinal/res.nAtencionFinal) : 0)}</td>
            <td class="p-3 text-right text-slate-500">-</td>
        </tr>
        <tr>
            <td class="p-3 font-bold text-slate-900">4. Tiempo de Respuesta Total</td>
            <td class="p-3 text-slate-600 font-mono">FechaFinaliza - FechaCreacion</td>
            <td class="p-3 text-right font-mono text-slate-600">${res.nCicloHab.toLocaleString()}</td>
            <td class="p-3 text-right font-black text-purple-700 bg-purple-50/50">${formatAdaptiveTime(secCicloHab)}</td>
            <td class="p-3 text-right text-slate-500">${formatAdaptiveTime(secCicloCal)}</td>
        </tr>
    `;

    // 4. Pestaña 4
    const totRechFiltrado = res.rechAprob + res.rechAband + res.rechBloq;
    const recupAprobPct = totRechFiltrado > 0 ? ((res.rechAprob / totRechFiltrado)*100).toFixed(1) : '0.0';
    const recupAbandPct = totRechFiltrado > 0 ? ((res.rechAband / totRechFiltrado)*100).toFixed(1) : '0.0';
    const recupBloqPct  = totRechFiltrado > 0 ? ((res.rechBloq  / totRechFiltrado)*100).toFixed(1) : '0.0';

    document.getElementById('kpiRecupAprobPct').innerText = recupAprobPct + '%';
    document.getElementById('kpiRecupAprobCnt').innerText = res.rechAprob.toLocaleString() + ' Trámites';
    document.getElementById('kpiRecupAbandPct').innerText = recupAbandPct + '%';
    document.getElementById('kpiRecupAbandCnt').innerText = res.rechAband.toLocaleString() + ' Trámites';
    document.getElementById('kpiRecupBloqPct').innerText = recupBloqPct + '%';
    document.getElementById('kpiRecupBloqCnt').innerText = res.rechBloq.toLocaleString() + ' Trámites';

    if (chartDestinoRechInst) {
        chartDestinoRechInst.data.datasets[0].data = [res.rechAprob, res.rechAband, res.rechBloq];
        chartDestinoRechInst.update();
    }

    document.getElementById('lblFugaInicialCnt').innerText = res.totalNoConf.toLocaleString();
    document.getElementById('lblFugaInicialPct').innerText = res.totalCasos > 0 ? ((res.totalNoConf / res.totalCasos)*100).toFixed(1) + '% de la selección' : '0%';
    document.getElementById('lblFugaRechCnt').innerText = res.rechAband.toLocaleString();
    document.getElementById('lblFugaRechPct').innerText = res.totalCasos > 0 ? ((res.rechAband / res.totalCasos)*100).toFixed(1) + '% de la selección' : '0%';

    if (chartMacroInst) {
        chartMacroInst.data.labels = Object.keys(res.macCounts);
        chartMacroInst.data.datasets[0].data = Object.values(res.macCounts);
        chartMacroInst.update();
    }

    const tbTaxD = document.getElementById('tableTaxonomiaDinamica');
    tbTaxD.innerHTML = '';
    DATA.taxonomia.forEach(t => {
        const cnt = res.subcatCounts[t.ID_Subcategoria] || 0;
        tbTaxD.innerHTML += `<tr>
            <td class="p-3 font-mono font-bold text-blue-700">${t.ID_Subcategoria}</td>
            <td class="p-3 font-mono text-slate-500">${t.ID_Macro}</td>
            <td class="p-3 font-medium text-slate-800">${t.Macro_Familia}</td>
            <td class="p-3 text-slate-700">${t.Subcategoria_Granular}</td>
            <td class="p-3 text-right font-black text-slate-900">${cnt.toLocaleString()}</td>
        </tr>`;
    });

    // 5. Pestaña 5
    const speedLabels = ['<=2s', '2-5s', '5-15s', '15-60s', '1-5m', '>5m'];
    const speedRechPcts = speedLabels.map(lbl => {
        const obj = res.speedMap[lbl];
        return obj.casos > 0 ? parseFloat(((obj.rech / obj.casos)*100).toFixed(1)) : 0;
    });

    if (chartSpeedVsRechazoInst) {
        chartSpeedVsRechazoInst.data.labels = ['Ultra-Rápido (≤2s)', 'Rápido (2-5s)', 'Moderado (5-15s)', 'Analítico (15-60s)', 'Detallado (1-5m)', 'Pausa/Audit (>5m)'];
        chartSpeedVsRechazoInst.data.datasets[0].data = speedRechPcts;
        chartSpeedVsRechazoInst.update();
    }

    const opsArray = Object.keys(res.opMap).map(k => res.opMap[k]);
    const segBajo = opsArray.filter(o => o.total < 1000);
    const segMedio = opsArray.filter(o => o.total >= 1000 && o.total <= 8000);
    const segAlto = opsArray.filter(o => o.total > 8000);

    const calcAvgSec = arr => {
        const sumS = arr.reduce((acc, x) => acc + x.sumAte, 0);
        const sumN = arr.reduce((acc, x) => acc + x.nAte, 0);
        return sumN > 0 ? parseFloat((sumS / sumN).toFixed(1)) : 0;
    };

    if (chartVolumeVsSpeedInst) {
        chartVolumeVsSpeedInst.data.datasets[0].data = [
            calcAvgSec(segAlto),
            calcAvgSec(segMedio),
            calcAvgSec(segBajo)
        ];
        chartVolumeVsSpeedInst.update();
    }

    const topOps = Object.keys(res.opMap).map(k => {
        const obj = res.opMap[k];
        const pctIncidencia = obj.total > 0 ? ((obj.rech_eventos / obj.total)*100).toFixed(1) : '0.0';
        return {
            op: k, total: obj.total, aprob_tot: obj.aprob,
            aprob_dir: obj.aprob_dir, aprob_sub: obj.aprob_sub,
            rech_def: obj.rech_def, rech_eventos: obj.rech_eventos,
            tasa_incidencia: pctIncidencia
        };
    }).sort((a,b) => b.total - a.total).slice(0, 20);

    if (chartOpsInst) {
        chartOpsInst.data.labels = topOps.slice(0, 12).map(o => o.op);
        chartOpsInst.data.datasets[0].data = topOps.slice(0, 12).map(o => parseFloat(o.tasa_incidencia));
        chartOpsInst.update();
    }

    const tbOpD = document.getElementById('tableOperadoresDinamica');
    tbOpD.innerHTML = '';
    topOps.forEach(o => {
        tbOpD.innerHTML += `<tr>
            <td class="p-2.5 font-bold text-slate-900">${o.op}</td>
            <td class="p-2.5 text-right font-mono font-bold text-slate-900 bg-slate-50">${o.total.toLocaleString()}</td>
            <td class="p-2.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50">${o.aprob_tot.toLocaleString()}</td>
            <td class="p-2.5 text-right font-mono text-emerald-600">${o.aprob_dir.toLocaleString()}</td>
            <td class="p-2.5 text-right font-mono text-amber-600 font-semibold">${o.aprob_sub.toLocaleString()}</td>
            <td class="p-2.5 text-right font-mono font-bold text-rose-600">${o.rech_def.toLocaleString()}</td>
            <td class="p-2.5 text-right font-mono font-bold text-rose-700 bg-rose-50/40">${o.rech_eventos.toLocaleString()}</td>
            <td class="p-2.5 text-right font-black text-blue-700">${o.tasa_incidencia}%</td>
        </tr>`;
    });

    filterAuditTable();
}

function filterAuditTable() {
    const fGes = document.getElementById('selGestion').value;
    const fReg = document.getElementById('selRegion').value;
    const fEst = document.getElementById('selEstado').value;
    const fMac = document.getElementById('selMacro').value;
    const fSpeed = document.getElementById('selAuditSpeed') ? document.getElementById('selAuditSpeed').value : 'TODOS';

    const targetTable = document.getElementById('auditTableDT') || document.getElementById('auditTable');
    if (!targetTable) return;

    if ($.fn.DataTable.isDataTable(targetTable)) {
        $(targetTable).DataTable().destroy();
    }

    const tbAud = targetTable.querySelector('tbody') || document.getElementById('tableAudit');
    if (!tbAud) return;
    tbAud.innerHTML = '';

    DATA.muestra_expedientes.forEach(e => {
        if (fGes === 'HUMANAS' && e.Gestion === 'REINICIO DE CONTRASEÑA') return;
        if (fGes !== 'HUMANAS' && fGes !== 'TODAS' && e.Gestion !== fGes) return;
        if (fReg !== 'TODAS' && e.Region !== fReg) return;
        if (fEst !== 'TODOS' && e.Estado !== fEst) return;
        if (fMac !== 'TODAS' && e.MacroFamilia !== fMac) return;

        const secFinal = e.Atencion_Final_Sec;
        const secRech = e.Atencion_Rechazo_Sec;
        const ronda = e.Ronda_Revision;

        if (fSpeed === '1RA_DIRECTA' && ronda !== '1RA_DIRECTA') return;
        if (fSpeed === '1RA_RECHAZO' && ronda !== '1RA_RECHAZO') return;
        if (fSpeed === '2DA_SUBSANADA' && ronda !== '2DA_SUBSANADA') return;
        if (fSpeed === '3RA_LIMITE' && ronda !== '3RA_LIMITE') return;
        if (fSpeed === 'RECHAZO_RAPIDO' && (secRech == null || secRech > 2.0)) return;
        if (fSpeed === 'APROBACION_RAPIDA' && (secFinal == null || secFinal > 2.0 || e.TuvoRechazo)) return;

        let badgeRonda = '';
        if (ronda === '1RA_DIRECTA') badgeRonda = '<span class="badge-round-directa px-2 py-0.5 rounded text-[11px] whitespace-nowrap">🟢 1ra Rev (Directa)</span>';
        else if (ronda === '1RA_RECHAZO') badgeRonda = '<span class="badge-round-rechazo px-2 py-0.5 rounded text-[11px] whitespace-nowrap">🔴 1ra Rev (Rechazo)</span>';
        else if (ronda === '2DA_SUBSANADA') badgeRonda = '<span class="badge-round-subsanada px-2 py-0.5 rounded text-[11px] whitespace-nowrap">🔵 2da Rev (Subsanada)</span>';
        else badgeRonda = '<span class="badge-round-limite px-2 py-0.5 rounded text-[11px] whitespace-nowrap">⚠️ 3ra+ (Límite)</span>';

        let orderRech = (secRech != null && !isNaN(secRech)) ? (secRech / 3600.0) : 999999;
        let badgeRech = '<span class="text-slate-300">-</span>';
        if (secRech != null && !isNaN(secRech)) {
            const hrsR = (secRech / 3600.0).toFixed(4);
            badgeRech = `<span class="bg-rose-100 text-rose-900 font-bold px-2 py-0.5 rounded text-[11px] border border-rose-200 whitespace-nowrap">${hrsR} h <span class="text-rose-600 font-normal">(${secRech}s)</span></span>`;
        }

        let orderFinal = (secFinal != null && !isNaN(secFinal)) ? (secFinal / 3600.0) : 999999;
        let badgeFinal = '<span class="text-slate-300">-</span>';
        if (secFinal != null && !isNaN(secFinal)) {
            const hrsF = (secFinal / 3600.0).toFixed(4);
            const secStr = secFinal < 60 ? `${secFinal}s` : `${(secFinal/60).toFixed(1)}m`;
            badgeFinal = `<span class="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded text-[11px] border border-emerald-200 whitespace-nowrap">${hrsF} h <span class="text-emerald-700 font-normal">(${secStr})</span></span>`;
        }

        tbAud.innerHTML += `<tr>
            <td class="font-mono font-bold text-blue-700">${e.NumeroGestion}</td>
            <td class="font-mono text-slate-600">${e.Nit}</td>
            <td class="font-bold text-slate-900">${e.Operador}</td>
            <td class="text-slate-700">${e.Gestion}</td>
            <td class="text-center">${badgeRonda}</td>
            <td class="font-mono text-slate-500">${e.FR}</td>
            <td class="font-mono text-rose-600 font-medium">${e.FRech}</td>
            <td class="font-mono text-emerald-700 font-medium">${e.FF}</td>
            <td class="text-right font-mono" data-order="${orderRech}">${badgeRech}</td>
            <td class="text-right font-mono" data-order="${orderFinal}">${badgeFinal}</td>
            <td class="text-slate-600 max-w-xs truncate" title="${e.MotivoRechazo}">${e.MotivoRechazo || '-'}</td>
        </tr>`;
    });

    dtAuditMainInstance = $(targetTable).DataTable({
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
        order: [[8, 'asc']], // Orden inicial por Rechazo de menor a mayor
        columnDefs: [
            { targets: [8, 9], type: 'num' }
        ],
        language: {
            lengthMenu: "Mostrar _MENU_ registros",
            zeroRecords: "No se encontraron expedientes",
            info: "Mostrando _START_ a _END_ de _TOTAL_ expedientes",
            infoEmpty: "Mostrando 0 a 0 de 0 expedientes",
            infoFiltered: "(filtrado de _MAX_ totales)",
            search: "Buscar en tabla:",
            paginate: {
                first: "Primero",
                last: "Último",
                next: "Siguiente →",
                previous: "← Anterior"
            }
        }
    });
}

function initStaticTables() {
    const tbCombos = document.getElementById('tableCombos');
    DATA.combos.forEach(c => {
        tbCombos.innerHTML += `<tr>
            <td class="p-2.5 font-medium text-slate-800">${c.Combinacion_Multicausal_Frecuente}</td>
            <td class="p-2.5 text-right font-bold text-indigo-600">${Number(c.Frecuencia).toLocaleString()}</td>
            <td class="p-2.5 text-right text-slate-500">${c['% del Total']}%</td>
        </tr>`;
    });
}

function filterSubcatTable() {
    const input = document.getElementById('filterSubcat').value.toLowerCase();
    const rows = document.querySelectorAll('#tableTaxonomiaDinamica tr');
    rows.forEach(r => { r.style.display = r.innerText.toLowerCase().includes(input) ? '' : 'none'; });
}

window.onload = function() {
    initSelectors();
    initCharts();
    initStaticTables();
    applyFilters();
    lucide.createIcons();
};
