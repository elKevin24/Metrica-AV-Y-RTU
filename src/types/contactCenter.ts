import type { ComprehensiveTimeStats, TimeUnit } from '../utils/contactCenter/timeStats';

export interface SpecialCase {
  id: string;
  mes: string;
  canal: string;
  fechaIngreso: string;
  fechaTraslado: string;
  nit: string;
  descripcion: string;
  tipificacion: string;
  supervisor: string;
  ticket: string | null;
  areaResolucion: string;
  estado: 'Resuelto' | 'Pendiente' | string;
  fechaResuelto: string | null;
  tiempoSolucionDias: number;
  reportadoPor: string;
  observacion: string;
}

export interface ChatMonthStat {
  mes: string;
  entrantes: number;
  atendidas: number;
  abandonadas: number;
  tasaAtencionPct: number;
}

export interface ChatStatsSummary {
  anio: number;
  totales: {
    entrantes: number;
    atendidas: number;
    abandonadas: number;
    tasaAtencionPct: number;
    tasaAbandonoPct: number;
  };
  meses: ChatMonthStat[];
}

export interface SpecialCaseTimeMetrics {
  totalCases: number;
  resolvedCases: number;
  pendingCases: number;
  resolutionRate: number;
  stats: ComprehensiveTimeStats;
  topSlowTipificacion: { name: string; avgHours: number; count: number };
  topFastTipificacion: { name: string; avgHours: number; count: number };
  topSlowArea: { name: string; avgHours: number; count: number };
  topFastSupervisor: { name: string; avgHours: number; count: number };
}

export type { TimeUnit, ComprehensiveTimeStats };
