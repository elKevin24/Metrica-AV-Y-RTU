/**
 * charts.js - Visualización Gráfica Interactiva con Chart.js
 * Tablero Ejecutivo BI 360° Agencia Virtual & RTU - SAT Guatemala
 */
(function(window) {
  'use strict';

  const chartInstances = {};

  const COLORS = {
    blue: '#2563EB',
    indigo: '#4F46E5',
    teal: '#0D9488',
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#F43F5E',
    slate: '#64748B',
    cyan: '#06B6D4',
    purple: '#8B5CF6',
    border: '#E2E8F0'
  };

  function getCtx(id) {
    const el = document.getElementById(id);
    if (!el || !(el instanceof HTMLCanvasElement)) return null;
    return el.getContext('2d');
  }

  function destroyChart(id) {
    if (chartInstances[id]) {
      try {
        chartInstances[id].destroy();
      } catch (e) {}
      delete chartInstances[id];
    }
  }

  window.initAllCharts = function(res) {
    if (typeof Chart === 'undefined') return;

    // 1. chartMacroDestino (Dona de Destino Operativo)
    const ctxDestino = getCtx('chartMacroDestino');
    if (ctxDestino) {
      destroyChart('chartMacroDestino');
      chartInstances['chartMacroDestino'] = new Chart(ctxDestino, {
        type: 'doughnut',
        data: {
          labels: ['Aprobadas Limpias (FTR)', 'Subsanadas tras Rechazo', 'Rechazadas', 'Otros / Cancelados'],
          datasets: [{
            data: [
              res.totalAprobDirectas,
              res.totalAprobSubsanadas,
              res.totalRechazos,
              res.totalOtrosEstados
            ],
            backgroundColor: [COLORS.emerald, COLORS.teal, COLORS.rose, COLORS.slate],
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, family: 'Inter' } } }
          },
          cutout: '70%'
        }
      });
    }

    // 2. chartMacroPersoneria (Dona Personería)
    const ctxPersoneria = getCtx('chartMacroPersoneria');
    if (ctxPersoneria) {
      destroyChart('chartMacroPersoneria');
      chartInstances['chartMacroPersoneria'] = new Chart(ctxPersoneria, {
        type: 'doughnut',
        data: {
          labels: ['Individual (99.5%)', 'Jurídica (0.5%)'],
          datasets: [{
            data: [
              res.personeriaStats?.INDIVIDUAL || Math.round(res.totalCasos * 0.995),
              res.personeriaStats?.JURIDICA || Math.round(res.totalCasos * 0.005)
            ],
            backgroundColor: [COLORS.blue, COLORS.purple],
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, family: 'Inter' } } }
          },
          cutout: '70%'
        }
      });
    }

    // 3. chartSpeedDistribution (Distribución de Tiempos en Pantalla)
    const ctxSpeed = getCtx('chartSpeedDistribution');
    if (ctxSpeed) {
      destroyChart('chartSpeedDistribution');
      chartInstances['chartSpeedDistribution'] = new Chart(ctxSpeed, {
        type: 'bar',
        data: {
          labels: ['< 1s', '1-2s', '2-5s', '5-15s', '15-60s', '1-5 min', '> 5 min'],
          datasets: [{
            label: 'Frecuencia de Expedientes (%)',
            data: [38.2, 32.5, 14.1, 7.8, 4.3, 2.1, 1.0],
            backgroundColor: COLORS.blue,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: '% de Casos' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 4. chartBarRegVolumen (Volumen por Regional)
    const ctxRegVol = getCtx('chartBarRegVolumen');
    if (ctxRegVol) {
      destroyChart('chartBarRegVolumen');
      const st = res.regionalStats;
      chartInstances['chartBarRegVolumen'] = new Chart(ctxRegVol, {
        type: 'bar',
        data: {
          labels: ['Central', 'Occidente', 'Nororiente', 'Sur'],
          datasets: [
            {
              label: 'Aprobadas',
              data: ['CENTRAL', 'OCCIDENTE', 'NORORIENTE', 'SUR'].map(k => (st[k]?.ftr || 0) + (st[k]?.subsanadas || 0)),
              backgroundColor: COLORS.emerald,
              borderRadius: 6
            },
            {
              label: 'Rechazadas',
              data: ['CENTRAL', 'OCCIDENTE', 'NORORIENTE', 'SUR'].map(k => st[k]?.rechazos || 0),
              backgroundColor: COLORS.rose,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            x: { stacked: true, grid: { display: false } },
            y: { stacked: true, beginAtZero: true }
          }
        }
      });
    }

    // 5. chartBarRegTiempos (Tiempos por Regional)
    const ctxRegTiem = getCtx('chartBarRegTiempos');
    if (ctxRegTiem) {
      destroyChart('chartBarRegTiempos');
      chartInstances['chartBarRegTiempos'] = new Chart(ctxRegTiem, {
        type: 'bar',
        data: {
          labels: ['Central', 'Occidente', 'Nororiente', 'Sur'],
          datasets: [
            {
              label: 'Espera en Cola (h)',
              data: [3.92, 3.81, 3.75, 3.65],
              backgroundColor: COLORS.amber,
              borderRadius: 6
            },
            {
              label: 'Ciclo Total (h)',
              data: [4.20, 4.08, 4.01, 3.90],
              backgroundColor: COLORS.indigo,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, title: { display: true, text: 'Horas Hábiles' } }
          }
        }
      });
    }

    // 6. chartLineBuzonReg (Líneas Buzón por Regional)
    const ctxLineBuzon = getCtx('chartLineBuzonReg');
    if (ctxLineBuzon) {
      destroyChart('chartLineBuzonReg');
      chartInstances['chartLineBuzonReg'] = new Chart(ctxLineBuzon, {
        type: 'line',
        data: {
          labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
          datasets: [
            { label: 'Central', data: [4.1, 4.0, 3.9, 3.8, 3.9, 3.7, 3.8, 3.9, 3.8, 3.7, 3.8, 3.9], borderColor: COLORS.blue, tension: 0.3, fill: false },
            { label: 'Occidente', data: [3.9, 3.8, 3.7, 3.6, 3.7, 3.6, 3.5, 3.6, 3.6, 3.5, 3.6, 3.7], borderColor: COLORS.emerald, tension: 0.3, fill: false },
            { label: 'Nororiente', data: [3.8, 3.7, 3.6, 3.6, 3.5, 3.5, 3.4, 3.5, 3.5, 3.4, 3.5, 3.6], borderColor: COLORS.amber, tension: 0.3, fill: false },
            { label: 'Sur', data: [3.7, 3.6, 3.5, 3.4, 3.5, 3.4, 3.3, 3.4, 3.4, 3.3, 3.4, 3.5], borderColor: COLORS.purple, tension: 0.3, fill: false }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: { y: { beginAtZero: false, title: { display: true, text: 'Horas' } } }
        }
      });
    }

    // 7. chartLineBolsonReg (Bolsón de Acumulación)
    const ctxBolson = getCtx('chartLineBolsonReg');
    if (ctxBolson) {
      destroyChart('chartLineBolsonReg');
      chartInstances['chartLineBolsonReg'] = new Chart(ctxBolson, {
        type: 'line',
        data: {
          labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'],
          datasets: [
            { label: 'Entradas Diarias', data: [1420, 1480, 1510, 1490, 1530, 1470, 1500, 1492], borderColor: COLORS.blue, tension: 0.3 },
            { label: 'Salidas Dictaminadas', data: [1390, 1440, 1490, 1480, 1500, 1450, 1480, 1465], borderColor: COLORS.emerald, tension: 0.3 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } }
        }
      });
    }

    // 8. chartComboTrend (Tendencia Mensual de Casos y SLAs)
    const ctxCombo = getCtx('chartComboTrend');
    if (ctxCombo) {
      destroyChart('chartComboTrend');
      chartInstances['chartComboTrend'] = new Chart(ctxCombo, {
        type: 'bar',
        data: {
          labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
          datasets: [
            {
              type: 'line',
              label: '% SLA ≤ 3 Días',
              data: [82.5, 81.9, 81.2, 80.8, 81.5, 82.1, 81.4, 80.9, 81.3, 81.8, 81.5, 81.3],
              borderColor: COLORS.amber,
              borderWidth: 2,
              yAxisID: 'y1'
            },
            {
              type: 'bar',
              label: 'Volumen Mensual',
              data: res.monthlyStats ? res.monthlyStats.map(m => m.casos) : [28000, 18000, 15000, 14000, 13500, 13000, 14000, 13800, 13200, 13500, 13000, 13412],
              backgroundColor: COLORS.indigo,
              borderRadius: 4,
              yAxisID: 'y'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { type: 'linear', position: 'left', beginAtZero: true },
            y1: { type: 'linear', position: 'right', min: 70, max: 100, grid: { drawOnChartArea: false } }
          }
        }
      });
    }

    // 9. chartSobrecargaBar (Ratio de Sobrecarga Regional)
    const ctxSobrecarga = getCtx('chartSobrecargaBar');
    if (ctxSobrecarga) {
      destroyChart('chartSobrecargaBar');
      chartInstances['chartSobrecargaBar'] = new Chart(ctxSobrecarga, {
        type: 'bar',
        data: {
          labels: ['Central', 'Occidente', 'Nororiente', 'Sur'],
          datasets: [{
            label: 'Ratio Carga vs Capacidad',
            data: [1.32, 0.98, 0.85, 0.78],
            backgroundColor: [COLORS.rose, COLORS.blue, COLORS.emerald, COLORS.emerald],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Ratio (1.0 = Balance Ideal)' }
            }
          }
        }
      });
    }

    // 10. chartDemandaResolucionLine (Demanda vs Capacidad de Resolución)
    const ctxDemRes = getCtx('chartDemandaResolucionLine');
    if (ctxDemRes) {
      destroyChart('chartDemandaResolucionLine');
      chartInstances['chartDemandaResolucionLine'] = new Chart(ctxDemRes, {
        type: 'line',
        data: {
          labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
          datasets: [
            { label: 'Demanda Entrante', data: [1550, 1500, 1490, 1480, 1510, 1495, 1480, 1490, 1475, 1490, 1485, 1492], borderColor: COLORS.blue, tension: 0.3 },
            { label: 'Resolución Efectiva', data: [1420, 1450, 1460, 1470, 1480, 1475, 1480, 1470, 1465, 1480, 1475, 1465], borderColor: COLORS.emerald, tension: 0.3 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } }
        }
      });
    }

    // 11. chartDestinoRechazos (Destino de Rechazos)
    const ctxDestRech = getCtx('chartDestinoRechazos');
    if (ctxDestRech) {
      destroyChart('chartDestinoRechazos');
      chartInstances['chartDestinoRechazos'] = new Chart(ctxDestRech, {
        type: 'doughnut',
        data: {
          labels: ['Subsanadas con Éxito (47.2%)', 'Abandonadas (38.5%)', 'Rechazo Regla Bloqueo (9.8%)', 'Descarte Definitivo (4.5%)'],
          datasets: [{
            data: [47.2, 38.5, 9.8, 4.5],
            backgroundColor: [COLORS.emerald, COLORS.amber, COLORS.rose, COLORS.slate],
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } },
          cutout: '65%'
        }
      });
    }

    // 12. chartMacro (Causales Macro de Rechazo)
    const ctxMacro = getCtx('chartMacro');
    if (ctxMacro) {
      destroyChart('chartMacro');
      chartInstances['chartMacro'] = new Chart(ctxMacro, {
        type: 'bar',
        data: {
          labels: [
            'Sin Motivo (SUB-00)',
            'Reglas Sistema (MAC-06)',
            'Documentación DPI (MAC-01)',
            'Video Confirmación (MAC-02)',
            'Datos Inconsistentes (MAC-03)',
            'Representación Legal (MAC-04)'
          ],
          datasets: [{
            label: 'Casos Rechazados',
            data: [
              res.huerfanosCount || 26000,
              res.sistemaCount || 6300,
              Math.round(res.totalRechazos * 0.185),
              Math.round(res.totalRechazos * 0.128),
              Math.round(res.totalRechazos * 0.025),
              Math.round(res.totalRechazos * 0.025)
            ],
            backgroundColor: [COLORS.rose, COLORS.purple, COLORS.amber, COLORS.indigo, COLORS.teal, COLORS.slate],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true } }
        }
      });
    }

    // 13. chartSpeedVsRechazo (Scatter Velocidad vs Rechazo de Operadores)
    const ctxScatterRech = getCtx('chartSpeedVsRechazo');
    if (ctxScatterRech && res?.revisores && res.revisores.length > 0) {
      destroyChart('chartSpeedVsRechazo');
      const pts = res.revisores.slice(0, 60).map(r => ({
        x: r.tiempo_prom_min,
        y: r.pct_rech,
        label: r.id
      }));

      chartInstances['chartSpeedVsRechazo'] = new Chart(ctxScatterRech, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Revisores',
            data: pts,
            backgroundColor: COLORS.blue,
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.raw.label}: ${ctx.raw.x} min, ${ctx.raw.y}% rechazos`
              }
            }
          },
          scales: {
            x: { title: { display: true, text: 'Tiempo Promedio (min)' }, min: 0 },
            y: { title: { display: true, text: '% Tasa de Rechazo' }, min: 0 }
          }
        }
      });
    }

    // 14. chartVolumeVsSpeed (Volumen vs Velocidad)
    const ctxVolSpeed = getCtx('chartVolumeVsSpeed');
    if (ctxVolSpeed && res?.revisores && res.revisores.length > 0) {
      destroyChart('chartVolumeVsSpeed');
      const ptsVol = res.revisores.slice(0, 60).map(r => ({
        x: r.tiempo_prom_min,
        y: r.total,
        label: r.id
      }));

      chartInstances['chartVolumeVsSpeed'] = new Chart(ctxVolSpeed, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Operadores',
            data: ptsVol,
            backgroundColor: COLORS.emerald,
            pointRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.raw.label}: ${ctx.raw.x} min, ${ctx.raw.y} casos`
              }
            }
          },
          scales: {
            x: { title: { display: true, text: 'Tiempo Promedio (min)' }, min: 0 },
            y: { title: { display: true, text: 'Total Gestiones' }, min: 0 }
          }
        }
      });
    }

    // 15. chartOperadores (Ranking Top 15 Productividad)
    const ctxOperadores = getCtx('chartOperadores');
    if (ctxOperadores && res?.revisores && res.revisores.length > 0) {
      destroyChart('chartOperadores');
      const top15 = res.revisores.slice(0, 15);
      chartInstances['chartOperadores'] = new Chart(ctxOperadores, {
        type: 'bar',
        data: {
          labels: top15.map(r => r.id),
          datasets: [{
            label: 'Expedientes Resueltos',
            data: top15.map(r => r.total),
            backgroundColor: COLORS.blue,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } } },
            y: { beginAtZero: true }
          }
        }
      });
    }
  };

  window.updateAllCharts = function(res) {
    window.initAllCharts(res);
  };

  window.resizeAllCharts = function() {
    Object.keys(chartInstances).forEach(k => {
      if (chartInstances[k]) {
        try {
          chartInstances[k].resize();
        } catch (e) {}
      }
    });
  };

  window.addEventListener('resize', () => {
    window.resizeAllCharts();
  });

})(window);
