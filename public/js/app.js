// Controlador Principal y Renderizador de la Aplicación
let dtAuditMainInstance = null;

// Nombres de Meses y Trimestres en Español para Selectores
const MES_NOMBRES = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

const QUARTER_MONTHS = {
    'Q1': ['01', '02', '03'],
    'Q2': ['04', '05', '06'],
    'Q3': ['07', '08', '09'],
    'Q4': ['10', '11', '12']
};

const MONTH_TO_QUARTER = {
    '01': 'Q1', '02': 'Q1', '03': 'Q1',
    '04': 'Q2', '05': 'Q2', '06': 'Q2',
    '07': 'Q3', '08': 'Q3', '09': 'Q3',
    '10': 'Q4', '11': 'Q4', '12': 'Q4'
};

function updateMonthDropdown(selectedAnio = 'TODOS', selectedTrimestre = 'TODOS') {
    const selMes = document.getElementById('selMes');
    if (!selMes || !DATA.opciones || !DATA.opciones.meses) return;
    
    const prevSelected = selMes.value;
    selMes.innerHTML = '';
    
    let labelAll = 'Todos los Meses';
    if (selectedAnio !== 'TODOS' && selectedTrimestre !== 'TODOS') {
        labelAll = `Todos los Meses de ${selectedTrimestre} ${selectedAnio}`;
    } else if (selectedAnio !== 'TODOS') {
        labelAll = `Todos los Meses de ${selectedAnio}`;
    } else if (selectedTrimestre !== 'TODOS') {
        labelAll = `Todos los Meses de ${selectedTrimestre} (2025 - 2026)`;
    } else {
        labelAll = 'Todos los Meses (2025 - 2026)';
    }
    selMes.innerHTML += `<option value="TODOS">${labelAll}</option>`;
    
    let filteredMonths = DATA.opciones.meses;
    if (selectedAnio !== 'TODOS') {
        filteredMonths = filteredMonths.filter(m => m.startsWith(selectedAnio));
    }
    if (selectedTrimestre !== 'TODOS') {
        const allowedNums = QUARTER_MONTHS[selectedTrimestre] || [];
        filteredMonths = filteredMonths.filter(m => {
            const mNum = m.split('-')[1];
            return allowedNums.includes(mNum);
        });
    }
    
    filteredMonths.forEach(m => {
        const parts = m.split('-');
        const anio = parts[0];
        const mesNum = parts[1];
        const nombre = MES_NOMBRES[mesNum] || mesNum;
        if (selectedAnio !== 'TODOS') {
            selMes.innerHTML += `<option value="${m}">${mesNum} - ${nombre} ${anio}</option>`;
        } else {
            selMes.innerHTML += `<option value="${m}">${nombre} ${anio} (${m})</option>`;
        }
    });
    
    // Restaurar selección previa si aún existe entre las opciones filtradas
    if (prevSelected !== 'TODOS' && filteredMonths.includes(prevSelected)) {
        selMes.value = prevSelected;
    } else {
        selMes.value = 'TODOS';
    }
}

function onAnioChange() {
    const selAnio = document.getElementById('selAnio');
    const selTrim = document.getElementById('selTrimestre');
    const anio = selAnio ? selAnio.value : 'TODOS';
    const trim = selTrim ? selTrim.value : 'TODOS';
    updateMonthDropdown(anio, trim);
    applyFilters();
}

function onTrimestreChange() {
    const selAnio = document.getElementById('selAnio');
    const selTrim = document.getElementById('selTrimestre');
    const anio = selAnio ? selAnio.value : 'TODOS';
    const trim = selTrim ? selTrim.value : 'TODOS';
    updateMonthDropdown(anio, trim);
    applyFilters();
}

function onMesChange() {
    const selMes = document.getElementById('selMes');
    const selAnio = document.getElementById('selAnio');
    const selTrim = document.getElementById('selTrimestre');
    if (selMes && selMes.value !== 'TODOS') {
        const parts = selMes.value.split('-');
        const mesAnio = parts[0];
        const mesNum = parts[1];
        const mesQuarter = MONTH_TO_QUARTER[mesNum];
        
        let needsSync = false;
        if (selAnio && selAnio.value !== mesAnio && selAnio.value !== 'TODOS') {
            selAnio.value = mesAnio;
            needsSync = true;
        }
        if (selTrim && selTrim.value !== 'TODOS' && selTrim.value !== mesQuarter) {
            selTrim.value = mesQuarter;
            needsSync = true;
        }
        if (needsSync) {
            const anio = selAnio ? selAnio.value : 'TODOS';
            const trim = selTrim ? selTrim.value : 'TODOS';
            updateMonthDropdown(anio, trim);
            selMes.value = `${mesAnio}-${mesNum}`;
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
    if (document.getElementById('selTipoPersona')) document.getElementById('selTipoPersona').value = 'TODAS';
    document.getElementById('selAnio').value = 'TODOS';
    if (document.getElementById('selTrimestre')) document.getElementById('selTrimestre').value = 'TODOS';
    document.getElementById('selMes').value = 'TODOS';
    document.getElementById('selRegion').value = 'TODAS';
    document.getElementById('selEstado').value = 'TODOS';
    document.getElementById('selMacro').value = 'TODAS';
    updateMonthDropdown('TODOS', 'TODOS');
    applyFilters();
}


function renderTabMacro(res) {
    // Dispatch to React Island (KpiSummary)
    const secCreacionAtenHab = res.nCreacionAtenHab > 0 ? (res.sumCreacionAtenHab / res.nCreacionAtenHab) : 0;
    const secCicloHab = res.nCicloHab > 0 ? (res.sumCicloHab / res.nCicloHab) : 0;
    const secCicloCal = res.nCicloCal > 0 ? (res.sumCicloCal / res.nCicloCal) : 0;
    const kpiPayload = {
        totalCasos: res.totalCasos,
        totalAprobados: res.totalAprobados,
        totalRechazos: res.totalRechazos,
        secCreacionAtenHab,
        secCicloHab,
        secCicloCal
    };
    window.__lastKpi = kpiPayload;
    document.dispatchEvent(new CustomEvent('olap:kpi', { detail: kpiPayload }));

    const tbBal = document.getElementById('tableBalanceDinamico');
    if (tbBal) {
        let htmlBal = '';
        Object.keys(res.estCounts).sort((a,b) => res.estCounts[b] - res.estCounts[a]).forEach(est => {
            const cnt = res.estCounts[est];
            const pct = res.totalCasos > 0 ? ((cnt / res.totalCasos)*100).toFixed(1) : 0;
            const barColor = est.includes('APROB') ? 'bg-emerald-500' : (est.includes('RECH') ? 'bg-rose-500' : 'bg-blue-500');
            htmlBal += `<tr>
                <td class="p-3 font-semibold text-slate-800 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full ${barColor}"></span>
                    <span>${est}</span>
                </td>
                <td class="p-3 text-right font-mono font-bold text-slate-700">${cnt.toLocaleString()}</td>
                <td class="p-3 text-right font-black text-slate-900 w-24">${pct}%</td>
                <td class="p-3 w-40 hidden sm:table-cell">
                    <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div class="${barColor} h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                    </div>
                </td>
            </tr>`;
        });
        tbBal.innerHTML = htmlBal;
    }

    // Actualizar Gráficos Macro de Balance
    if (chartMacroDestinoInst) {
        const otrosCasos = Math.max(0, res.totalCasos - res.totalAprobDirectas - res.totalAprobSubsanadas - res.totalRechazos);
        chartMacroDestinoInst.data.datasets[0].data = [
            res.totalAprobDirectas,
            res.totalAprobSubsanadas,
            res.totalRechazos,
            otrosCasos
        ];
        chartMacroDestinoInst.update('none');
    }

    if (chartMacroPersoneriaInst && res.persStats) {
        const indCasos = res.persStats.ind.casos;
        const jurCasos = res.persStats.jur.casos;
        const indAprPct = indCasos > 0 ? parseFloat(((res.persStats.ind.aprob / indCasos) * 100).toFixed(1)) : 0;
        const indRechPct = indCasos > 0 ? parseFloat(((res.persStats.ind.rech / indCasos) * 100).toFixed(1)) : 0;
        const jurAprPct = jurCasos > 0 ? parseFloat(((res.persStats.jur.aprob / jurCasos) * 100).toFixed(1)) : 0;
        const jurRechPct = jurCasos > 0 ? parseFloat(((res.persStats.jur.rech / jurCasos) * 100).toFixed(1)) : 0;

        chartMacroPersoneriaInst.data.datasets[0].data = [indAprPct, jurAprPct];
        chartMacroPersoneriaInst.data.datasets[1].data = [indRechPct, jurRechPct];
        chartMacroPersoneriaInst.update('none');
    }

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

    const elTipifCnt = document.getElementById('kpiTipifCnt');
    if (elTipifCnt) {
        const tipifCasos = Math.max(0, res.totalRechazos - res.totalRechHuerfanos);
        const tipifPct = res.totalRechazos > 0 ? ((tipifCasos / res.totalRechazos)*100).toFixed(1) : '0.0';
        elTipifCnt.innerText = tipifCasos.toLocaleString();
        document.getElementById('kpiTipifPct').innerText = `${tipifPct}% de los rechazos`;
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
        chartLineBuzonRegInst.update('none');
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
        chartLineBolsonRegInst.update('none');
    }

    if (chartComboTrendInst) {
        const mAtenTrendAprob = activeMonths.map(m => (res.monthMap[m] && res.monthMap[m].aprobNAten > 0) ? parseFloat((res.monthMap[m].aprobSumAten / res.monthMap[m].aprobNAten / 3600.0).toFixed(2)) : 0);
        const mCasosTrendAprob = activeMonths.map(m => res.monthMap[m] ? res.monthMap[m].aprobCasos : 0);
        chartComboTrendInst.data.labels = activeMonths;
        chartComboTrendInst.data.datasets[0].data = mCasosTrend;
        chartComboTrendInst.data.datasets[1].data = mCasosTrendAprob;
        chartComboTrendInst.data.datasets[2].data = mAtenTrend;
        chartComboTrendInst.data.datasets[3].data = mAtenTrendAprob;
        chartComboTrendInst.update('none');
    }

    const regLabels = ['CENTRAL', 'OCCIDENTE', 'SUR', 'NORORIENTE'];
    if (chartBarRegVolumenInst) {
        chartBarRegVolumenInst.data.datasets[0].data = regLabels.map(reg => res.regMap[reg] ? res.regMap[reg].aprob : 0);
        chartBarRegVolumenInst.data.datasets[1].data = regLabels.map(reg => res.regMap[reg] ? res.regMap[reg].rech : 0);
        chartBarRegVolumenInst.update('none');
    }

    if (chartBarRegTiemposInst) {
        const hrsAct = regLabels.map(reg => {
            const r = res.regMap[reg];
            return (r && r.actN > 0) ? parseFloat((r.actSum / r.actN / 3600.0).toFixed(2)) : 0;
        });
        const hrsCor = regLabels.map(reg => {
            const r = res.regMap[reg];
            return (r && r.corN > 0) ? parseFloat((r.corSum / r.corN / 3600.0).toFixed(2)) : 0;
        });
        const hrsGlob = regLabels.map(reg => {
            const r = res.regMap[reg];
            return (r && r.nCreacionAten > 0) ? parseFloat((r.sumCreacionAten / r.nCreacionAten / 3600.0).toFixed(2)) : 0;
        });
        chartBarRegTiemposInst.data.datasets[0].data = hrsAct;
        chartBarRegTiemposInst.data.datasets[1].data = hrsCor;
        chartBarRegTiemposInst.data.datasets[2].data = hrsGlob;
        chartBarRegTiemposInst.update('none');
    }

    // -------------------------------------------------------------
    // ACTUALIZACIÓN DE MÓDULO: RELACIÓN VOLUMEN VS TIEMPO DE ATENCIÓN
    // -------------------------------------------------------------
    const secAprob = res.nAtencionFinal > 0 ? (res.sumAtencionFinal / res.nAtencionFinal) : 0;
    const secRech = res.nAtencionRechazo > 0 ? (res.sumAtencionRechazo / res.nAtencionRechazo) : 0;
    const nTotAten = res.nAtencionFinal + res.nAtencionRechazo;
    const secActivo = nTotAten > 0 ? ((res.sumAtencionFinal + res.sumAtencionRechazo) / nTotAten) : 0;

    const elRelRevProm = document.getElementById('kpiRelacionRevisionProm');
    if (elRelRevProm) elRelRevProm.innerText = formatAdaptiveTime(secActivo);

    const elRelAprobMin = document.getElementById('kpiRelacionAprobMin');
    if (elRelAprobMin) elRelAprobMin.innerText = formatAdaptiveTime(secAprob);

    const elRelRechSeg = document.getElementById('kpiRelacionRechSeg');
    if (elRelRechSeg) elRelRechSeg.innerText = formatAdaptiveTime(secRech);

    const elRelBuzonProm = document.getElementById('kpiRelacionBuzonProm');
    if (elRelBuzonProm) {
        const valColaHab = res.nBuzonHab > 0 ? (res.sumBuzonHab / res.nBuzonHab) : 0;
        elRelBuzonProm.innerHTML = `${formatAdaptiveTime(valColaHab)} <span class="text-xs font-normal text-amber-800">hábiles</span>`;
    }

    const elRel1raAten = document.getElementById('kpiRelacion1raAtenProm');
    if (elRel1raAten) {
        const val1raAten = res.nCreacionAtenHab > 0 ? (res.sumCreacionAtenHab / res.nCreacionAtenHab) : 0;
        elRel1raAten.innerHTML = `${formatAdaptiveTime(val1raAten)} <span class="text-xs font-normal text-indigo-800">hábiles</span>`;
    }

    const elRelCicloProm = document.getElementById('kpiRelacionCicloProm');
    if (elRelCicloProm) {
        elRelCicloProm.innerText = formatAdaptiveTime(secCicloHab);
    }

    if (chartSpeedDistributionInst) {
        const speedKeys = ['<=2s', '2-5s', '5-15s', '15-60s', '1-5m', '>5m'];
        const spdAprob = speedKeys.map(k => res.speedMap[k] ? Math.max(0, res.speedMap[k].casos - res.speedMap[k].rech) : 0);
        const spdRech = speedKeys.map(k => res.speedMap[k] ? res.speedMap[k].rech : 0);

        chartSpeedDistributionInst.data.datasets[0].data = spdAprob;
        chartSpeedDistributionInst.data.datasets[1].data = spdRech;
        chartSpeedDistributionInst.update('none');
    }

    // Renderizar la Tabla Ejecutiva de Tiempo hasta 1ª Atención (A LA PAR: Total vs No Rechazadas)
    const tbAten = document.getElementById('tableRegionalAtencion');
    const tbAtenFoot = document.getElementById('tableRegionalAtencionFoot');
    if (tbAten && tbAtenFoot) {
        tbAten.innerHTML = '';
        let totActN = 0, totActSum = 0;
        let totCorN = 0, totCorSum = 0;
        let totBuzN = 0, totBuzSum = 0;
        let totBolN = 0, totBolSum = 0;
        let totGlobN = 0, totGlobSum = 0;

        let totAprobActN = 0, totAprobActSum = 0;
        let totAprobCorN = 0, totAprobCorSum = 0;
        let totAprobGlobN = 0, totAprobGlobSum = 0;

        const regColors = {
            'CENTRAL': 'text-blue-900 bg-blue-50 border-blue-200',
            'OCCIDENTE': 'text-emerald-900 bg-emerald-50 border-emerald-200',
            'SUR': 'text-amber-900 bg-amber-50 border-amber-200',
            'NORORIENTE': 'text-purple-900 bg-purple-50 border-purple-200'
        };

        let htmlAten = '';
        regLabels.forEach(regName => {
            const r = res.regMap[regName] || {};
            const actN = r.actN || 0;
            const actSum = r.actSum || 0;
            const actProm = actN > 0 ? (actSum / actN) : 0;

            const corN = r.corN || 0;
            const corSum = r.corSum || 0;
            const corProm = corN > 0 ? (corSum / corN) : 0;

            const secBuz = r.nBuzon > 0 ? (r.sumBuzon / r.nBuzon) : 0;
            const secBol = r.nBolson > 0 ? (r.sumBolson / r.nBolson) : 0;

            const globN = r.nCreacionAten || 0;
            const globSum = r.sumCreacionAten || 0;
            const globProm = globN > 0 ? (globSum / globN) : 0;

            // Métricas NO Rechazadas (Aprobadas)
            const apActN = r.aprobActN || 0;
            const apActSum = r.aprobActSum || 0;
            const apActProm = apActN > 0 ? (apActSum / apActN) : 0;

            const apCorN = r.aprobCorN || 0;
            const apCorSum = r.aprobCorSum || 0;
            const apCorProm = apCorN > 0 ? (apCorSum / apCorN) : 0;

            const apGlobN = r.aprobNCreacionAten || 0;
            const apGlobSum = r.aprobSumCreacionAten || 0;
            const apGlobProm = apGlobN > 0 ? (apGlobSum / apGlobN) : 0;

            totActN += actN; totActSum += actSum;
            totCorN += corN; totCorSum += corSum;
            totBuzN += (r.nBuzon || 0); totBuzSum += (r.sumBuzon || 0);
            totBolN += (r.nBolson || 0); totBolSum += (r.sumBolson || 0);
            totGlobN += globN; totGlobSum += globSum;

            totAprobActN += apActN; totAprobActSum += apActSum;
            totAprobCorN += apCorN; totAprobCorSum += apCorSum;
            totAprobGlobN += apGlobN; totAprobGlobSum += apGlobSum;

            const colorClass = regColors[regName] || 'text-slate-900 bg-slate-50 border-slate-200';

            htmlAten += `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 font-bold text-slate-900">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${colorClass}">
                        <i data-lucide="map-pin" class="w-3.5 h-3.5"></i> ${regName}
                    </span>
                </td>
                <td class="p-2.5 text-right font-mono text-slate-700 bg-slate-50/30">${formatAdaptiveTime(actProm)}</td>
                <td class="p-2.5 text-right font-mono text-slate-700 bg-slate-50/30">${formatAdaptiveTime(corProm)}</td>
                <td class="p-2.5 text-right font-bold text-indigo-900 bg-indigo-50/50 border-r border-slate-200">
                    ${formatAdaptiveTime(globProm)}
                </td>
                <td class="p-2.5 text-right font-bold text-sky-800 bg-sky-50/40">${formatAdaptiveTime(apActProm)}</td>
                <td class="p-2.5 text-right font-bold text-violet-800 bg-violet-50/40">${formatAdaptiveTime(apCorProm)}</td>
                <td class="p-2.5 text-right font-black text-emerald-800 bg-emerald-50/70 border-r border-slate-200">
                    <span class="inline-block px-2 py-0.5 rounded bg-emerald-100/80 border border-emerald-200">${formatAdaptiveTime(apGlobProm)}</span>
                </td>
                <td class="p-2.5 text-right font-semibold text-blue-700">${formatAdaptiveTime(secBuz)}</td>
                <td class="p-2.5 text-right font-semibold text-slate-700">${formatAdaptiveTime(secBol)}</td>
            </tr>`;
        });
        tbAten.innerHTML = htmlAten;

        const totActProm = totActN > 0 ? (totActSum / totActN) : 0;
        const totCorProm = totCorN > 0 ? (totCorSum / totCorN) : 0;
        const totBuzProm = totBuzN > 0 ? (totBuzSum / totBuzN) : 0;
        const totBolProm = totBolN > 0 ? (totBolSum / totBolN) : 0;
        const totGlobProm = totGlobN > 0 ? (totGlobSum / totGlobN) : 0;

        const totAprobActProm = totAprobActN > 0 ? (totAprobActSum / totAprobActN) : 0;
        const totAprobCorProm = totAprobCorN > 0 ? (totAprobCorSum / totAprobCorN) : 0;
        const totAprobGlobProm = totAprobGlobN > 0 ? (totAprobGlobSum / totAprobGlobN) : 0;

        tbAtenFoot.innerHTML = `
        <tr class="bg-slate-100 border-t-2 border-slate-300">
            <td class="p-3 font-black text-slate-900 flex items-center gap-1.5">
                <i data-lucide="globe" class="w-4 h-4 text-indigo-700"></i> TOTAL NACIONAL
            </td>
            <td class="p-2.5 text-right font-bold text-slate-900 bg-slate-200/50">${formatAdaptiveTime(totActProm)}</td>
            <td class="p-2.5 text-right font-bold text-slate-900 bg-slate-200/50">${formatAdaptiveTime(totCorProm)}</td>
            <td class="p-2.5 text-right font-black text-indigo-950 bg-indigo-100/80 border-r border-slate-300">
                ${formatAdaptiveTime(totGlobProm)}
            </td>
            <td class="p-2.5 text-right font-black text-sky-900 bg-sky-100/70">${formatAdaptiveTime(totAprobActProm)}</td>
            <td class="p-2.5 text-right font-black text-violet-900 bg-violet-100/70">${formatAdaptiveTime(totAprobCorProm)}</td>
            <td class="p-2.5 text-right font-black text-emerald-950 bg-emerald-100 border-r border-slate-300">
                <span class="inline-block px-2.5 py-1 rounded-md bg-emerald-600 text-white shadow-xs">${formatAdaptiveTime(totAprobGlobProm)}</span>
            </td>
            <td class="p-2.5 text-right font-bold text-blue-900">${formatAdaptiveTime(totBuzProm)}</td>
            <td class="p-2.5 text-right font-bold text-slate-900">${formatAdaptiveTime(totBolProm)}</td>
        </tr>`;
    }

    // Renderizar la Tabla Histórica por Fechas / Meses (A la Par: Total vs No Rechazadas)
    const tbFechas = document.getElementById('tableFechasComparativa');
    const tbFechasFoot = document.getElementById('tableFechasComparativaFoot');
    if (tbFechas && tbFechasFoot) {
        let htmlFechas = '';
        let totMCasos = 0, totMSumBuz = 0, totMNBuz = 0, totMSumAten = 0, totMNAten = 0, totMSumCic = 0, totMNCic = 0;
        let totMApCasos = 0, totMApSumBuz = 0, totMApNBuz = 0, totMApSumAten = 0, totMApNAten = 0, totMApSumCic = 0, totMApNCic = 0;

        activeMonths.forEach(m => {
            const mObj = res.monthMap[m] || {};
            const casos = mObj.casos || 0;
            const secBuz = mObj.nBuzon > 0 ? (mObj.sumBuzon / mObj.nBuzon) : 0;
            const secAten = mObj.nAten > 0 ? (mObj.sumAten / mObj.nAten) : 0;
            const secCic = mObj.nCiclo > 0 ? (mObj.sumCiclo / mObj.nCiclo) : 0;

            const apCasos = mObj.aprobCasos || 0;
            const pctExito = casos > 0 ? ((apCasos / casos) * 100).toFixed(1) : '0.0';
            const apSecBuz = mObj.aprobNBuzon > 0 ? (mObj.aprobSumBuzon / mObj.aprobNBuzon) : 0;
            const apSecAten = mObj.aprobNAten > 0 ? (mObj.aprobSumAten / mObj.aprobNAten) : 0;
            const apSecCic = mObj.aprobNCiclo > 0 ? (mObj.aprobSumCiclo / mObj.aprobNCiclo) : 0;

            totMCasos += casos;
            totMSumBuz += (mObj.sumBuzon || 0); totMNBuz += (mObj.nBuzon || 0);
            totMSumAten += (mObj.sumAten || 0); totMNAten += (mObj.nAten || 0);
            totMSumCic += (mObj.sumCiclo || 0); totMNCic += (mObj.nCiclo || 0);

            totMApCasos += apCasos;
            totMApSumBuz += (mObj.aprobSumBuzon || 0); totMApNBuz += (mObj.aprobNBuzon || 0);
            totMApSumAten += (mObj.aprobSumAten || 0); totMApNAten += (mObj.aprobNAten || 0);
            totMApSumCic += (mObj.aprobSumCiclo || 0); totMApNCic += (mObj.aprobNCiclo || 0);

            htmlFechas += `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                    <i data-lucide="calendar" class="w-3.5 h-3.5 text-indigo-600"></i> ${m}
                </td>
                <td class="p-2 text-right font-mono text-slate-600 border-l border-slate-200">${casos.toLocaleString()}</td>
                <td class="p-2 text-right font-mono text-blue-700">${formatAdaptiveTime(secBuz)}</td>
                <td class="p-2 text-right font-bold text-indigo-900 bg-indigo-50/50">${formatAdaptiveTime(secAten)}</td>
                <td class="p-2 text-right font-bold text-purple-900 bg-purple-50/50 border-r border-slate-200">${formatAdaptiveTime(secCic)}</td>
                
                <td class="p-2 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40">
                    ${apCasos.toLocaleString()} <span class="text-[10px] font-normal text-emerald-600">(${pctExito}%)</span>
                </td>
                <td class="p-2 text-right font-mono text-blue-800 bg-blue-50/20">${formatAdaptiveTime(apSecBuz)}</td>
                <td class="p-2 text-right font-black text-emerald-900 bg-emerald-50">${formatAdaptiveTime(apSecAten)}</td>
                <td class="p-2 text-right font-black text-purple-950 bg-purple-50/60">${formatAdaptiveTime(apSecCic)}</td>
            </tr>`;
        });
        tbFechas.innerHTML = htmlFechas;

        const totMSecBuz = totMNBuz > 0 ? (totMSumBuz / totMNBuz) : 0;
        const totMSecAten = totMNAten > 0 ? (totMSumAten / totMNAten) : 0;
        const totMSecCic = totMNCic > 0 ? (totMSumCic / totMNCic) : 0;

        const totPctExito = totMCasos > 0 ? ((totMApCasos / totMCasos) * 100).toFixed(1) : '0.0';
        const totMApSecBuz = totMApNBuz > 0 ? (totMApSumBuz / totMApNBuz) : 0;
        const totMApSecAten = totMApNAten > 0 ? (totMApSumAten / totMApNAten) : 0;
        const totMApSecCic = totMApNCic > 0 ? (totMApSumCic / totMApNCic) : 0;

        tbFechasFoot.innerHTML = `
        <tr class="bg-slate-100 border-t-2 border-slate-300">
            <td class="p-3 font-black text-slate-900 flex items-center gap-1.5">
                <i data-lucide="globe" class="w-4 h-4 text-indigo-700"></i> TOTAL HISTÓRICO
            </td>
            <td class="p-2 text-right font-mono font-bold text-slate-900 border-l border-slate-300">${totMCasos.toLocaleString()}</td>
            <td class="p-2 text-right font-bold text-blue-900">${formatAdaptiveTime(totMSecBuz)}</td>
            <td class="p-2 text-right font-black text-indigo-950 bg-indigo-100/70">${formatAdaptiveTime(totMSecAten)}</td>
            <td class="p-2 text-right font-black text-purple-950 bg-purple-100/70 border-r border-slate-300">${formatAdaptiveTime(totMSecCic)}</td>

            <td class="p-2 text-right font-mono font-black text-emerald-950 bg-emerald-100/80">
                ${totMApCasos.toLocaleString()} <span class="text-[10px] font-bold text-emerald-700">(${totPctExito}%)</span>
            </td>
            <td class="p-2 text-right font-bold text-blue-950 bg-blue-100/50">${formatAdaptiveTime(totMApSecBuz)}</td>
            <td class="p-2 text-right font-black text-emerald-950 bg-emerald-100">${formatAdaptiveTime(totMApSecAten)}</td>
            <td class="p-2 text-right font-black text-purple-950 bg-purple-100">${formatAdaptiveTime(totMApSecCic)}</td>
        </tr>`;
    }

    const tbRegD = document.getElementById('tableRegionalDinamica');
    if (tbRegD) {
        let htmlRegD = '';
        ['CENTRAL', 'OCCIDENTE', 'SUR', 'NORORIENTE'].forEach(regName => {
            const r = res.regMap[regName] || { casos: 0, aprob: 0, aprob_dir: 0, rech: 0, nBuzon: 0, sumBuzon: 0, nBolson: 0, sumBolson: 0, nAte: 0, sumAte: 0, nCiclo: 0, sumCiclo: 0, sla1d: 0 };
            const pctAp = r.casos > 0 ? ((r.aprob / r.casos)*100).toFixed(1) : '0.0';
            const pctFTR = r.casos > 0 ? ((r.aprob_dir / r.casos)*100).toFixed(1) : '0.0';
            const pctRe = r.casos > 0 ? ((r.rech / r.casos)*100).toFixed(1) : '0.0';
            const secBuz = r.nBuzon > 0 ? (r.sumBuzon / r.nBuzon) : 0;
            const secBol = r.nBolson > 0 ? (r.sumBolson / r.nBolson) : 0;
            const secAte = r.nAte > 0 ? (r.sumAte / r.nAte) : 0;
            const secCic = r.nCiclo > 0 ? (r.sumCiclo / r.nCiclo) : 0;
            const sla1Pct = r.nCiclo > 0 ? ((r.sla1d / r.nCiclo)*100).toFixed(1) : '0.0';

            htmlRegD += `<tr>
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
        tbRegD.innerHTML = htmlRegD;
    }

    // Render Tabla de Balance de Carga & Ratio de Sobrecarga Regional
    const tbSobrecarga = document.getElementById('tableSobrecargaRegional');
    if (tbSobrecarga) {
        let totalDemanda = 0;
        let totalRevisores = 0;
        const regData = ['CENTRAL', 'OCCIDENTE', 'SUR', 'NORORIENTE'].map(reg => {
            const r = res.regMap[reg] || { casos: 0, ops: {} };
            const numOps = r.ops ? Object.keys(r.ops).length : 0;
            totalDemanda += r.casos;
            totalRevisores += numOps;
            return {
                reg: reg,
                casos: r.casos,
                revisores: numOps,
                cargaMedia: numOps > 0 ? Math.round(r.casos / numOps) : 0
            };
        });

        let htmlSobrecarga = '';
        regData.forEach(item => {
            const pctDemanda = totalDemanda > 0 ? ((item.casos / totalDemanda) * 100) : 0;
            const pctRevisores = totalRevisores > 0 ? ((item.revisores / totalRevisores) * 100) : 0;
            const ratioSobrecarga = pctRevisores > 0 ? (pctDemanda / pctRevisores) : 1.0;
            
            let statusBadge = '';
            if (ratioSobrecarga > 1.15) {
                statusBadge = '<span class="bg-rose-100 text-rose-800 text-[11px] font-bold px-2.5 py-1 rounded-md border border-rose-200">🔴 Sobrecarga Severa</span>';
            } else if (ratioSobrecarga < 0.85) {
                statusBadge = '<span class="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-1 rounded-md border border-blue-200">🔵 Capacidad Holgada</span>';
            } else {
                statusBadge = '<span class="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-md border border-emerald-200">🟢 Balance Óptimo</span>';
            }

            const ratioClass = ratioSobrecarga > 1.15 ? 'text-rose-700 font-black' : (ratioSobrecarga < 0.85 ? 'text-blue-700 font-bold' : 'text-emerald-700 font-bold');

            htmlSobrecarga += `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-3 font-bold text-slate-900 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full ${ratioSobrecarga > 1.15 ? 'bg-rose-500' : 'bg-emerald-500'}"></span>
                    <span>${item.reg}</span>
                </td>
                <td class="p-3 text-right font-mono font-bold text-slate-800">${item.casos.toLocaleString()}</td>
                <td class="p-3 text-right font-bold text-slate-700">${pctDemanda.toFixed(1)}%</td>
                <td class="p-3 text-right font-mono font-semibold text-slate-700">${item.revisores} revisores</td>
                <td class="p-3 text-right font-mono font-bold text-indigo-700 bg-indigo-50/40">${item.cargaMedia.toLocaleString()} casos/rev</td>
                <td class="p-3 text-right font-mono text-slate-600">${pctRevisores.toFixed(1)}%</td>
                <td class="p-3 text-right font-mono ${ratioClass} bg-slate-50">${ratioSobrecarga.toFixed(2)}x</td>
                <td class="p-3 text-center">${statusBadge}</td>
            </tr>`;
        });
        tbSobrecarga.innerHTML = htmlSobrecarga;

        if (chartSobrecargaBarInst) {
            const pctDemandaArr = regData.map(item => totalDemanda > 0 ? parseFloat(((item.casos / totalDemanda) * 100).toFixed(1)) : 0);
            const pctRevisoresArr = regData.map(item => totalRevisores > 0 ? parseFloat(((item.revisores / totalRevisores) * 100).toFixed(1)) : 0);
            chartSobrecargaBarInst.data.datasets[0].data = pctDemandaArr;
            chartSobrecargaBarInst.data.datasets[1].data = pctRevisoresArr;
            chartSobrecargaBarInst.update('none');
        }
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
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

    // Diagnóstico de Horas Calendario vs Horas Hábiles (Horarios Inhábiles / Fin de Semana)
    if (res.offHoursStats) {
        const elCal = document.getElementById('kpiCicloCalProm');
        if (elCal) elCal.innerText = res.offHoursStats.horasCalProm.toFixed(1) + ' horas';
        const elHab = document.getElementById('kpiCicloHabProm');
        if (elHab) elHab.innerText = res.offHoursStats.horasHabProm.toFixed(2) + ' horas';
        const elFuera = document.getElementById('kpiCicloFueraProm');
        if (elFuera) elFuera.innerText = res.offHoursStats.horasFueraJornada.toFixed(1) + ' h (' + res.offHoursStats.pctFueraJornada.toFixed(1) + '%)';
    }

    // Descomposición del Cuello de Botella: Espera Pasiva en Cola vs Dictamen Activo
    if (res.queueDecompStats) {
        const pEsp = res.queueDecompStats.pctEsperaPasiva;
        const pDic = res.queueDecompStats.pctDictamenActivo;
        const strEsp = formatAdaptiveTime(res.queueDecompStats.secEsperaPasiva);
        const strDic = formatAdaptiveTime(res.queueDecompStats.secDictamenActivo);

        const elPEsp = document.getElementById('kpiEsperaPasivaPct');
        if (elPEsp) elPEsp.innerText = pEsp.toFixed(1) + '%';
        const elHEsp = document.getElementById('kpiEsperaPasivaHoras');
        if (elHEsp) elHEsp.innerText = strEsp;

        const elPDic = document.getElementById('kpiDictamenActivoPct');
        if (elPDic) elPDic.innerText = pDic.toFixed(1) + '%';
        const elSDic = document.getElementById('kpiDictamenActivoSeg');
        if (elSDic) elSDic.innerText = strDic;

        const elBEsp = document.getElementById('barEsperaPasiva');
        if (elBEsp) elBEsp.style.width = pEsp + '%';
        const elBDic = document.getElementById('barDictamenActivo');
        if (elBDic) elBDic.style.width = pDic + '%';

        const elCardEsp = document.getElementById('cardEsperaPasivaVal');
        if (elCardEsp) elCardEsp.innerText = `${strEsp} (${pEsp.toFixed(1)}%)`;
        const elCardDic = document.getElementById('cardDictamenActivoVal');
        if (elCardDic) elCardDic.innerText = `${strDic} (${pDic.toFixed(1)}%)`;
    }

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
        <tr class="bg-indigo-50/60 font-semibold border-y border-indigo-100">
            <td class="p-3 font-bold text-indigo-950 flex items-center gap-1.5">
                <i data-lucide="clock" class="w-3.5 h-3.5 text-indigo-600"></i> Tiempo hasta 1ª Atención (Apertura)
            </td>
            <td class="p-3 text-indigo-800 font-mono text-[11px]">Σ(FechaRevision - FechaCreacion) / N</td>
            <td class="p-3 text-right font-mono text-indigo-900">${res.nCreacionAtenHab.toLocaleString()}</td>
            <td class="p-3 text-right font-black text-indigo-700 bg-indigo-100/50">${formatAdaptiveTime(res.nCreacionAtenHab > 0 ? (res.sumCreacionAtenHab/res.nCreacionAtenHab) : 0)}</td>
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
    // 1. Rondas de Identificación Dinámicas
    const elR1AprobCnt = document.getElementById('dynRonda1raAprobCnt');
    if (elR1AprobCnt) {
        const pct1Aprob = res.totalCasos > 0 ? ((res.totalAprobDirectas / res.totalCasos)*100).toFixed(1) : '0.0';
        elR1AprobCnt.innerText = res.totalAprobDirectas.toLocaleString();
        document.getElementById('dynRonda1raAprobPct').innerText = `${pct1Aprob}% del universo`;
    }

    const elR1RechCnt = document.getElementById('dynRonda1raRechCnt');
    if (elR1RechCnt) {
        const pct1Rech = res.totalCasos > 0 ? ((res.totalRechazos / res.totalCasos)*100).toFixed(1) : '0.0';
        elR1RechCnt.innerText = res.totalRechazos.toLocaleString();
        document.getElementById('dynRonda1raRechPct').innerText = `${pct1Rech}% incidencias`;
    }

    const elR2SubCnt = document.getElementById('dynRonda2daSubCnt');
    if (elR2SubCnt) {
        const pct2Sub = res.totalRechazos > 0 ? ((res.totalAprobSubsanadas / res.totalRechazos)*100).toFixed(1) : '0.0';
        elR2SubCnt.innerText = res.totalAprobSubsanadas.toLocaleString();
        document.getElementById('dynRonda2daSubPct').innerText = `${pct2Sub}% subsanaron`;
    }

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

    // 2. Diagnóstico del Costo Oculto de Re-trabajo
    if (res.retrabajoStats) {
        const elRCasos = document.getElementById('kpiRetrabajoCasos');
        if (elRCasos) elRCasos.innerText = res.retrabajoStats.casos.toLocaleString() + ' casos';
        const elRHoras = document.getElementById('kpiRetrabajoHoras');
        if (elRHoras) elRHoras.innerText = res.retrabajoStats.horasHombre.toFixed(1) + ' horas';
        const elRJornadas = document.getElementById('kpiRetrabajoJornadas');
        if (elRJornadas) elRJornadas.innerText = res.retrabajoStats.jornadas8h.toFixed(1) + ' jornadas';
    }

    // 3. Matriz de Rescate vs Deserción por Causal Taxonómica
    const tbRescate = document.getElementById('tableRescateCausal');
    if (tbRescate && res.causalOutcomeMap) {
        tbRescate.innerHTML = '';
        const causalEntries = Object.keys(res.causalOutcomeMap).map(k => {
            const item = res.causalOutcomeMap[k];
            const tasaRescate = item.total > 0 ? ((item.subsanadas / item.total) * 100) : 0;
            const tasaAbandono = item.total > 0 ? ((item.abandonadas / item.total) * 100) : 0;
            return {
                causal: k,
                total: item.total,
                subsanadas: item.subsanadas,
                abandonadas: item.abandonadas,
                bloqueadas: item.bloqueadas,
                tasaRescate: tasaRescate,
                tasaAbandono: tasaAbandono
            };
        }).sort((a, b) => b.total - a.total);

        let htmlRescate = '';
        causalEntries.forEach(item => {
            let badgeRescate = '';
            if (item.tasaRescate >= 70) {
                badgeRescate = '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">Alta Recuperación</span>';
            } else if (item.tasaRescate >= 40) {
                badgeRescate = '<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">Fricción Moderada</span>';
            } else {
                badgeRescate = '<span class="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">Fuga / Fricción Crítica</span>';
            }

            htmlRescate += `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-3 font-semibold text-slate-800">${item.causal}</td>
                <td class="p-3 text-right font-mono font-bold text-slate-900">${item.total.toLocaleString()}</td>
                <td class="p-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">${item.subsanadas.toLocaleString()}</td>
                <td class="p-3 text-right font-bold text-emerald-800">${item.tasaRescate.toFixed(1)}%</td>
                <td class="p-3 text-right font-mono text-rose-700">${item.abandonadas.toLocaleString()}</td>
                <td class="p-3 text-right font-mono text-slate-500">${item.bloqueadas.toLocaleString()}</td>
                <td class="p-3 text-center">${badgeRescate}</td>
            </tr>`;
        });
        tbRescate.innerHTML = htmlRescate;
    }

    // 4. Índice de Fricción por Reincidencia (Single-Touch vs Multi-Touch Bounce)
    if (res.reincidenciaStats) {
        const sCasos = res.reincidenciaStats.singleTouchCasos;
        const mCasos = res.reincidenciaStats.multiTouchCasos;
        const totRecup = sCasos + mCasos;
        const pctSingle = totRecup > 0 ? ((sCasos / totRecup) * 100) : 73.5;
        const pctMulti = totRecup > 0 ? (100 - pctSingle) : 26.5;

        const elSPct = document.getElementById('kpiSingleTouchPct');
        if (elSPct) elSPct.innerText = pctSingle.toFixed(1) + '%';
        const elSCnt = document.getElementById('kpiSingleTouchCasos');
        if (elSCnt) elSCnt.innerText = `${sCasos.toLocaleString()} casos recuperados`;

        const elMPct = document.getElementById('kpiMultiTouchPct');
        if (elMPct) elMPct.innerText = pctMulti.toFixed(1) + '%';
        const elMCnt = document.getElementById('kpiMultiTouchCasos');
        if (elMCnt) elMCnt.innerText = `${mCasos.toLocaleString()} casos reincidentes`;

        const elTR = document.getElementById('kpiTasaReincidencia');
        if (elTR) elTR.innerText = res.reincidenciaStats.pctReincidencia.toFixed(1) + '%';
    }

    if (chartDestinoRechInst) {
        chartDestinoRechInst.data.datasets[0].data = [res.rechAprob, res.rechAband, res.rechBloq];
        chartDestinoRechInst.update('none');
    }

    document.getElementById('lblFugaInicialCnt').innerText = res.totalNoConf.toLocaleString();
    document.getElementById('lblFugaInicialPct').innerText = res.totalCasos > 0 ? ((res.totalNoConf / res.totalCasos)*100).toFixed(1) + '% de la selección' : '0%';
    document.getElementById('lblFugaRechCnt').innerText = res.rechAband.toLocaleString();
    document.getElementById('lblFugaRechPct').innerText = res.totalCasos > 0 ? ((res.rechAband / res.totalCasos)*100).toFixed(1) + '% de la selección' : '0%';

    if (chartMacroInst) {
        chartMacroInst.data.labels = Object.keys(res.macCounts);
        chartMacroInst.data.datasets[0].data = Object.values(res.macCounts);
        chartMacroInst.update('none');
    }

    const tbTaxD = document.getElementById('tableTaxonomiaDinamica');
    if (tbTaxD) {
        let htmlTax = '';
        DATA.taxonomia.forEach(t => {
            const cnt = res.subcatCounts[t.ID_Subcategoria] || 0;
            htmlTax += `<tr>
                <td class="p-3 font-mono font-bold text-blue-700">${t.ID_Subcategoria}</td>
                <td class="p-3 font-mono text-slate-500">${t.ID_Macro}</td>
                <td class="p-3 font-medium text-slate-800">${t.Macro_Familia}</td>
                <td class="p-3 text-slate-700">${t.Subcategoria_Granular}</td>
                <td class="p-3 text-right font-black text-slate-900">${cnt.toLocaleString()}</td>
            </tr>`;
        });
        tbTaxD.innerHTML = htmlTax;
    }
}

let cachedEvaluatedOps = [];

function renderFilteredOperadoresTable() {
    const regBadgeStyles = {
        'CENTRAL': 'bg-blue-100 text-blue-800 border-blue-200',
        'OCCIDENTE': 'bg-amber-100 text-amber-800 border-amber-200',
        'SUR': 'bg-emerald-100 text-emerald-800 border-emerald-200',
        'NORORIENTE': 'bg-purple-100 text-purple-800 border-purple-200'
    };

    const selCuadrante = document.getElementById('selCuadranteOp');
    const selectedQ = selCuadrante ? selCuadrante.value : 'TODOS';

    let displayOps = cachedEvaluatedOps;
    if (selectedQ !== 'TODOS') {
        displayOps = cachedEvaluatedOps.filter(o => o.cuadrante === selectedQ);
    }

    const tbOpD = document.getElementById('tableOperadoresDinamica');
    if (tbOpD) {
        let htmlOps = '';
        displayOps.slice(0, 30).forEach(o => {
            const badgeClass = regBadgeStyles[o.region] || 'bg-slate-100 text-slate-800 border-slate-200';
            htmlOps += `<tr>
                <td class="p-2.5 font-bold text-slate-900 flex items-center gap-1.5">${o.op}</td>
                <td class="p-2.5 text-center">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeClass}">${o.region}</span>
                </td>
                <td class="p-2.5 text-right font-mono font-bold text-slate-900 bg-slate-50">${o.total.toLocaleString()}</td>
                <td class="p-2.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50">${o.aprob_tot.toLocaleString()}</td>
                <td class="p-2.5 text-right font-mono text-emerald-600">${o.aprob_dir.toLocaleString()}</td>
                <td class="p-2.5 text-right font-mono text-amber-600 font-semibold">${o.aprob_sub.toLocaleString()}</td>
                <td class="p-2.5 text-right font-mono font-bold text-rose-600">${o.rech_def.toLocaleString()}</td>
                <td class="p-2.5 text-right font-mono font-bold text-rose-700 bg-rose-50/40">${o.rech_eventos.toLocaleString()}</td>
                <td class="p-2.5 text-right font-black text-blue-700">${o.tasa_incidencia}%</td>
                <td class="p-2.5 text-right font-mono font-black text-amber-800 bg-amber-50/70 border-l border-slate-100">${o.tiempoStr}</td>
            </tr>`;
        });
        if (displayOps.length === 0) {
            htmlOps = `<tr><td colspan="10" class="p-6 text-center text-slate-400">No se encontraron revisores en este cuadrante para los filtros seleccionados.</td></tr>`;
        }
        tbOpD.innerHTML = htmlOps;
    }
}

window.selectCuadranteQuick = function(qId) {
    const sel = document.getElementById('selCuadranteOp');
    if (sel) {
        sel.value = qId;
        renderFilteredOperadoresTable();
    }
};

window.filterOperadoresCuadrante = function() {
    renderFilteredOperadoresTable();
};

function renderTabGestion(res) {
    const speedLabels = ['<=2s', '2-5s', '5-15s', '15-60s', '1-5m', '>5m'];
    const speedRechPcts = speedLabels.map(lbl => {
        const obj = res.speedMap[lbl];
        return obj.casos > 0 ? parseFloat(((obj.rech / obj.casos)*100).toFixed(1)) : 0;
    });

    if (chartSpeedVsRechazoInst) {
        chartSpeedVsRechazoInst.data.labels = ['Ultra-Rápido (≤2s)', 'Rápido (2-5s)', 'Moderado (5-15s)', 'Analítico (15-60s)', 'Detallado (1-5m)', 'Pausa/Audit (>5m)'];
        chartSpeedVsRechazoInst.data.datasets[0].data = speedRechPcts;
        chartSpeedVsRechazoInst.update('none');
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
        chartVolumeVsSpeedInst.update('none');
    }

    // 1. RENDER TABLA DE CAPACIDAD DIARIA EN JORNADA HÁBIL (8H)
    const fAnio = document.getElementById('selAnio') ? document.getElementById('selAnio').value : 'TODOS';
    const fReg = document.getElementById('selRegion') ? document.getElementById('selRegion').value : 'TODAS';
    const capList = (window.DATA && window.DATA.operadores_productividad_8h) || [];

    const filteredCap = capList.filter(row => {
        const matchAnio = (fAnio === 'TODOS') ? (row.Anio === 'TODOS') : (String(row.Anio) === String(fAnio));
        const matchReg = (fReg === 'TODAS') ? (row.Region === 'TODAS') : (String(row.Region) === String(fReg));
        return matchAnio && matchReg;
    }).sort((a, b) => b.Total_8h - a.Total_8h);

    const tbCap = document.getElementById('tableProductividadDiaria');
    if (tbCap) {
        let htmlCap = '';
        const displayCap = filteredCap.slice(0, 10);
        displayCap.forEach((row, idx) => {
            let medal = `${idx + 1}.`;
            if (idx === 0) medal = '🥇';
            else if (idx === 1) medal = '🥈';
            else if (idx === 2) medal = '🥉';

            htmlCap += `<tr>
                <td class="p-3 font-semibold text-slate-900 flex items-center gap-2">
                    <span class="text-sm">${medal}</span>
                    <span>${row.Revisor}</span>
                </td>
                <td class="p-3 text-center font-bold text-slate-900 bg-slate-50/80">${row.Promedio_Diario} gestiones / día</td>
                <td class="p-3 text-center text-slate-600 font-mono">${row.Mediana_Diaria} / día</td>
                <td class="p-3 text-center font-black text-purple-700 bg-purple-50/40">${row.Record_Dia} casos</td>
                <td class="p-3 text-center text-slate-600 font-mono">${row.Dias_Activos} días</td>
                <td class="p-3 text-right font-black text-slate-900">${Number(row.Total_8h).toLocaleString()} casos</td>
            </tr>`;
        });
        tbCap.innerHTML = htmlCap;

        // Actualizar mini KPIs de capacidad
        const regLabel = fReg === 'TODAS' ? 'Nacional' : `Regional ${fReg}`;
        const anioLabel = fAnio === 'TODOS' ? '2025 - 2026' : fAnio;
        const ctxPill = document.getElementById('lblCapacidadContexto');
        if (ctxPill) ctxPill.innerText = `${regLabel} • ${anioLabel}`;

        const elRevisores = document.getElementById('kpiCapRevisores');
        if (elRevisores) elRevisores.innerText = `${filteredCap.length} revisores`;

        const elTopProm = document.getElementById('kpiCapTopProm');
        if (elTopProm) elTopProm.innerText = displayCap.length > 0 ? `${displayCap[0].Promedio_Diario} / día` : '-';

        const elMediana = document.getElementById('kpiCapMediana');
        if (elMediana) {
            const medVals = displayCap.map(r => r.Mediana_Diaria).sort((a,b) => a-b);
            const mid = Math.floor(medVals.length / 2);
            const med = medVals.length > 0 ? (medVals.length % 2 !== 0 ? medVals[mid] : ((medVals[mid - 1] + medVals[mid]) / 2).toFixed(1)) : '-';
            elMediana.innerText = `${med} / día`;
        }

        const elMaxRec = document.getElementById('kpiCapMaxRecord');
        if (elMaxRec) {
            const maxRec = displayCap.reduce((max, r) => Math.max(max, r.Record_Dia), 0);
            elMaxRec.innerText = `${maxRec} casos`;
        }
    }

    // 2. RENDER MATRIZ DE CUADRANTES Y TABLA DE OPERADORES
    let countQ1 = 0, countQ2 = 0, countQ3 = 0, countQ4 = 0;

    cachedEvaluatedOps = Object.keys(res.opMap).map(k => {
        const obj = res.opMap[k];
        const pctIncidencia = obj.total > 0 ? ((obj.rech_eventos / obj.total)*100).toFixed(1) : '0.0';
        const numIncidencia = parseFloat(pctIncidencia);
        
        let mainReg = 'MULTIRREGIONAL';
        let maxRegCasos = 0;
        if (obj.regions) {
            Object.keys(obj.regions).forEach(rg => {
                if (obj.regions[rg] > maxRegCasos) {
                    maxRegCasos = obj.regions[rg];
                    mainReg = rg;
                }
            });
        }
        
        const avgSec = (obj.nAte > 0 && obj.sumAte > 0) ? (obj.sumAte / obj.nAte) : 0;
        const tiempoStr = typeof formatAdaptiveTime === 'function' ? formatAdaptiveTime(avgSec) : `${avgSec.toFixed(1)}s`;

        // Asignación de Cuadrante (Velocidad vs Incidencia/Rechazo)
        let cuadrante = 'Q1';
        if (avgSec <= 4.0 && numIncidencia <= 25.0) {
            cuadrante = 'Q1';
            countQ1++;
        } else if (avgSec > 4.0 && numIncidencia <= 25.0) {
            cuadrante = 'Q2';
            countQ2++;
        } else if (avgSec <= 3.0 && numIncidencia > 25.0) {
            cuadrante = 'Q3';
            countQ3++;
        } else {
            cuadrante = 'Q4';
            countQ4++;
        }

        return {
            op: k, region: mainReg, total: obj.total, aprob_tot: obj.aprob,
            aprob_dir: obj.aprob_dir, aprob_sub: obj.aprob_sub,
            rech_def: obj.rech_def, rech_eventos: obj.rech_eventos,
            tasa_incidencia: pctIncidencia,
            avgSec: avgSec,
            tiempoStr: tiempoStr,
            cuadrante: cuadrante
        };
    }).sort((a,b) => b.total - a.total);

    // Actualizar Badges de Cuadrantes
    const bQ1 = document.getElementById('badgeCountQ1');
    if (bQ1) bQ1.innerText = countQ1;
    const bQ2 = document.getElementById('badgeCountQ2');
    if (bQ2) bQ2.innerText = countQ2;
    const bQ3 = document.getElementById('badgeCountQ3');
    if (bQ3) bQ3.innerText = countQ3;
    const bQ4 = document.getElementById('badgeCountQ4');
    if (bQ4) bQ4.innerText = countQ4;

    // 3. CÁLCULO DE DISPERSIÓN Y SUBJETIVIDAD INTER-REVISORES
    const validOpsForDisp = cachedEvaluatedOps.filter(o => o.total >= 50);
    if (validOpsForDisp.length > 1) {
        let minOp = validOpsForDisp[0];
        let maxOp = validOpsForDisp[0];
        let sumRates = 0;

        validOpsForDisp.forEach(o => {
            const r = parseFloat(o.tasa_incidencia);
            sumRates += r;
            if (r < parseFloat(minOp.tasa_incidencia)) minOp = o;
            if (r > parseFloat(maxOp.tasa_incidencia)) maxOp = o;
        });

        const meanRate = sumRates / validOpsForDisp.length;
        let sumSqDiff = 0;
        validOpsForDisp.forEach(o => {
            const diff = parseFloat(o.tasa_incidencia) - meanRate;
            sumSqDiff += (diff * diff);
        });
        const stdDev = Math.sqrt(sumSqDiff / validOpsForDisp.length);
        const cvPct = meanRate > 0 ? ((stdDev / meanRate) * 100) : 0;
        const rangePts = (parseFloat(maxOp.tasa_incidencia) - parseFloat(minOp.tasa_incidencia)).toFixed(1);

        const elDMin = document.getElementById('kpiDispMin');
        if (elDMin) elDMin.innerText = `${parseFloat(minOp.tasa_incidencia).toFixed(1)}%`;
        const elDMinOp = document.getElementById('kpiDispMinOp');
        if (elDMinOp) elDMinOp.innerText = `${minOp.op} (${minOp.region})`;

        const elDMax = document.getElementById('kpiDispMax');
        if (elDMax) elDMax.innerText = `${parseFloat(maxOp.tasa_incidencia).toFixed(1)}%`;
        const elDMaxOp = document.getElementById('kpiDispMaxOp');
        if (elDMaxOp) elDMaxOp.innerText = `${maxOp.op} (${maxOp.region})`;

        const elDRange = document.getElementById('kpiDispRange');
        if (elDRange) elDRange.innerText = `${rangePts} pts`;

        const elDCV = document.getElementById('kpiDispCV');
        if (elDCV) elDCV.innerText = `${cvPct.toFixed(1)}%`;
    }

    if (chartOpsInst) {
        chartOpsInst.data.labels = cachedEvaluatedOps.slice(0, 12).map(o => o.op);
        chartOpsInst.data.datasets[0].data = cachedEvaluatedOps.slice(0, 12).map(o => parseFloat(o.tasa_incidencia));
        chartOpsInst.update('none');
    }

    renderFilteredOperadoresTable();
}

let applyFiltersFrameId = null;
function applyFilters() {
    if (applyFiltersFrameId) {
        cancelAnimationFrame(applyFiltersFrameId);
    }
    applyFiltersFrameId = requestAnimationFrame(() => {
        applyFiltersImmediate();
        applyFiltersFrameId = null;
    });
}

function applyFiltersImmediate() {
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
    const fTipoPersona = document.getElementById('selTipoPersona') ? document.getElementById('selTipoPersona').value : 'TODAS';
    const fAnio = document.getElementById('selAnio').value;
    const fTrim = document.getElementById('selTrimestre') ? document.getElementById('selTrimestre').value : 'TODOS';
    const fMes = document.getElementById('selMes').value;
    const fReg = document.getElementById('selRegion').value;
    const fEst = document.getElementById('selEstado').value;
    const fMac = document.getElementById('selMacro').value;

    const res = processOlapFilters(DATA.cubo, fGes, fAnio, fTrim, fMes, fReg, fEst, fMac, fTipoPersona);

    // Actualizar resumen de filtros en versión móvil
    const elMobSummary = document.getElementById('mobileFilterSummary');
    if (elMobSummary) {
        const regStr = fReg === 'TODAS' ? 'Todas' : fReg;
        const anioStr = fAnio === 'TODOS' ? '' : ` • ${fAnio}`;
        const trimStr = fTrim === 'TODOS' ? '' : ` (${fTrim})`;
        const mesStr = fMes === 'TODOS' ? '' : ` • ${fMes}`;
        const tipoStr = fTipoPersona === 'TODAS' ? '' : (fTipoPersona === 'JURIDICA' ? ' • Sociedades' : ' • Individual');
        const gestShort = fGes === 'HUMANAS' ? 'Humanas' : (fGes.includes('ACTIVACIÓN') ? 'Activación' : 'Correo');
        elMobSummary.innerText = `${regStr} • ${gestShort}${tipoStr}${anioStr}${trimStr}${mesStr}`;
    }

    renderTabMacro(res);
    renderTabOperativo(res);
    renderTabTiempos(res);
    renderTabCalidad(res);
    renderTabGestion(res);

    filterAuditTable();

    const elapsed = (performance.now() - tStart).toFixed(1);
    if (typeof updateSystemStatus === 'function') {
        const totalBaseLabel = fGes === 'HUMANAS' ? '865.8k Gestiones Humanas' : '2.57M Registros';
        updateSystemStatus(`Motor OLAP Listo (${elapsed}ms) • ${totalBaseLabel}`, "ready");
    }
}

let auditDebounceTimer = null;
function debounceFilterAudit() {
    clearTimeout(auditDebounceTimer);
    auditDebounceTimer = setTimeout(() => {
        filterAuditTable();
    }, 150);
}
window.debounceFilterAudit = debounceFilterAudit;

function filterAuditTable() {
    const fGes = document.getElementById('selGestion').value;
    const fTipoPersona = document.getElementById('selTipoPersona') ? document.getElementById('selTipoPersona').value : 'TODAS';
    const fAnio = document.getElementById('selAnio') ? document.getElementById('selAnio').value : 'TODOS';
    const fTrim = document.getElementById('selTrimestre') ? document.getElementById('selTrimestre').value : 'TODOS';
    const fMes = document.getElementById('selMes') ? document.getElementById('selMes').value : 'TODOS';
    const fReg = document.getElementById('selRegion').value;
    const fEst = document.getElementById('selEstado').value;
    const fMac = document.getElementById('selMacro').value;
    const fSpeed = document.getElementById('selAuditSpeed') ? document.getElementById('selAuditSpeed').value : 'TODOS';
    const fSearch = document.getElementById('filterAudit') ? document.getElementById('filterAudit').value.toLowerCase().trim() : '';

    const targetTable = document.getElementById('auditTableDT') || document.getElementById('auditTable');
    if (!targetTable) return;

    if ($.fn.DataTable.isDataTable(targetTable)) {
        $(targetTable).DataTable().destroy();
    }

    const tbAud = targetTable.querySelector('tbody') || document.getElementById('tableAudit');
    if (!tbAud) return;

    let htmlBuffer = '';

    DATA.muestra_expedientes.forEach(e => {
        if (fGes === 'HUMANAS') {
            if (e._isReinicio || (e.Gestion && e.Gestion.toUpperCase().includes('REINICIO'))) return;
        } else if (fGes === 'ACTIVACIÓN') {
            if (!e._isActivacion && (!e.Gestion || !e.Gestion.toUpperCase().includes('ACTIVAC'))) return;
        } else if (fGes === 'CAMBIO DE CORREO ELECTRÓNICO') {
            if (!e._isCorreo && (!e.Gestion || !e.Gestion.toUpperCase().includes('CORREO'))) return;
        } else if (fGes !== 'TODAS') {
            if (e.Gestion !== fGes && !e.Gestion.toUpperCase().includes(fGes.toUpperCase())) return;
        }
        if (fTipoPersona === 'JURIDICA' && !e._isJuridica) return;
        if (fTipoPersona === 'INDIVIDUAL' && e._isJuridica) return;
        if (fReg !== 'TODAS' && e.Region !== fReg) return;
        if (fEst !== 'TODOS' && e.Estado !== fEst) return;
        if (fMac !== 'TODAS' && e.MacroFamilia !== fMac) return;

        // Filtro por Año en muestra
        if (fAnio !== 'TODOS' && e.FechaCreacion && !e.FechaCreacion.startsWith(fAnio)) return;

        // Filtro por Trimestre en muestra
        if (fTrim !== 'TODOS') {
            const trimVal = e._trimestre || (e.FechaCreacion && e.FechaCreacion.length >= 7 ? ((e.FechaCreacion.substring(5, 7) <= '03') ? 'Q1' : ((e.FechaCreacion.substring(5, 7) <= '06') ? 'Q2' : ((e.FechaCreacion.substring(5, 7) <= '09') ? 'Q3' : 'Q4'))) : null);
            if (trimVal !== fTrim) return;
        }

        // Filtro por Mes en muestra
        if (fMes !== 'TODOS' && e.FechaCreacion && !e.FechaCreacion.startsWith(fMes)) return;

        const secFinal = e.Atencion_Final_Sec;
        const secRech = e.Atencion_Rechazo_Sec;
        const ronda = e.Ronda_Revision;

        if (fSpeed === '1RA_DIRECTA' && ronda !== '1RA_DIRECTA') return;
        if (fSpeed === '1RA_RECHAZO' && ronda !== '1RA_RECHAZO') return;
        if (fSpeed === '2DA_SUBSANADA' && ronda !== '2DA_SUBSANADA') return;
        if (fSpeed === '3RA_LIMITE' && ronda !== '3RA_LIMITE') return;
        if (fSpeed === 'RECHAZO_RAPIDO' && (secRech == null || secRech > 2.0)) return;
        if (fSpeed === 'APROBACION_RAPIDA' && (secFinal == null || secFinal > 2.0 || e.TuvoRechazo)) return;

        if (fSearch && !(
            (e.NoGestion && e.NoGestion.toLowerCase().includes(fSearch)) ||
            (e.NIT && e.NIT.toLowerCase().includes(fSearch)) ||
            (e.U1 && e.U1.toLowerCase().includes(fSearch))
        )) return;

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

        htmlBuffer += `<tr>
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

    tbAud.innerHTML = htmlBuffer;

    dtAuditMainInstance = $(targetTable).DataTable({
        pageLength: 25,
        deferRender: true,
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
    if (!tbCombos || !DATA.combos) return;
    let htmlCombos = '';
    DATA.combos.forEach(c => {
        htmlCombos += `<tr>
            <td class="p-2.5 font-medium text-slate-800">${c.Combinacion_Multicausal_Frecuente}</td>
            <td class="p-2.5 text-right font-bold text-indigo-600">${Number(c.Frecuencia).toLocaleString()}</td>
            <td class="p-2.5 text-right text-slate-500">${c['% del Total']}%</td>
        </tr>`;
    });
    tbCombos.innerHTML = htmlCombos;
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
    
    let htmlAudit = '';
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
            
        htmlAudit += `<tr>
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
    tbody.innerHTML = htmlAudit;
    
    if (typeof jQuery !== 'undefined' && jQuery.fn.DataTable) {
        dtAuditDirectInst = jQuery('#tableAuditDirect').DataTable({
            pageLength: 10,
            deferRender: true,
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
