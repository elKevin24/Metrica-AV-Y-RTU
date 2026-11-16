import * as XLSX from 'xlsx';
import type { SpecialCase } from '../../types/contactCenter';

const monthMap: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

function parseExcelDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (isNaN(date.getTime())) return String(val);
    return date.toISOString().split('T')[0];
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  return str || null;
}

export function parseSpecialCasesExcelFile(buffer: ArrayBuffer): SpecialCase[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const monthsSpanish = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  const allCases: SpecialCase[] = [];

  wb.SheetNames.forEach((sheetName) => {
    const isMonthSheet = monthsSpanish.some((m) => m.toLowerCase() === sheetName.toLowerCase());
    if (!isMonthSheet && !sheetName.toLowerCase().includes('caso') && !sheetName.toLowerCase().includes('reporte')) {
      return;
    }

    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

    let headerIdx = -1;
    for (let i = 0; i < Math.min(raw.length, 6); i++) {
      const row = (raw[i] || []).map((x) => String(x || '').toLowerCase());
      if (row.some((x) => x.includes('canal') || x.includes('tipificacion') || x.includes('descripci'))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) return;

    const header = (raw[headerIdx] || []).map((x) => String(x || '').trim());
    const colIdx = {
      canal: -1,
      fechaIngreso: -1,
      nit: -1,
      descripcion: -1,
      tipificacion: -1,
      supervisor: -1,
      fechaTraslado: -1,
      ticket: -1,
      encargada: -1,
      resuelto: -1,
      tiempoSolucion: -1,
      reportadoPor: -1,
      observacion: -1,
    };

    header.forEach((h, idx) => {
      const hl = h.toLowerCase();
      if (hl.includes('canal')) colIdx.canal = idx;
      else if (hl.includes('fecha de ingreso') || hl.includes('fecha ingreso')) colIdx.fechaIngreso = idx;
      else if (hl === 'nit' || hl.includes('nit')) colIdx.nit = idx;
      else if (hl.includes('descripci')) colIdx.descripcion = idx;
      else if (hl.includes('tipificaci')) colIdx.tipificacion = idx;
      else if (hl.includes('supervisor')) colIdx.supervisor = idx;
      else if (hl.includes('fecha de traslado') && colIdx.fechaTraslado === -1) colIdx.fechaTraslado = idx;
      else if (hl.includes('ticket')) colIdx.ticket = idx;
      else if ((hl.includes('encargada') || hl.includes('area') || hl.includes('departamento')) && colIdx.encargada === -1) colIdx.encargada = idx;
      else if (hl.includes('resuelto') || hl.includes('estado')) colIdx.resuelto = idx;
      else if (hl.includes('tiempo de soluci') || hl.includes('tiempo solucion')) colIdx.tiempoSolucion = idx;
      else if (hl.includes('reportado por') || hl.includes('agente')) colIdx.reportadoPor = idx;
      else if (hl.includes('observaci') || hl.includes('seguimiento')) colIdx.observacion = idx;
    });

    for (let r = headerIdx + 1; r < raw.length; r++) {
      const row = raw[r];
      if (!row || row.length === 0) continue;

      const rowValues = row.filter((x) => x !== null && x !== undefined && String(x).trim() !== '');
      if (rowValues.length <= 1) continue;

      const canalRaw = colIdx.canal >= 0 ? row[colIdx.canal] : '';
      const fechaIngresoRaw = colIdx.fechaIngreso >= 0 ? row[colIdx.fechaIngreso] : null;
      const nitRaw = colIdx.nit >= 0 ? row[colIdx.nit] : '';
      const descRaw = colIdx.descripcion >= 0 ? row[colIdx.descripcion] : '';
      const tipifRaw = colIdx.tipificacion >= 0 ? row[colIdx.tipificacion] : '';
      const supRaw = colIdx.supervisor >= 0 ? row[colIdx.supervisor] : '';
      const fechaTrasladoRaw = colIdx.fechaTraslado >= 0 ? row[colIdx.fechaTraslado] : null;
      const ticketRaw = colIdx.ticket >= 0 ? row[colIdx.ticket] : '';
      const encargadaRaw = colIdx.encargada >= 0 ? row[colIdx.encargada] : '';
      const resueltoRaw = colIdx.resuelto >= 0 ? row[colIdx.resuelto] : null;
      const tiempoRaw = colIdx.tiempoSolucion >= 0 ? row[colIdx.tiempoSolucion] : null;
      const reportadoRaw = colIdx.reportadoPor >= 0 ? row[colIdx.reportadoPor] : '';
      const obsRaw = colIdx.observacion >= 0 ? row[colIdx.observacion] : '';

      if (!descRaw && !tipifRaw && !nitRaw) continue;

      let canal = String(canalRaw || '').trim();
      if (canal === '1550') canal = '1550 (Teléfono)';
      else if (canal.toLowerCase() === 'correo') canal = 'Correo Electrónico';
      else if (canal.toLowerCase() === 'chat') canal = 'Chat Web';
      else if (!canal) canal = 'No especificado';

      let nit = String(nitRaw || '').trim();
      if (!nit && descRaw) {
        const nitMatch = String(descRaw).match(/NIT\s*:?\s*([0-9kK-]+)/i);
        if (nitMatch) nit = nitMatch[1];
      }

      let tipificacion = String(tipifRaw || 'Otras Consultas').trim();
      if (tipificacion.toLowerCase().startsWith('let')) tipificacion = 'LET (Libros Electrónicos)';
      else if (tipificacion.toLowerCase().startsWith('sincroniz')) tipificacion = 'Sincronización RTU / CUI';
      else if (tipificacion.toLowerCase().startsWith('actualiz')) tipificacion = 'Actualización de Datos';
      else if (tipificacion.toLowerCase().startsWith('agencia')) tipificacion = 'Agencia Virtual';
      else if (tipificacion.toLowerCase().startsWith('declaraguate')) tipificacion = 'Declaraguate';
      else if (tipificacion.toLowerCase().startsWith('cese')) tipificacion = 'Cese de Actividades';
      else if (tipificacion.toLowerCase().startsWith('reporte semestral')) tipificacion = 'Reporte Semestral Inventarios';
      else if (tipificacion.toLowerCase().startsWith('fel') || tipificacion.toLowerCase().startsWith('factura')) tipificacion = 'FEL / Factura Electrónica';
      else if (tipificacion.toLowerCase().startsWith('vehiculo') || tipificacion.toLowerCase().startsWith('vehículo') || tipificacion.toLowerCase().startsWith('isv')) tipificacion = 'Vehículos / Calcomanías';
      else if (tipificacion.toLowerCase().startsWith('inactivacion') || tipificacion.toLowerCase().startsWith('caracteristica')) tipificacion = 'Características Especiales RTU';

      let supervisor = String(supRaw || 'No Asignado').trim();
      if (supervisor.toLowerCase().includes('mynor')) supervisor = 'Mynor Hernández';
      else if (supervisor.toLowerCase().includes('estherlyn')) supervisor = 'Estherlyn';
      else if (supervisor.toLowerCase().includes('waleska')) supervisor = 'Waleska';
      else if (supervisor.toLowerCase().includes('rudy')) supervisor = 'Rudy';

      let encargada = String(encargadaRaw || 'Sin Asignar').trim();
      if (encargada.toLowerCase().includes('normativo') || encargada.toLowerCase().includes('iac')) encargada = 'Departamento Normativo IAC';
      else if (encargada.toLowerCase().includes('recaudaci') || encargada.toLowerCase().includes('ire')) encargada = 'IRE / Recaudación Tributaria';
      else if (encargada.toLowerCase().includes('contact center')) encargada = 'Contact Center N2';
      else if (encargada.toLowerCase().includes('gin')) encargada = 'GIN (Informática)';
      else if (encargada.toLowerCase().includes('grc')) encargada = 'GRC (Gestión Regional Central)';
      else if (encargada.toLowerCase().includes('ifi')) encargada = 'IFI (Fiscalización)';

      const reportadoPor = String(reportadoRaw || 'Agente').trim();
      const monthSlug = monthMap[sheetName.toLowerCase()] || '01';
      const fechaIngreso = parseExcelDate(fechaIngresoRaw) || `2025-${monthSlug}-01`;
      const fechaTraslado = parseExcelDate(fechaTrasladoRaw);
      const fechaResuelto = parseExcelDate(resueltoRaw);

      let estado = 'Pendiente';
      if (
        fechaResuelto ||
        (typeof resueltoRaw === 'number' && resueltoRaw > 0) ||
        String(resueltoRaw).toLowerCase().includes('resuelto') ||
        String(resueltoRaw).toLowerCase().includes('si')
      ) {
        estado = 'Resuelto';
      }

      let tiempoDias = 0;
      if (typeof tiempoRaw === 'number') {
        if (tiempoRaw > 1000) {
          if (fechaIngreso && fechaResuelto) {
            const d1 = new Date(fechaIngreso);
            const d2 = new Date(fechaResuelto);
            tiempoDias = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
          } else {
            tiempoDias = 1;
          }
        } else {
          tiempoDias = Math.max(0, Math.round(tiempoRaw * 10) / 10);
        }
      } else if (tiempoRaw && !isNaN(parseFloat(tiempoRaw))) {
        const parsed = parseFloat(tiempoRaw);
        if (parsed > 1000) {
          if (fechaIngreso && fechaResuelto) {
            const d1 = new Date(fechaIngreso);
            const d2 = new Date(fechaResuelto);
            tiempoDias = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
          } else {
            tiempoDias = 1;
          }
        } else {
          tiempoDias = Math.max(0, Math.round(parsed * 10) / 10);
        }
      }

      allCases.push({
        id: `CASO-${sheetName.substring(0, 3).toUpperCase()}-${r}`,
        mes: sheetName,
        canal,
        fechaIngreso,
        fechaTraslado: fechaTraslado || fechaIngreso,
        nit: nit || 'N/A',
        descripcion: String(descRaw || '').trim(),
        tipificacion,
        supervisor,
        ticket: String(ticketRaw || '').trim() || null,
        areaResolucion: encargada,
        estado,
        fechaResuelto: estado === 'Resuelto' ? fechaResuelto || fechaIngreso : null,
        tiempoSolucionDias: tiempoDias,
        reportadoPor: reportadoPor || 'Agente',
        observacion: String(obsRaw || '').trim(),
      });
    }
  });

  return allCases;
}
