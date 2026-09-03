
// Opciones compartidas de tooltips enriquecidos
const richTooltipOptions = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    titleFont: { weight: 'bold', size: 12 },
    bodyFont: { size: 11 },
    padding: 10,
    cornerRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
};

// Administrador de Gráficas Chart.js
let chartMacroInst = null;
let chartOpsInst = null;
let chartDestinoRechInst = null;
let chartLineBuzonRegInst = null;
let chartLineBolsonRegInst = null;
let chartComboTrendInst = null;
let chartMacroDestinoInst = null;
let chartMacroPersoneriaInst = null;
let chartSpeedVsRechazoInst = null;
let chartVolumeVsSpeedInst = null;
let chartBarRegVolumenInst = null;
let chartBarRegTiemposInst = null;
let chartSobrecargaBarInst = null;
let chartDemandaResolucionLineInst = null;
let chartSpeedDistributionInst = null;

function initCharts() {
    // Destruir instancias previas para evitar error de canvas reusado
    if (chartMacroDestinoInst) { chartMacroDestinoInst.destroy(); chartMacroDestinoInst = null; }
    if (chartMacroPersoneriaInst) { chartMacroPersoneriaInst.destroy(); chartMacroPersoneriaInst = null; }
    if (chartLineBuzonRegInst) { chartLineBuzonRegInst.destroy(); chartLineBuzonRegInst = null; }
    if (chartLineBolsonRegInst) { chartLineBolsonRegInst.destroy(); chartLineBolsonRegInst = null; }
    if (chartComboTrendInst) { chartComboTrendInst.destroy(); chartComboTrendInst = null; }
    if (chartSpeedVsRechazoInst) { chartSpeedVsRechazoInst.destroy(); chartSpeedVsRechazoInst = null; }
    if (chartVolumeVsSpeedInst) { chartVolumeVsSpeedInst.destroy(); chartVolumeVsSpeedInst = null; }
    if (chartDestinoRechInst) { chartDestinoRechInst.destroy(); chartDestinoRechInst = null; }
    if (chartMacroInst) { chartMacroInst.destroy(); chartMacroInst = null; }
    if (chartOpsInst) { chartOpsInst.destroy(); chartOpsInst = null; }
    if (chartBarRegVolumenInst) { chartBarRegVolumenInst.destroy(); chartBarRegVolumenInst = null; }
    if (chartBarRegTiemposInst) { chartBarRegTiemposInst.destroy(); chartBarRegTiemposInst = null; }
    if (chartSobrecargaBarInst) { chartSobrecargaBarInst.destroy(); chartSobrecargaBarInst = null; }
    if (chartDemandaResolucionLineInst) { chartDemandaResolucionLineInst.destroy(); chartDemandaResolucionLineInst = null; }
    if (chartSpeedDistributionInst) { chartSpeedDistributionInst.destroy(); chartSpeedDistributionInst = null; }

    const cvBarVol = document.getElementById('chartBarRegVolumen');
    if (cvBarVol) {
        chartBarRegVolumenInst = new Chart(cvBarVol, {
            type: 'bar',
            data: {
                labels: ['CENTRAL', 'OCCIDENTE', 'SUR', 'NORORIENTE'],
                datasets: [
                    { label: 'Aprobadas', data: [0, 0, 0, 0], backgroundColor: '#10B981', borderRadius: 6 },
                    { label: 'Rechazadas', data: [0, 0, 0, 0], backgroundColor: '#F43F5E', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } },
                    tooltip: richTooltipOptions
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, title: { display: true, text: 'Cantidad de Gestiones' } }
                }
            }
        });
    }

    const cvBarTiempos = document.getElementById('chartBarRegTiempos');
    if (cvBarTiempos) {
        chartBarRegTiemposInst = new Chart(cvBarTiempos, {
            type: 'bar',
            data: {
                labels: ['CENTRAL', 'OCCIDENTE', 'SUR', 'NORORIENTE'],
                datasets: [
                    { 
                        label: 'ACTIVACIÓN: Σ(Rev - Crea) / N Activación', 
                        data: [0, 0, 0, 0], 
                        backgroundColor: '#0EA5E9', 
                        borderColor: '#0284C7',
                        borderWidth: 1,
                        borderRadius: 6 
                    },
                    { 
                        label: 'CAMBIO DE CORREO: Σ(Rev - Crea) / N Correo', 
                        data: [0, 0, 0, 0], 
                        backgroundColor: '#8B5CF6', 
                        borderColor: '#7C3AED',
                        borderWidth: 1,
                        borderRadius: 6 
                    },
                    { 
                        label: 'PROMEDIO GLOBAL: Σ(Rev - Crea) / Total', 
                        data: [0, 0, 0, 0], 
                        backgroundColor: '#4F46E5', 
                        borderColor: '#3730A3',
                        borderWidth: 1,
                        borderRadius: 6 
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.raw || 0;
                                const mins = (val * 60).toFixed(1);
                                return `${context.dataset.label.split(':')[0]}: ${val} horas/gestión (${mins} min)`;
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, title: { display: true, text: 'Horas Hábiles Promedio por Gestión' } }
                }
            }
        });
    }

    chartLineBuzonRegInst = new Chart(document.getElementById('chartLineBuzonReg'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Central', data: [], borderColor: '#EF4444', backgroundColor: '#EF4444', tension: 0.3, borderWidth: 2.5, pointRadius: 3 },
                { label: 'Occidente', data: [], borderColor: '#3B82F6', backgroundColor: '#3B82F6', tension: 0.3, borderWidth: 2.5, pointRadius: 3 },
                { label: 'Sur', data: [], borderColor: '#F59E0B', backgroundColor: '#F59E0B', tension: 0.3, borderWidth: 2.5, pointRadius: 3 },
                { label: 'Nororiente', data: [], borderColor: '#10B981', backgroundColor: '#10B981', tension: 0.3, borderWidth: 2.5, pointRadius: 3 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } } }
    });

    chartLineBolsonRegInst = new Chart(document.getElementById('chartLineBolsonReg'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Central', data: [], borderColor: '#EF4444', backgroundColor: '#EF4444', tension: 0.3, borderWidth: 2.5, pointRadius: 3 },
                { label: 'Occidente', data: [], borderColor: '#3B82F6', backgroundColor: '#3B82F6', tension: 0.3, borderWidth: 2.5, pointRadius: 3 },
                { label: 'Sur', data: [], borderColor: '#F59E0B', backgroundColor: '#F59E0B', tension: 0.3, borderWidth: 2.5, pointRadius: 3 },
                { label: 'Nororiente', data: [], borderColor: '#10B981', backgroundColor: '#10B981', tension: 0.3, borderWidth: 2.5, pointRadius: 3 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } } }
    });

    chartComboTrendInst = new Chart(document.getElementById('chartComboTrend'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                { type: 'bar', label: 'Volumen Mensual Total', data: [], backgroundColor: 'rgba(148, 163, 184, 0.4)', borderColor: '#94A3B8', borderWidth: 1, borderRadius: 4, yAxisID: 'y' },
                { type: 'bar', label: 'Volumen NO Rechazadas (Aprobadas)', data: [], backgroundColor: 'rgba(16, 185, 129, 0.4)', borderColor: '#10B981', borderWidth: 1, borderRadius: 4, yAxisID: 'y' },
                { type: 'line', label: '1ª Atención (Total Gestiones)', data: [], borderColor: '#6366F1', backgroundColor: '#6366F1', tension: 0.3, borderWidth: 2.5, pointRadius: 4, yAxisID: 'y1' },
                { type: 'line', label: '1ª Atención (NO Rechazadas / Aprobadas)', data: [], borderColor: '#059669', backgroundColor: '#059669', tension: 0.3, borderWidth: 3, pointRadius: 4, yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } },
                tooltip: richTooltipOptions
            },
            scales: {
                x: { grid: { display: false } },
                y: { type: 'linear', position: 'left', title: { display: true, text: 'Volumen de Expedientes' } },
                y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Horas Hábiles de Espera' } }
            }
        }
    });

    chartSpeedVsRechazoInst = new Chart(document.getElementById('chartSpeedVsRechazo'), {
        type: 'bar',
        data: {
            labels: ['Ultra-Rápido (≤2s)', 'Rápido (2-5s)', 'Moderado (5-15s)', 'Analítico (15-60s)', 'Detallado (1-5m)', 'Pausa/Audit (>5m)'],
            datasets: [{
                label: '% Probabilidad de Rechazo',
                data: [25.0, 26.5, 20.3, 26.4, 85.9, 98.6],
                backgroundColor: ['#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#F59E0B', '#EF4444'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: '% Tasa de Rechazo' } } }
        }
    });

    chartVolumeVsSpeedInst = new Chart(document.getElementById('chartVolumeVsSpeed'), {
        type: 'bar',
        data: {
            labels: ['Titulares (>8,000 casos)', 'Medios (1,000 a 8,000)', 'Ocasionales (<1,000 casos)'],
            datasets: [{
                label: 'Segundos Promedio de Revisión en Pantalla',
                data: [1.8, 2.0, 144.0],
                backgroundColor: ['#059669', '#2563EB', '#D97706'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Segundos de Atención' } } }
        }
    });

    chartDestinoRechInst = new Chart(document.getElementById('chartDestinoRechazos'), {
        type: 'doughnut',
        data: {
            labels: ['Subsanadas & Aprobadas', 'Abandono por Fricción', 'Bloqueadas por Límite'],
            datasets: [{ data: [0, 0, 0], backgroundColor: ['#10B981', '#F59E0B', '#EF4444'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
    });

    const cvMacroDest = document.getElementById('chartMacroDestino');
    if (cvMacroDest) {
        chartMacroDestinoInst = new Chart(cvMacroDest, {
            type: 'doughnut',
            data: {
                labels: ['Aprobación Directa (1ª Vez)', 'Subsanada tras Rechazo', 'Rechazo Definitivo', 'En Proceso / Otros'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#10B981', '#06B6D4', '#F43F5E', '#94A3B8'],
                    borderWidth: 2,
                    borderColor: '#FFFFFF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 10,
                            padding: 8,
                            font: { size: 10, weight: 'bold' },
                            generateLabels: (chart) => {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    const ds = data.datasets[0];
                                    const total = ds.data.reduce((acc, v) => acc + (Number(v) || 0), 0);
                                    return data.labels.map((lbl, i) => {
                                        const val = Number(ds.data[i]) || 0;
                                        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
                                        return {
                                            text: `${lbl}: ${val.toLocaleString()} (${pct}%)`,
                                            fillStyle: ds.backgroundColor[i],
                                            strokeStyle: ds.borderColor,
                                            lineWidth: 1,
                                            hidden: isNaN(ds.data[i]) || chart.getDatasetMeta(0).data[i]?.hidden,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        ...richTooltipOptions,
                        callbacks: {
                            label: (ctx) => {
                                const val = Number(ctx.raw) || 0;
                                const ds = ctx.chart.data.datasets[0];
                                const total = ds.data.reduce((acc, v) => acc + (Number(v) || 0), 0);
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
                                return ` ${ctx.label}: ${val.toLocaleString()} expedientes (${pct}%)`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }

    const cvMacroPers = document.getElementById('chartMacroPersoneria');
    if (cvMacroPers) {
        chartMacroPersoneriaInst = new Chart(cvMacroPers, {
            type: 'bar',
            data: {
                labels: ['Individuales (99.5%)', 'Sociedades (0.5%)'],
                datasets: [
                    {
                        label: '% Aprobación',
                        data: [0, 0],
                        backgroundColor: '#10B981',
                        borderRadius: 6
                    },
                    {
                        label: '% Tasa Rechazo',
                        data: [0, 0],
                        backgroundColor: '#F43F5E',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10, weight: 'bold' } } },
                    tooltip: {
                        ...richTooltipOptions,
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%`
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: v => v + '%' },
                        title: { display: true, text: 'Tasa de Dictamen (%)', font: { size: 10 } }
                    }
                }
            }
        });
    }

    chartMacroInst = new Chart(document.getElementById('chartMacro'), {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Casos', data: [], backgroundColor: ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#F43F5E'], borderRadius: 6 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    const cvSobrecarga = document.getElementById('chartSobrecargaBar');
    if (cvSobrecarga) {
        chartSobrecargaBarInst = new Chart(cvSobrecarga, {
            type: 'bar',
            data: {
                labels: ['CENTRAL', 'OCCIDENTE', 'SUR', 'NORORIENTE'],
                datasets: [
                    {
                        label: '% Demanda de Trámites',
                        data: [0, 0, 0, 0],
                        backgroundColor: '#3B82F6',
                        borderColor: '#2563EB',
                        borderWidth: 1.5,
                        borderRadius: 6
                    },
                    {
                        label: '% Capacidad de Revisores',
                        data: [0, 0, 0, 0],
                        backgroundColor: '#8B5CF6',
                        borderColor: '#7C3AED',
                        borderWidth: 1.5,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10, weight: 'bold' } } },
                    tooltip: {
                        ...richTooltipOptions,
                        callbacks: {
                            label: function(ctx) {
                                return ` ${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(v) { return v + '%'; }
                        },
                        title: { display: true, text: 'Participación (%)', font: { size: 10 } }
                    }
                }
            }
        });
    }

    const cvSpeedDist = document.getElementById('chartSpeedDistribution');
    if (cvSpeedDist) {
        chartSpeedDistributionInst = new Chart(cvSpeedDist, {
            type: 'bar',
            data: {
                labels: ['≤ 2s (Flash)', '2-5s (Rápido)', '5-15s (Medio)', '15-60s (Analítico)', '1-5m (Detallado)', '> 5m (Exhaustivo)'],
                datasets: [
                    {
                        label: 'Aprobadas',
                        data: [0, 0, 0, 0, 0, 0],
                        backgroundColor: '#10B981',
                        borderRadius: 5
                    },
                    {
                        label: 'Rechazos',
                        data: [0, 0, 0, 0, 0, 0],
                        backgroundColor: '#F43F5E',
                        borderRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10, weight: 'bold' } } },
                    tooltip: richTooltipOptions
                },
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Expedientes Dictaminados', font: { size: 10 } } }
                }
            }
        });
    }
    const cvOps = document.getElementById('chartOperadores');
    if (cvOps) {
        chartOpsInst = new Chart(cvOps, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{ label: '% Tasa Incidencia Rechazo', data: [], backgroundColor: '#4F46E5', borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
}


function renderScatterOperadores(opMap) {
    const canvas = document.getElementById('chartScatterOperadores');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (window._chartScatterInstance) window._chartScatterInstance.destroy();

    const dataPoints = [];
    const ops = Object.entries(opMap).filter(([k, v]) => v.total >= 50);

    ops.forEach(([name, data]) => {
        const rechPct = (data.rech_eventos / data.total) * 100;
        const avgSec = data.nAte > 0 ? (data.sumAte / data.nAte) : 2.0;

        let bg = 'rgba(16, 185, 129, 0.75)';
        let border = '#059669';
        if (rechPct > 40) { bg = 'rgba(59, 130, 246, 0.75)'; border = '#2563EB'; }
        else if (rechPct < 15 && data.total > 2000) { bg = 'rgba(245, 158, 11, 0.75)'; border = '#D97706'; }
        else if (avgSec > 60) { bg = 'rgba(239, 68, 68, 0.75)'; border = '#DC2626'; }

        const r = avgSec <= 5 ? 8 : (avgSec <= 30 ? 12 : 18);

        dataPoints.push({
            x: data.total,
            y: rechPct,
            r: r,
            opName: name,
            avgSec: avgSec.toFixed(1),
            total: data.total,
            rechPct: rechPct.toFixed(1),
            backgroundColor: bg,
            borderColor: border
        });
    });

    window._chartScatterInstance = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                label: 'Operadores',
                data: dataPoints,
                backgroundColor: dataPoints.map(d => d.backgroundColor),
                borderColor: dataPoints.map(d => d.borderColor),
                borderWidth: 1.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const raw = ctx.raw;
                            return [
                                `👤 Operador: ${raw.opName}`,
                                `📊 Volumen: ${raw.total.toLocaleString()} trámites`,
                                `🔴 Tasa Rechazo: ${raw.rechPct}%`,
                                `⏱️ Tiempo Medio: ${raw.avgSec} seg`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Volumen de Trámites Procesados', font: { weight: 'bold', size: 11 } },
                    grid: { color: '#F1F5F9' }
                },
                y: {
                    title: { display: true, text: 'Tasa de Rechazo (%)', font: { weight: 'bold', size: 11 } },
                    min: 0,
                    max: 60,
                    ticks: { callback: v => v + '%' },
                    grid: { color: '#F1F5F9' }
                }
            }
        }
    });
}


// Redimensionador Universal de Gráficas para Contenedores Reactivos
window.resizeAllCharts = function() {
    const instances = [
        chartMacroDestinoInst,
        chartMacroPersoneriaInst,
        chartLineBuzonRegInst,
        chartLineBolsonRegInst,
        chartComboTrendInst,
        chartSpeedVsRechazoInst,
        chartVolumeVsSpeedInst,
        chartDestinoRechInst,
        chartMacroInst,
        chartOpsInst,
        chartBarRegVolumenInst,
        chartBarRegTiemposInst,
        chartSobrecargaBarInst,
        chartDemandaResolucionLineInst,
        chartSpeedDistributionInst,
        window._chartScatterInstance
    ];
    
    instances.forEach(chart => {
        if (chart && typeof chart.resize === 'function') {
            try {
                chart.resize();
                chart.update('none');
            } catch(e) {}
        }
    });
};

// =========================================================================
// MÓDULO: GRÁFICO 2 - DEMANDA VS RESOLUCIÓN MULTINIVEL (MES, SEMANA, DÍA)
// =========================================================================
let currentNivelDemandaResolucion = 'mes';
let currentMesFiltroDemandaResolucion = 'TODOS';

window.setNivelDemandaResolucion = function(nivel) {
    currentNivelDemandaResolucion = nivel;
    
    // Actualizar botones de estado activo/inactivo
    const btnMes = document.getElementById('btnNivelMes');
    const btnSem = document.getElementById('btnNivelSemana');
    const btnDia = document.getElementById('btnNivelDia');
    const selMes = document.getElementById('selectFiltroMesDemanda');

    const activeClasses = 'bg-blue-600 text-white font-bold shadow-xs border-blue-600';
    const inactiveClasses = 'bg-white text-slate-700 hover:bg-slate-100 font-medium border-slate-200';

    if (btnMes) {
        btnMes.className = `px-3 py-1.5 rounded-xl text-xs transition border flex items-center gap-1.5 ${nivel === 'mes' ? activeClasses : inactiveClasses}`;
    }
    if (btnSem) {
        btnSem.className = `px-3 py-1.5 rounded-xl text-xs transition border flex items-center gap-1.5 ${nivel === 'semana' ? activeClasses : inactiveClasses}`;
    }
    if (btnDia) {
        btnDia.className = `px-3 py-1.5 rounded-xl text-xs transition border flex items-center gap-1.5 ${nivel === 'dia' ? activeClasses : inactiveClasses}`;
    }

    if (selMes) {
        if (nivel === 'mes') {
            selMes.classList.add('opacity-40');
            selMes.title = 'El filtro por mes se aplica en niveles Semana y Día';
        } else {
            selMes.classList.remove('opacity-40');
            selMes.title = 'Filtrar período por mes';
        }
    }

    window.renderDemandaResolucionChart();
};

window.onCambioMesDemandaResolucion = function(mes) {
    currentMesFiltroDemandaResolucion = mes;
    // Si se elige un mes específico estando en nivel 'mes', cambiar intuitivamente a nivel 'dia'
    if (mes !== 'TODOS' && currentNivelDemandaResolucion === 'mes') {
        window.setNivelDemandaResolucion('dia');
        return;
    }
    window.renderDemandaResolucionChart();
};

window.renderDemandaResolucionChart = function() {
    const cv = document.getElementById('chartDemandaResolucionLine');
    if (!cv) return;

    const dataObj = window.DATA && window.DATA.serieDemandaResolucion;
    if (!dataObj) {
        setTimeout(() => window.renderDemandaResolucionChart(), 250);
        return;
    }

    const nivel = currentNivelDemandaResolucion;
    const mesFiltro = currentMesFiltroDemandaResolucion;

    let labels = [];
    let dataDemanda = [];
    let dataResolucion = [];

    if (nivel === 'mes') {
        labels = dataObj.meses.map(m => m.label.replace(' 2026', ''));
        dataDemanda = dataObj.meses.map(m => m.demanda);
        dataResolucion = dataObj.meses.map(m => m.resolucion);
    } else if (nivel === 'semana') {
        let semanas = dataObj.semanas;
        if (mesFiltro !== 'TODOS') {
            semanas = semanas.filter(s => s.mesKey === mesFiltro);
        }
        labels = semanas.map(s => s.label);
        dataDemanda = semanas.map(s => s.demanda);
        dataResolucion = semanas.map(s => s.resolucion);
    } else if (nivel === 'dia') {
        let dias = dataObj.dias;
        if (mesFiltro !== 'TODOS') {
            dias = dias.filter(d => d.mesKey === mesFiltro);
        }
        labels = dias.map(d => `${d.diaSemana} ${d.fecha.substring(8, 10)}/${d.fecha.substring(5, 7)}`);
        dataDemanda = dias.map(d => d.demanda);
        dataResolucion = dias.map(d => d.resolucion);
    }

    // Actualizar métricas KPI en la cabecera del gráfico
    const totDem = dataDemanda.reduce((a, b) => a + b, 0);
    const totRes = dataResolucion.reduce((a, b) => a + b, 0);
    const brecha = totDem - totRes;
    const eficacia = totDem > 0 ? ((totRes / totDem) * 100).toFixed(1) : '100.0';

    const elDem = document.getElementById('kpiDemandaVal');
    const elRes = document.getElementById('kpiResolucionVal');
    const elBre = document.getElementById('kpiBrechaVal');
    const elEfi = document.getElementById('kpiEficaciaVal');

    if (elDem) elDem.innerText = totDem.toLocaleString();
    if (elRes) elRes.innerText = totRes.toLocaleString();
    if (elBre) elBre.innerText = `${brecha >= 0 ? '+' : ''}${brecha.toLocaleString()}`;
    if (elEfi) elEfi.innerText = `${eficacia}%`;

    const isDense = (nivel === 'dia' && mesFiltro === 'TODOS');

    if (!chartDemandaResolucionLineInst) {
        chartDemandaResolucionLineInst = new Chart(cv, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Demanda en Trámites (Ingresados)',
                        data: dataDemanda,
                        borderColor: '#2563EB',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: isDense ? 0.8 : 3.5,
                        pointHoverRadius: 6,
                        borderWidth: 2.5
                    },
                    {
                        label: 'Capacidad de Resolución (Dictaminados)',
                        data: dataResolucion,
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: isDense ? 0.8 : 3.5,
                        pointHoverRadius: 6,
                        borderWidth: 2.5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } }
                    },
                    tooltip: {
                        ...richTooltipOptions,
                        callbacks: {
                            label: function(ctx) {
                                return ` ${ctx.dataset.label}: ${ctx.raw.toLocaleString()} expedientes`;
                            },
                            afterBody: function(items) {
                                const dem = items[0] ? items[0].raw : 0;
                                const res = items[1] ? items[1].raw : 0;
                                const diff = dem - res;
                                const pct = dem > 0 ? ((res / dem) * 100).toFixed(1) : '100';
                                return [
                                    `--------------------------------`,
                                    `⚖️ Brecha del período: ${diff >= 0 ? '+' : ''}${diff.toLocaleString()} expedientes ${diff > 0 ? '(acumulación en cola)' : '(superávit de atención)'}`,
                                    `⚡ Cobertura resolutiva: ${pct}% de la demanda atendida`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: '#F8FAFC' },
                        ticks: {
                            font: { size: 10 },
                            maxTicksLimit: isDense ? 18 : 31
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#F1F5F9' },
                        title: { display: true, text: 'Volumen de Trámites', font: { size: 10, weight: 'bold' } },
                        ticks: {
                            callback: function(v) { return v.toLocaleString(); },
                            font: { size: 10 }
                        }
                    }
                }
            }
        });
    } else {
        chartDemandaResolucionLineInst.data.labels = labels;
        chartDemandaResolucionLineInst.data.datasets[0].data = dataDemanda;
        chartDemandaResolucionLineInst.data.datasets[1].data = dataResolucion;
        chartDemandaResolucionLineInst.data.datasets[0].pointRadius = isDense ? 0.8 : 3.5;
        chartDemandaResolucionLineInst.data.datasets[1].pointRadius = isDense ? 0.8 : 3.5;
        chartDemandaResolucionLineInst.options.scales.x.ticks.maxTicksLimit = isDense ? 18 : 31;
        chartDemandaResolucionLineInst.update();
    }
};
