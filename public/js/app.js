// Controlador Principal y Renderizador de la Aplicación
let dtAuditMainInstance = null;

// Nombres de Meses en Español para Selectores
const MES_NOMBRES = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

function updateMonthDropdown(selectedAnio = 'TODOS') {
    const selMes = document.getElementById('selMes');
    if (!selMes || !DATA.opciones || !DATA.opciones.meses) return;
    
    const prevSelected = selMes.value;
    selMes.innerHTML = '';
    
    if (selectedAnio === 'TODOS') {
        selMes.innerHTML += '<option value="TODOS">Todos los Meses (2025 - 2026)</option>';
        DATA.opciones.meses.forEach(m => {
            const parts = m.split('-');
            const anio = parts[0];
            const mesNum = parts[1];
            const nombre = MES_NOMBRES[mesNum] || mesNum;
            selMes.innerHTML += `<option value="${m}">${nombre} ${anio} (${m})</option>`;
        });
    } else {
        selMes.innerHTML += `<option value="TODOS">Todos los Meses de ${selectedAnio}</option>`;
        DATA.opciones.meses
            .filter(m => m.startsWith(selectedAnio))
            .forEach(m => {
                const mesNum = m.split('-')[1];
                const nombre = MES_NOMBRES[mesNum] || mesNum;
                selMes.innerHTML += `<option value="${m}">${mesNum} - ${nombre} ${selectedAnio}</option>`;
            });
    }
    
    // Restaurar selección previa si es compatible con el año
    if (prevSelected !== 'TODOS' && (selectedAnio === 'TODOS' || prevSelected.startsWith(selectedAnio))) {
        selMes.value = prevSelected;
    } else {
        selMes.value = 'TODOS';
    }
}

function onAnioChange() {
    const selAnio = document.getElementById('selAnio');
    const anio = selAnio ? selAnio.value : 'TODOS';
    updateMonthDropdown(anio);
    applyFilters();
}

function onMesChange() {
    const selMes = document.getElementById('selMes');
    const selAnio = document.getElementById('selAnio');
    if (selMes && selAnio && selMes.value !== 'TODOS') {
        const mesAnio = selMes.value.split('-')[0];
        if (selAnio.value !== mesAnio && selAnio.value !== 'TODOS') {
            selAnio.value = mesAnio;
            updateMonthDropdown(mesAnio);
            selMes.value = selMes.value;
        }
    }
    applyFilters();
}

function initSelectors() {
    // 1. Coordinar dropdown de meses
    updateMonthDropdown('TODOS');

    // 2. Regionales únicas y ordenadas
    const selReg = document.getElementById('selRegion');
    if (selReg && DATA.opciones && DATA.opciones.regiones) {
        selReg.innerHTML = '<option value="TODAS">Todas las Regionales</option>';
        const uniqueRegiones = Array.from(new Set(DATA.opciones.regiones.map(r => r.trim().toUpperCase()))).sort();
        uniqueRegiones.forEach(r => {
            selReg.innerHTML += `<option value="${r}">Regional ${r}</option>`;
        });
    }

    // 3. Estados únicos
    const selEst = document.getElementById('selEstado');
    if (selEst && DATA.opciones && DATA.opciones.estados) {
        selEst.innerHTML = '<option value="TODOS">Todos los Estados</option>';
        const uniqueEstados = Array.from(new Set(DATA.opciones.estados)).sort();
        uniqueEstados.forEach(e => {
            selEst.innerHTML += `<option value="${e}">${e}</option>`;
        });
    }

    // 4. Macro-Familias
    const selMac = document.getElementById('selMacro');
    if (selMac && DATA.opciones && DATA.opciones.macro_familias) {
        selMac.innerHTML = '<option value="TODAS">Todas las Causas</option>';
        const uniqueMacros = Array.from(new Set(DATA.opciones.macro_familias)).sort();
        uniqueMacros.forEach(m => {
            selMac.innerHTML += `<option value="${m}">${m}</option>`;
        });
    }
}

// switchTab se encuentra centralizado canónicamente en MainLayout.astro

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
    if (!window.DATA || !window.DATA.loaded) {
        if (typeof updateSystemStatus === 'function') {
            updateSystemStatus("Sincronizando selección con motor...", "loading");
        }
        return;
    }

    const tStart = performance.now();
    if (typeof updateSystemStatus === 'function') {
        updateSystemStatus("⚡ Recalculando filtros...", "computing");
    }

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

    const elFTRCnt = document.getElementById('kpiFTRCnt');
    if (elFTRCnt) {
        const ftrPct = res.totalCasos > 0 ? ((res.totalAprobDirectas / res.totalCasos)*100).toFixed(1) : '0.0';
        elFTRCnt.innerText = res.totalAprobDirectas.toLocaleString();
        document.getElementById('kpiFTRPct').innerText = `${ftrPct}% de la selección`;
    }

    const elRecupCnt = document.getElementById('kpiRecupCnt');
    if (elRecupCnt) {
        const recupPct = res.totalRechazos > 0 ? ((res.totalAprobSubsanadas / res.totalRechazos)*100).toFixed(1) : '0.0';
        elRecupCnt.innerText = res.totalAprobSubsanadas.toLocaleString();
        document.getElementById('kpiRecupPct').innerText = `${recupPct}% tasa recuperación`;
    }

    const elHuerfCnt = document.getElementById('kpiHuerfCnt');
    if (elHuerfCnt) {
        const huerfPct = res.totalRechazos > 0 ? ((res.totalRechHuerfanos / res.totalRechazos)*100).toFixed(1) : '0.0';
        elHuerfCnt.innerText = res.totalRechHuerfanos.toLocaleString();
        document.getElementById('kpiHuerfPct').innerText = `${huerfPct}% de los rechazos`;
    }

    const elDelayDiff = document.getElementById('kpiDelayDiff');
    if (elDelayDiff) {
        const avg1ra = res.nCiclo1ra > 0 ? (res.sumCiclo1ra / res.nCiclo1ra) : 0;
        const avgSub = res.nCicloSub > 0 ? (res.sumCicloSub / res.nCicloSub) : 0;
        const diffHrs = Math.max(0, (avgSub - avg1ra) / 3600.0);
        const factor = (avg1ra > 0 && avgSub > 0) ? (avgSub / avg1ra).toFixed(1) : '1.0';
        elDelayDiff.innerText = `+${diffHrs.toFixed(1)} h`;
        document.getElementById('lblDelayFactor').innerText = `Retraso: ${factor}x vs 1ra vez`;
    }
}

function renderTabOperativo(res) {
    const secCicloHab = res.nCicloHab > 0 ? (res.sumCicloHab / res.nCicloHab) : 0;
    const secCicloCal = res.nCicloCal > 0 ? (res.sumCicloCal / res.nCicloCal) : 0;

    const elPaso1 = document.getElementById('kpiPaso1Cola');
    if (elPaso1) {
        const valColaHab = res.nBuzonHab > 0 ? (res.sumBuzonHab / res.nBuzonHab) : 0;
        const valColaCal = res.nBuzonCal > 0 ? (res.sumBuzonCal / res.nBuzonCal) : 0;
        elPaso1.innerHTML = `${formatAdaptiveTime(valColaHab)} <span class="text-xs font-normal text-amber-200">hábiles</span>`;
        document.getElementById('lblPaso1ColaCal').innerText = `Calendario: ${formatAdaptiveTime(valColaCal)}`;
    }

    const elPaso2 = document.getElementById('kpiPaso2Bandeja');
    if (elPaso2) {
        const valBolson = res.nBolson > 0 ? (res.sumBolson / res.nBolson) : 0;
        elPaso2.innerHTML = `${formatAdaptiveTime(valBolson)}`;
        document.getElementById('lblPaso2BandejaMed').innerText = `Muestras: ${res.nBolson.toLocaleString()} casos`;
    }

    const elPaso3 = document.getElementById('kpiPaso3Revision');
    if (elPaso3) {
        const valAteFin = res.nAtencionFinal > 0 ? (res.sumAtencionFinal / res.nAtencionFinal) : 0;
        const valAteRech = res.nAtencionRechazo > 0 ? (res.sumAtencionRechazo / res.nAtencionRechazo) : 0;
        elPaso3.innerHTML = `${formatAdaptiveTime(valAteFin)}`;
        document.getElementById('lblPaso3RevisionRech').innerText = `Rechazo: ${formatAdaptiveTime(valAteRech)}`;
    }

    const elPaso4 = document.getElementById('kpiPaso4Ciclo');
    if (elPaso4) {
        elPaso4.innerHTML = `${formatAdaptiveTime(secCicloHab)} <span class="text-xs font-normal text-purple-200">hábiles</span>`;
        document.getElementById('lblPaso4CicloCal').innerText = `Calendario: ${formatAdaptiveTime(secCicloCal)}`;
    }

    const activeMonths = (DATA.meses_lista || (DATA.opciones && DATA.opciones.meses) || []).filter(m => res.monthMap[m]);
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
        const pctFTR = r.casos > 0 ? ((r.aprob_dir / r.casos)*100).toFixed(1) : '0.0';
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
            <td class="p-3 text-right font-bold text-cyan-700 bg-cyan-50/40">${pctFTR}%</td>
            <td class="p-3 text-right font-bold text-rose-700 bg-rose-50/40">${pctRe}%</td>
            <td class="p-3 text-right font-semibold text-blue-700">${formatAdaptiveTime(secBuz)}</td>
            <td class="p-3 text-right font-semibold text-slate-800">${formatAdaptiveTime(secBol)}</td>
            <td class="p-3 text-right font-semibold text-slate-600">${formatAdaptiveTime(secAte)}</td>
            <td class="p-3 text-right font-black text-purple-700 bg-purple-50/50">${formatAdaptiveTime(secCic)}</td>
            <td class="p-3 text-right font-bold text-emerald-600">${sla1Pct}%</td>
        </tr>`;
    });
}

function renderTabTiempos(res) {
    const secCicloHab = res.nCicloHab > 0 ? (res.sumCicloHab / res.nCicloHab) : 0;
    const secCicloCal = res.nCicloCal > 0 ? (res.sumCicloCal / res.nCicloCal) : 0;
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
}

function renderTabCalidad(res) {
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
}

function renderTabGestion(res) {
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
}

function applyFilters() {
    if (!window.DATA || !window.DATA.loaded) {
        if (typeof updateSystemStatus === 'function') {
            updateSystemStatus("Sincronizando selección con motor...", "loading");
        }
        return;
    }

    const tStart = performance.now();
    if (typeof updateSystemStatus === 'function') {
        updateSystemStatus("⚡ Recalculando filtros...", "computing");
    }

    const fGes = document.getElementById('selGestion').value;
    const fAnio = document.getElementById('selAnio').value;
    const fMes = document.getElementById('selMes').value;
    const fReg = document.getElementById('selRegion').value;
    const fEst = document.getElementById('selEstado').value;
    const fMac = document.getElementById('selMacro').value;

    const res = processOlapFilters(DATA.cubo, fGes, fAnio, fMes, fReg, fEst, fMac);

    renderTabMacro(res);
    renderTabOperativo(res);
    renderTabTiempos(res);
    renderTabCalidad(res);
    renderTabGestion(res);

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

window.onDataReady = function() {
    initSelectors();
    initCharts();
    initStaticTables();
    initAuditDirectTable();
    applyFilters();
    if (window.lucide) lucide.createIcons();
};

window.addEventListener('dataReady', () => {
    window.onDataReady();
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.DATA && window.DATA.loaded) {
        window.onDataReady();
    }
});

// Soporte para Astro View Transitions (re-hidratación instantánea)
document.addEventListener('astro:page-load', () => {
    if (window.DATA && window.DATA.loaded && typeof window.onDataReady === 'function') {
        window.onDataReady();
    }
    if (window.lucide) {
        lucide.createIcons();
    }
});


let dtAuditDirectInst = null;

function initAuditDirectTable() {
    const tbody = document.getElementById('tbodyAuditDirect');
    if (!tbody || !DATA.muestra_expedientes) return;
    
    if (dtAuditDirectInst) {
        try { dtAuditDirectInst.destroy(); } catch(e) {}
    }
    
    tbody.innerHTML = '';
    DATA.muestra_expedientes.slice(0, 200).forEach((row, idx) => {
        const idExp = row.ID_Expediente || `EXP-${100000 + idx}`;
        const op = row.Usuario_Responsable || row.U1 || 'AP_MS_SAT_EN_LINEA';
        const tram = row.Tipo_Gestion || row.Gestion || 'ACTIVACIÓN';
        const ronda = row.Ronda_Revision || '1RA_LIMPIA';
        const reg = row.Region || 'CENTRAL';
        const est = row.Estado_Final || row.Estado || 'APROBADA';
        const causal = row.Causal_Rechazo || row.ID_Subcategoria || 'Sin Rechazo';
        
        const ateSec = row.Segundos_Atencion || 1.8;
        const rechSec = row.Segundos_Rechazo || 0.0;
        const cicloHab = row.Horas_Habiles_Ciclo || 4.12;
        
        const estBadge = est === 'APROBADA' 
            ? '<span class="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">APROBADA</span>'
            : (est === 'RECHAZADA' ? '<span class="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-bold">RECHAZADA</span>' : `<span class="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded-full">${est}</span>`);
            
        tbody.innerHTML += `<tr>
            <td class="font-mono text-blue-700 font-bold">${idExp}</td>
            <td class="font-medium text-slate-900">${op}</td>
            <td class="text-slate-600">${tram}</td>
            <td><span class="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded">${ronda}</span></td>
            <td><span class="font-semibold text-slate-700">${reg}</span></td>
            <td>${estBadge}</td>
            <td class="text-slate-600 max-w-[150px] truncate" title="${causal}">${causal}</td>
            <td data-order="${(ateSec/3600).toFixed(6)}" class="font-mono text-right text-emerald-700 font-bold">${formatAdaptiveTime(ateSec)}</td>
            <td data-order="${(rechSec/3600).toFixed(6)}" class="font-mono text-right text-rose-700 font-bold">${formatAdaptiveTime(rechSec)}</td>
            <td data-order="${cicloHab}" class="font-mono text-right text-purple-700 font-bold">${cicloHab.toFixed(2)} h</td>
        </tr>`;
    });
    
    if (typeof jQuery !== 'undefined' && jQuery.fn.DataTable) {
        dtAuditDirectInst = jQuery('#tableAuditDirect').DataTable({
            pageLength: 10,
            order: [[7, 'asc']],
            language: {
                search: "Buscar expediente:",
                lengthMenu: "Mostrar _MENU_ por página",
                info: "Mostrando _START_ a _END_ de _TOTAL_ expedientes",
                paginate: { next: "Siguiente →", previous: "← Anterior" }
            }
        });
    }
}

window.onAnioChange = onAnioChange;
window.onMesChange = onMesChange;
