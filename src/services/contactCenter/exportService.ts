import type { SpecialCase } from '../../types/contactCenter';

export function exportCasesToCSV(cases: SpecialCase[], filename = 'tiempos_solucion_casos_especiales_horas_habiles.csv') {
  const headers = [
    'ID', 'Mes', 'Canal', 'Fecha Ingreso', 'Fecha Traslado', 'NIT', 'Tipificación',
    'Supervisor', 'No. Ticket', 'Área de Resolución', 'Estado',
    'Fecha Resuelto', 'Tiempo Solución (Horas Hábiles)', 'Nivel SLA', 'Reportado Por', 'Descripción', 'Observación',
  ];

  const rows = cases.map((c) => {
    const hours = Math.round(c.tiempoSolucionDias * 8);
    let slaLevel = 'Inmediato (≤8h hábiles)';
    if (hours > 56) slaLevel = 'Crítico (>56h hábiles)';
    else if (hours > 24) slaLevel = 'Moderado (25-56h hábiles)';
    else if (hours > 8) slaLevel = 'Estándar (9-24h hábiles)';

    return [
      `"${c.id}"`,
      `"${c.mes}"`,
      `"${c.canal}"`,
      `"${c.fechaIngreso}"`,
      `"${c.fechaTraslado}"`,
      `"${c.nit}"`,
      `"${(c.tipificacion || '').replace(/"/g, '""')}"`,
      `"${c.supervisor}"`,
      `"${c.ticket || ''}"`,
      `"${(c.areaResolucion || '').replace(/"/g, '""')}"`,
      `"${c.estado}"`,
      `"${c.fechaResuelto || ''}"`,
      hours,
      `"${slaLevel}"`,
      `"${(c.reportadoPor || '').replace(/"/g, '""')}"`,
      `"${(c.descripcion || '').replace(/"/g, '""')}"`,
      `"${(c.observacion || '').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToJSON(data: any, filename = 'reporte_tiempos_casos_especiales_8h.json') {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
