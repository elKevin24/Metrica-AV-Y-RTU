// Administrador de Gráficas Chart.js
let chartMacroInst = null;
let chartOpsInst = null;
let chartDestinoRechInst = null;
let chartLineBuzonRegInst = null;
let chartLineBolsonRegInst = null;
let chartComboTrendInst = null;
let chartSpeedVsRechazoInst = null;
let chartVolumeVsSpeedInst = null;

function initCharts() {
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
                { type: 'bar', label: 'Volumen Mensual de Trámites', data: [], backgroundColor: 'rgba(203, 213, 225, 0.7)', borderRadius: 4, yAxisID: 'y' },
                { type: 'line', label: 'Horas Hábiles hasta 1ra Atención', data: [], borderColor: '#059669', backgroundColor: '#059669', tension: 0.3, borderWidth: 3, pointRadius: 4, yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
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

    chartMacroInst = new Chart(document.getElementById('chartMacro'), {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Casos', data: [], backgroundColor: ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#F43F5E'], borderRadius: 6 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    chartOpsInst = new Chart(document.getElementById('chartOperadores'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{ label: '% Tasa Incidencia Rechazo', data: [], backgroundColor: '#4F46E5', borderRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}
