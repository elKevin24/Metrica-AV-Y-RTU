// Motor OLAP de Agregación y Formateo Estandarizado en HORAS (h)
function formatToHours(totalSeconds, includeDetail=true) {
    if (totalSeconds == null || isNaN(totalSeconds) || totalSeconds <= 0) return '0.00 h';
    const hrs = totalSeconds / 3600.0;
    
    if (hrs >= 1.0) {
        return hrs.toFixed(2) + ' horas';
    } else if (hrs >= 0.05) {
        const mins = (totalSeconds / 60.0).toFixed(1);
        return includeDetail ? `${hrs.toFixed(2)} h (${mins} min)` : `${hrs.toFixed(2)} h`;
    } else {
        const secs = totalSeconds.toFixed(1);
        return includeDetail ? `${hrs.toFixed(4)} h (${secs} seg)` : `${hrs.toFixed(4)} h`;
    }
}

// Mantener compatibilidad de llamada
function formatAdaptiveTime(totalSeconds) {
    return formatToHours(totalSeconds, true);
}

function processOlapFilters(cuboData, fGes, fAnio, fMes, fReg, fEst, fMac) {
    let filtrados = cuboData.filter(row => {
        if (fGes === 'HUMANAS' && row.Gestion === 'REINICIO DE CONTRASEÑA') return false;
        if (fGes !== 'HUMANAS' && fGes !== 'TODAS' && row.Gestion !== fGes) return false;
        if (fAnio !== 'TODOS' && row.Anio !== fAnio) return false;
        if (fMes !== 'TODOS' && row.Mes !== fMes) return false;
        if (fReg !== 'TODAS' && row.Region !== fReg) return false;
        if (fEst !== 'TODOS' && row.Estado !== fEst) return false;
        if (fMac !== 'TODAS' && row.MacroFamilia !== fMac) return false;
        return true;
    });

    let totalCasos = 0, totalRechazos = 0, totalAprobados = 0, totalNoConf = 0, totalCanceladas = 0;
    let totalAprobDirectas = 0, totalAprobSubsanadas = 0, totalRechDefinitivos = 0, totalRechHuerfanos = 0;
    let sumBuzonHab = 0, nBuzonHab = 0, sumBuzonCal = 0, nBuzonCal = 0;
    let sumBolson = 0, nBolson = 0;
    let sumAtencionFinal = 0, nAtencionFinal = 0;
    let sumAtencionRechazo = 0, nAtencionRechazo = 0;
    let sumCreacionAtenHab = 0, nCreacionAtenHab = 0;
    let sumCicloHab = 0, nCicloHab = 0, sumCicloCal = 0, nCicloCal = 0;
    let sumCiclo1ra = 0, nCiclo1ra = 0, sumCicloSub = 0, nCicloSub = 0;
    let sla1d = 0, sla2d = 0, sla3d = 0, sla5d = 0, slaFuera = 0;

    const estCounts = {}, macCounts = {}, subcatCounts = {}, monthMap = {};
    const regMap = {
        'CENTRAL': { casos: 0, aprob: 0, rech: 0, aprob_dir: 0, aprob_sub: 0, rech_huerf: 0, sumBuzon: 0, nBuzon: 0, sumBolson: 0, nBolson: 0, sumAte: 0, nAte: 0, sumCiclo: 0, nCiclo: 0, sla1d: 0 },
        'OCCIDENTE': { casos: 0, aprob: 0, rech: 0, aprob_dir: 0, aprob_sub: 0, rech_huerf: 0, sumBuzon: 0, nBuzon: 0, sumBolson: 0, nBolson: 0, sumAte: 0, nAte: 0, sumCiclo: 0, nCiclo: 0, sla1d: 0 },
        'SUR': { casos: 0, aprob: 0, rech: 0, aprob_dir: 0, aprob_sub: 0, rech_huerf: 0, sumBuzon: 0, nBuzon: 0, sumBolson: 0, nBolson: 0, sumAte: 0, nAte: 0, sumCiclo: 0, nCiclo: 0, sla1d: 0 },
        'NORORIENTE': { casos: 0, aprob: 0, rech: 0, aprob_dir: 0, aprob_sub: 0, rech_huerf: 0, sumBuzon: 0, nBuzon: 0, sumBolson: 0, nBolson: 0, sumAte: 0, nAte: 0, sumCiclo: 0, nCiclo: 0, sla1d: 0 }
    };
    const monthRegMap = { 'CENTRAL': {}, 'OCCIDENTE': {}, 'SUR': {}, 'NORORIENTE': {} };
    const speedMap = { '<=2s': { casos: 0, rech: 0 }, '2-5s': { casos: 0, rech: 0 }, '5-15s': { casos: 0, rech: 0 }, '15-60s': { casos: 0, rech: 0 }, '1-5m': { casos: 0, rech: 0 }, '>5m': { casos: 0, rech: 0 } };
    const opMap = {};
    let rechAprob = 0, rechAband = 0, rechBloq = 0;

    filtrados.forEach(r => {
        totalCasos += r.Casos;
        totalRechazos += r.Rechazos;
        totalAprobados += r.Aprobadas + r.Finalizadas;
        totalNoConf += r.NoConfirmadas;
        totalCanceladas += r.Canceladas;
        totalAprobDirectas += (r.AprobDirectas || 0);
        totalAprobSubsanadas += (r.AprobSubsanadas || 0);
        totalRechDefinitivos += (r.RechDefinitivos || 0);

        if (r.Rechazos > 0 && (r.MacroFamilia === 'Sin Rechazo' || r.ID_Subcategoria === 'SUB-00')) {
            totalRechHuerfanos += r.Rechazos;
        }

        sumBuzonHab += (r.Suma_Buzon_Hab_Sec || 0);
        nBuzonHab += (r.N_Buzon_Hab || 0);
        sumBuzonCal += (r.Suma_Buzon_Cal_Sec || 0);
        nBuzonCal += (r.N_Buzon_Cal || 0);

        sumBolson += (r.Suma_Bolson_Sec || 0);
        nBolson += (r.N_Bolson || 0);
        
        sumAtencionFinal += (r.Suma_Atencion_Final_Sec || 0);
        nAtencionFinal += (r.N_Atencion_Final || 0);

        sumAtencionRechazo += (r.Suma_Atencion_Rechazo_Sec || 0);
        nAtencionRechazo += (r.N_Atencion_Rechazo || 0);

        sumCreacionAtenHab += (r.Suma_Creacion_Atencion_Hab_Sec || 0);
        nCreacionAtenHab += (r.N_Creacion_Atencion_Hab || 0);

        sumCicloHab += (r.Suma_Ciclo_Hab_Sec || 0);
        nCicloHab += (r.N_Ciclo_Hab || 0);
        sumCicloCal += (r.Suma_Ciclo_Cal_Sec || 0);
        nCicloCal += (r.N_Ciclo_Cal || 0);

        if (r.Ronda_Revision === '1RA_DIRECTA') {
            sumCiclo1ra += (r.Suma_Ciclo_Hab_Sec || 0);
            nCiclo1ra += (r.N_Ciclo_Hab || 0);
        } else if (r.Ronda_Revision === '2DA_SUBSANADA') {
            sumCicloSub += (r.Suma_Ciclo_Hab_Sec || 0);
            nCicloSub += (r.N_Ciclo_Hab || 0);
        }

        sla1d += r.SLA_8h;
        sla2d += r.SLA_16h;
        sla3d += r.SLA_24h;
        sla5d += r.SLA_40h;
        slaFuera += r.Fuera_SLA_40h;

        estCounts[r.Estado] = (estCounts[r.Estado] || 0) + r.Casos;
        if (r.MacroFamilia !== 'Sin Rechazo') macCounts[r.MacroFamilia] = (macCounts[r.MacroFamilia] || 0) + r.Casos;
        if (r.ID_Subcategoria && r.ID_Subcategoria !== 'SUB-00') subcatCounts[r.ID_Subcategoria] = (subcatCounts[r.ID_Subcategoria] || 0) + r.Casos;
        if (speedMap[r.Rango_Velocidad]) {
            speedMap[r.Rango_Velocidad].casos += r.Casos;
            speedMap[r.Rango_Velocidad].rech += r.Rechazos;
        }

        if (r.Mes && r.Mes !== 'NaT') {
            if (!monthMap[r.Mes]) monthMap[r.Mes] = { casos: 0, sumBuzon: 0, nBuzon: 0, sumBolson: 0, nBolson: 0, sumAten: 0, nAten: 0 };
            const mObj = monthMap[r.Mes];
            mObj.casos += r.Casos;
            mObj.sumBuzon += (r.Suma_Buzon_Hab_Sec || 0);
            mObj.nBuzon += (r.N_Buzon_Hab || 0);
            mObj.sumBolson += (r.Suma_Bolson_Sec || 0);
            mObj.nBolson += (r.N_Bolson || 0);
            mObj.sumAten += (r.Suma_Creacion_Atencion_Hab_Sec || 0);
            mObj.nAten += (r.N_Creacion_Atencion_Hab || 0);

            if (monthRegMap[r.Region]) {
                if (!monthRegMap[r.Region][r.Mes]) monthRegMap[r.Region][r.Mes] = { sumBuzon: 0, nBuzon: 0, sumBolson: 0, nBolson: 0 };
                const mrObj = monthRegMap[r.Region][r.Mes];
                mrObj.sumBuzon += (r.Suma_Buzon_Hab_Sec || 0);
                mrObj.nBuzon += (r.N_Buzon_Hab || 0);
                mrObj.sumBolson += (r.Suma_Bolson_Sec || 0);
                mrObj.nBolson += (r.N_Bolson || 0);
            }
        }

        if (regMap[r.Region]) {
            const regObj = regMap[r.Region];
            regObj.casos += r.Casos;
            regObj.aprob += (r.Aprobadas + r.Finalizadas);
            regObj.rech += r.Rechazos;
            regObj.aprob_dir += (r.AprobDirectas || 0);
            regObj.aprob_sub += (r.AprobSubsanadas || 0);
            if (r.Rechazos > 0 && (r.MacroFamilia === 'Sin Rechazo' || r.ID_Subcategoria === 'SUB-00')) {
                regObj.rech_huerf += r.Rechazos;
            }
            regObj.sumBuzon += (r.Suma_Buzon_Hab_Sec || 0);
            regObj.nBuzon += (r.N_Buzon_Hab || 0);
            regObj.sumBolson += (r.Suma_Bolson_Sec || 0);
            regObj.nBolson += (r.N_Bolson || 0);
            regObj.sumAte += (r.Suma_Atencion_Final_Sec || 0);
            regObj.nAte += (r.N_Atencion_Final || 0);
            regObj.sumCiclo += (r.Suma_Ciclo_Hab_Sec || 0);
            regObj.nCiclo += (r.N_Ciclo_Hab || 0);
            regObj.sla1d += r.SLA_8h;
        }

        if (r.U1 && r.U1 !== 'AP_MS_SAT_EN_LINEA' && r.U1 !== 'SIN_OPERADOR') {
            if (!opMap[r.U1]) opMap[r.U1] = { total: 0, aprob: 0, aprob_dir: 0, aprob_sub: 0, rech_def: 0, rech_eventos: 0, sumAte: 0, nAte: 0 };
            opMap[r.U1].total += r.Casos;
            opMap[r.U1].aprob += (r.Aprobadas + r.Finalizadas);
            opMap[r.U1].aprob_dir += (r.AprobDirectas || 0);
            opMap[r.U1].aprob_sub += (r.AprobSubsanadas || 0);
            opMap[r.U1].rech_def += (r.RechDefinitivos || 0);
            opMap[r.U1].rech_eventos += r.Rechazos;
            opMap[r.U1].sumAte += (r.Suma_Atencion_Final_Sec || 0);
            opMap[r.U1].nAte += (r.N_Atencion_Final || 0);
        }

        if (r.Rechazos > 0) {
            if (r.Estado === 'APROBADA' || r.Estado === 'FINALIZADA') rechAprob += r.Rechazos;
            else if (r.Estado.includes('CANTIDAD') || r.Estado.includes('REQUERIMIENTO')) rechBloq += r.Rechazos;
            else rechAband += r.Rechazos;
        }
    });

    return {
        totalCasos, totalRechazos, totalAprobados, totalNoConf, totalCanceladas,
        totalAprobDirectas, totalAprobSubsanadas, totalRechDefinitivos, totalRechHuerfanos,
        sumBuzonHab, nBuzonHab, sumBuzonCal, nBuzonCal,
        sumBolson, nBolson,
        sumAtencionFinal, nAtencionFinal,
        sumAtencionRechazo, nAtencionRechazo,
        sumCreacionAtenHab, nCreacionAtenHab,
        sumCicloHab, nCicloHab, sumCicloCal, nCicloCal,
        sumCiclo1ra, nCiclo1ra, sumCicloSub, nCicloSub,
        sla1d, sla2d, sla3d, sla5d, slaFuera,
        estCounts, macCounts, subcatCounts, monthMap, regMap, monthRegMap, speedMap, opMap,
        rechAprob, rechAband, rechBloq
    };
}
