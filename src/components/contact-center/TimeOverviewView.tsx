import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Layers,
  ShieldCheck,
  Calendar,
  Info,
  Briefcase,
  MessageSquare,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { ChatStatsSummary, SpecialCase, SpecialCaseTimeMetrics } from '../../types/contactCenter';
import { formatNumber, formatDecimal } from '../../utils/contactCenter/formatters';

interface TimeOverviewViewProps {
  cases: SpecialCase[];
  metrics: SpecialCaseTimeMetrics;
  chatStats: ChatStatsSummary;
  onSelectCase: (caseItem: SpecialCase) => void;
}

const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const TimeOverviewView: React.FC<TimeOverviewViewProps> = ({
  cases,
  metrics,
  chatStats,
  onSelectCase,
}) => {
  const stats = metrics.stats;
  const totalN = cases.length;

  const [selectedMonth, setSelectedMonth] = useState<string>('Diciembre');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('TODOS');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;

  const monthlyData = useMemo(() => {
    return SPANISH_MONTHS.map((m) => {
      const mCases = cases.filter((c) => c.mes.toLowerCase() === m.toLowerCase());
      const count = mCases.length;
      if (count === 0) {
        return {
          mes: m,
          count: 0,
          rawSumExcel: 0,
          sumHours: 0,
          rawAvgExcel: 0,
          avgHours: 0,
          medianHours: 0,
          modeHours: 0,
          modeCount: 0,
          modePct: 0,
          p90Hours: 0,
          minHours: 0,
          maxHours: 0,
        };
      }

      const rawSumExcel = mCases.reduce((acc, c) => acc + c.tiempoSolucionDias, 0);
      const rawAvgExcel = Number((rawSumExcel / count).toFixed(2));
      const sorted = mCases.map((c) => Math.round(c.tiempoSolucionDias * 8)).sort((a, b) => a - b);
      const sumHours = sorted.reduce((acc, v) => acc + v, 0);
      const avgHours = Number((sumHours / count).toFixed(2));
      const medianHours =
        count % 2 === 1
          ? sorted[Math.floor(count / 2)]
          : Number(((sorted[count / 2 - 1] + sorted[count / 2]) / 2).toFixed(1));

      const freq: Record<number, number> = {};
      sorted.forEach((v) => {
        freq[v] = (freq[v] || 0) + 1;
      });
      let modeHours = sorted[0];
      let maxF = 0;
      Object.entries(freq).forEach(([v, f]) => {
        if (f > maxF) {
          maxF = f;
          modeHours = Number(v);
        }
      });

      const p90Hours = sorted[Math.floor(0.9 * (count - 1))] ?? 0;
      const minHours = sorted[0];
      const maxHours = sorted[sorted.length - 1];

      return {
        mes: m,
        count,
        rawSumExcel,
        sumHours,
        rawAvgExcel,
        avgHours,
        medianHours,
        modeHours,
        modeCount: maxF,
        modePct: Number(((maxF / count) * 100).toFixed(1)),
        p90Hours,
        minHours,
        maxHours,
      };
    });
  }, [cases]);

  const activeMonthData = useMemo(() => {
    return monthlyData.find((m) => m.mes.toLowerCase() === selectedMonth.toLowerCase()) || monthlyData[11];
  }, [monthlyData, selectedMonth]);

  const totalSumExcel = useMemo(() => cases.reduce((acc, c) => acc + c.tiempoSolucionDias, 0), [cases]);
  const totalSumHours = useMemo(() => cases.reduce((acc, c) => acc + Math.round(c.tiempoSolucionDias * 8), 0), [cases]);
  const rawMeanHours = totalN > 0 ? totalSumHours / totalN : 0;

  const filteredCases = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return cases.filter((c) => {
      if (monthFilter !== 'TODOS' && c.mes.toLowerCase() !== monthFilter.toLowerCase()) return false;
      if (statusFilter !== 'TODOS' && c.estado !== statusFilter) return false;
      if (!q) return true;
      return (
        c.id.toLowerCase().includes(q) ||
        c.nit.toLowerCase().includes(q) ||
        c.tipificacion.toLowerCase().includes(q) ||
        c.areaResolucion.toLowerCase().includes(q) ||
        c.supervisor.toLowerCase().includes(q) ||
        c.descripcion.toLowerCase().includes(q)
      );
    });
  }, [cases, searchTerm, monthFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedCases = filteredCases.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 max-w-full pb-12">
      {/* Banner explicativo de Base de 8 Horas Hábiles */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight text-amber-900">
              Estándar Operativo: Base de 8 Horas Hábiles por Día Laboral
            </h2>
            <p className="text-xs text-amber-800 mt-0.5">
              Para homologar las métricas con el Visor AV &amp; RTU, cada día hábil transcurrido equivale a{' '}
              <strong>8 horas laborales efectivas</strong> (1 día = 8h hábiles).
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-200/90 text-amber-950 border border-amber-300 self-start sm:self-auto shrink-0 font-mono">
          1 Día = 8 Horas Hábiles
        </span>
      </div>

      {/* 1. SECCIÓN: ANÁLISIS MES A MES */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Paso 1
              </span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Análisis de Tiempos Mes a Mes (8 Horas Hábiles)
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Desglose detallado para los 12 meses: suma directa en días, conversión a horas hábiles (&times;8h), promedio, mediana y moda.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Seleccionar Mes para Detalle:
          </label>
          <div className="flex flex-wrap gap-1.5 pb-1">
            {SPANISH_MONTHS.map((m) => {
              const isSelected = selectedMonth.toLowerCase() === m.toLowerCase();
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 p-4 sm:p-5 rounded-xl bg-slate-50 border-2 border-blue-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Ficha Auditada del Mes
              </span>
              <h4 className="text-xl font-black text-slate-900">
                {activeMonthData.mes} — {formatNumber(activeMonthData.count)} Casos Registrados
              </h4>
            </div>
            <div className="text-xs text-slate-600 font-medium">
              Rango en horas hábiles:{' '}
              <strong>
                {formatNumber(activeMonthData.minHours)}h a {formatNumber(activeMonthData.maxHours)}h
              </strong>
            </div>
          </div>

          <div className="mt-3 p-3 bg-blue-50/80 rounded-lg border border-blue-200 text-xs text-blue-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div>
                <strong>Auditoría Exacta de {activeMonthData.mes} (Base 8 Horas Hábiles):</strong>
              </div>
              <div className="font-mono text-[11px] space-y-0.5 text-blue-900">
                <div>
                  • Suma directa en días: <strong>{formatNumber(activeMonthData.rawSumExcel)}</strong> días
                </div>
                <div>
                  • Conversión a Horas Hábiles (&times; 8h):{' '}
                  <strong>
                    {formatNumber(activeMonthData.rawSumExcel)} &times; 8 = {formatNumber(activeMonthData.sumHours)} horas hábiles
                  </strong>
                </div>
                <div>
                  • Promedio en Horas Hábiles:{' '}
                  <strong>
                    {formatNumber(activeMonthData.sumHours)} hrs &divide; {formatNumber(activeMonthData.count)} casos ={' '}
                    {formatDecimal(activeMonthData.avgHours)} horas hábiles
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">
                Sumatoria Horas Hábiles
              </span>
              <div className="text-xl font-black text-blue-700 mt-1 font-mono">
                {formatNumber(activeMonthData.sumHours)} hrs
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                Días: {formatNumber(activeMonthData.rawSumExcel)} &times; 8h
              </span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">
                Promedio / Media Hábil
              </span>
              <div className="text-xl font-black text-blue-600 mt-1 font-mono">
                {formatDecimal(activeMonthData.avgHours)} hrs
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                {formatNumber(activeMonthData.sumHours)}h &divide; {formatNumber(activeMonthData.count)}
              </span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">
                Mediana Hábil (P50)
              </span>
              <div className="text-xl font-black text-emerald-600 mt-1 font-mono">
                {formatNumber(activeMonthData.medianHours)} hrs
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                50% de casos &le; {formatNumber(activeMonthData.medianHours)}h hábiles
              </span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">
                Moda Hábil (Más Frecuente)
              </span>
              <div className="text-xl font-black text-indigo-600 mt-1 font-mono">
                {formatNumber(activeMonthData.modeHours)} hrs
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {formatNumber(activeMonthData.modeCount)} casos ({formatDecimal(activeMonthData.modePct, 1)}%)
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            Tabla Comparativa de los 12 Meses (Días vs Horas Hábiles &times; 8)
          </h4>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Mes</th>
                  <th className="py-2.5 px-3 text-center">Nº Casos</th>
                  <th className="py-2.5 px-3 text-right">Suma (Días)</th>
                  <th className="py-2.5 px-3 text-right">Sumatoria (Horas Hábiles &times;8)</th>
                  <th className="py-2.5 px-3 text-right">Media Hábil</th>
                  <th className="py-2.5 px-3 text-right">Mediana Hábil</th>
                  <th className="py-2.5 px-3 text-right">Moda Hábil</th>
                  <th className="py-2.5 px-3 text-right">% en Moda</th>
                  <th className="py-2.5 px-3 text-right">P90 Hábil (90%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-mono">
                {monthlyData.map((m) => {
                  const isCurrent = m.mes.toLowerCase() === selectedMonth.toLowerCase();
                  return (
                    <tr
                      key={m.mes}
                      onClick={() => setSelectedMonth(m.mes)}
                      className={`cursor-pointer transition-colors ${
                        isCurrent ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2 px-3 font-sans font-bold text-slate-900 flex items-center gap-1.5">
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
                        {m.mes}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-700">{formatNumber(m.count)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-800 bg-slate-50/50">
                        {formatNumber(m.rawSumExcel)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-blue-700">{formatNumber(m.sumHours)} hrs</td>
                      <td className="py-2 px-3 text-right font-extrabold text-blue-600">
                        {formatDecimal(m.avgHours)} hrs
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-600">{formatNumber(m.medianHours)} hrs</td>
                      <td className="py-2 px-3 text-right text-indigo-600">{formatNumber(m.modeHours)} hrs</td>
                      <td className="py-2 px-3 text-right font-sans font-medium text-slate-600">
                        {formatDecimal(m.modePct, 1)}%
                      </td>
                      <td className="py-2 px-3 text-right text-amber-700">{formatNumber(m.p90Hours)} hrs</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. SECCIÓN: TOTAL GENERAL CONSOLIDADO */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Paso 2
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Total General Consolidado ({formatNumber(totalN)} Casos Especiales — 8h Hábiles)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consolidación anual de todos los meses con sumatoria auditada, media aritmética hábil, mediana, moda y percentiles en horas laborales efectivas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5">
          <div className="p-4 rounded-xl bg-blue-50/90 border border-blue-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-950 uppercase tracking-wide">
                  Sumatoria Total Hábil
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-200 text-blue-950">
                  Total Año
                </span>
              </div>
              <div className="text-3xl font-black text-blue-800 mt-2 font-mono">
                {formatNumber(totalSumHours)} hrs
              </div>
              <div className="text-xs font-bold text-blue-900 mt-0.5">
                {formatNumber(totalN)} casos ({formatNumber(totalSumExcel)} días &times; 8)
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-blue-200 text-[11px] text-blue-950">
              Suma consolidada de los 12 meses del ejercicio.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                  Mediana Hábil (P50)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-950">
                  Punto Central
                </span>
              </div>
              <div className="text-3xl font-black text-emerald-700 mt-2 font-mono">
                {formatNumber(stats.medianHours)} hrs hábiles
              </div>
              <div className="text-xs font-bold text-emerald-800 mt-0.5">
                Punto central (1 jornada hábil)
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-emerald-200 text-[11px] text-emerald-950">
              El <strong>50%</strong> de todos los casos concluye en{' '}
              <strong>{formatNumber(stats.medianHours)} horas hábiles o menos</strong>.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/90 border border-indigo-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                  Moda Hábil (Más Frecuente)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-200 text-indigo-950">
                  Más Frecuente
                </span>
              </div>
              <div className="text-3xl font-black text-indigo-700 mt-2 font-mono">
                {formatNumber(stats.modeHours)} hrs hábiles
              </div>
              <div className="text-xs font-bold text-indigo-900 mt-0.5">
                {formatNumber(stats.modeFrequency)} casos ({formatDecimal(stats.modePercentage, 1)}%)
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-indigo-200 text-[11px] text-indigo-950">
              El <strong>{formatDecimal(stats.modePercentage, 1)}%</strong> se resolvió en{' '}
              <strong>{formatNumber(stats.modeHours)} horas hábiles</strong>.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Media / Promedio Hábil
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                  Media Simple
                </span>
              </div>
              <div className="text-2xl font-black text-slate-800 mt-2 font-mono">
                {formatDecimal(rawMeanHours)} hrs hábiles
              </div>
              <div className="text-xs font-bold text-slate-700 mt-0.5">
                {formatNumber(totalSumHours)} hrs &divide; {formatNumber(totalN)} casos
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-200 text-[11px] text-slate-700">
              Promedio general anual en horas hábiles efectivas.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-950 uppercase tracking-wide">
                  Media Recortada (Trimmed 10%)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-950">
                  Robusta a Outliers
                </span>
              </div>
              <div className="text-2xl font-black text-purple-700 mt-2 font-mono">
                {formatDecimal(stats.trimmedMean10Hours)} hrs hábiles
              </div>
              <div className="text-xs font-bold text-purple-900 mt-0.5">
                Promedio del 80% central de los casos
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-purple-200 text-[11px] text-purple-900">
              Descarta el 10% más rápido y el 10% más lento para eliminar extremos.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
                  Percentil 90 Hábil (P90)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-950">
                  90% Cumplimiento
                </span>
              </div>
              <div className="text-2xl font-black text-amber-800 mt-2 font-mono">
                {formatNumber(stats.p90Hours)} hrs hábiles
              </div>
              <div className="text-xs font-bold text-amber-900 mt-0.5">
                El 90% concluye &le; {formatNumber(stats.p90Hours)}h hábiles
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-amber-200 text-[11px] text-amber-900">
              Umbral que cubre el 90% de la demanda anual en jornada laboral.
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            Tabla Resumen de Estadísticos del Total General (Base 8 Horas Hábiles)
          </h4>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Métrica Estadística</th>
                  <th className="py-2.5 px-3 text-right">Valor en Horas Hábiles</th>
                  <th className="py-2.5 px-3">Fórmula / Base de Cálculo</th>
                  <th className="py-2.5 px-3">Interpretación Operativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-bold text-slate-900">Sumatoria Total Hábil</td>
                  <td className="py-2.5 px-3 text-right font-black text-blue-700 font-mono">
                    {formatNumber(totalSumHours)} hrs
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    {formatNumber(totalSumExcel)} días &times; 8h
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    Suma total de horas laborales requeridas para los {formatNumber(totalN)} casos
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-bold text-slate-900">Mediana Hábil (Percentil 50)</td>
                  <td className="py-2.5 px-3 text-right font-black text-emerald-600 font-mono">
                    {formatNumber(stats.medianHours)} hrs
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">Posición central (N+1)/2</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    El 50% de los casos se resuelve en {formatNumber(stats.medianHours)}h hábiles o menos
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-bold text-slate-900">Moda Hábil (Valor Modal)</td>
                  <td className="py-2.5 px-3 text-right font-black text-indigo-600 font-mono">
                    {formatNumber(stats.modeHours)} hrs
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    Mayor frecuencia ({formatNumber(stats.modeFrequency)} casos)
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    El {formatDecimal(stats.modePercentage, 1)}% concluye en {formatNumber(stats.modeHours)}h hábiles
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-bold text-slate-900">Media / Promedio Hábil</td>
                  <td className="py-2.5 px-3 text-right font-black text-blue-600 font-mono">
                    {formatDecimal(rawMeanHours)} hrs
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    {formatNumber(totalSumHours)} hrs &divide; {formatNumber(totalN)} casos
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">Promedio general anual de resolución en horas hábiles</td>
                </tr>
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-bold text-slate-900">Media Recortada (Trimmed 10%)</td>
                  <td className="py-2.5 px-3 text-right font-bold text-purple-600 font-mono">
                    {formatDecimal(stats.trimmedMean10Hours)} hrs
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">Media del 80% central</td>
                  <td className="py-2.5 px-3 text-slate-600">Media limpia sin el 10% superior ni el 10% inferior</td>
                </tr>
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-bold text-slate-900">Percentil 90 Hábil (P90)</td>
                  <td className="py-2.5 px-3 text-right font-bold text-amber-700 font-mono">
                    {formatNumber(stats.p90Hours)} hrs
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">P90 = 0.90 &times; (N-1)</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    El 90% de los casos concluye en {formatNumber(stats.p90Hours)} horas hábiles o menos
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-bold text-slate-900">Percentil 95 Hábil (P95)</td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-600 font-mono">
                    {formatNumber(stats.p95Hours)} hrs
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">P95 = 0.95 &times; (N-1)</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    El 95% de los casos concluye en {formatNumber(stats.p95Hours)} horas hábiles o menos
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-bold text-slate-900">Desviación Estándar (&sigma;)</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800 font-mono">
                    &plusmn; {formatDecimal(stats.stdDevHours)} hrs
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    &sigma; = &radic;{formatDecimal(stats.varianceHours)} hrs&sup2;
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">Dispersión de los tiempos respecto al promedio hábil</td>
                </tr>
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-bold text-slate-900">Rango General Hábil</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800 font-mono">
                    {formatNumber(stats.minHours)} a {formatNumber(stats.maxHours)} hrs
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    Max - Min = {formatNumber(stats.rangeHours)} hrs
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    Amplitud total de los {formatNumber(totalN)} casos en horas hábiles
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. SECCIÓN: ESTADÍSTICAS DEL SERVICIO DE CHAT 2025 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                Paso 3
              </span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                Servicio de Chat del Contact Center ({chatStats.anio})
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Volumen mensual consolidado de sesiones entrantes, atendidas y abandonadas (datos agregados sin PII).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Sesiones Entrantes</span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {formatNumber(chatStats.totales.entrantes)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-700 uppercase block">Sesiones Atendidas</span>
            <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
              {formatNumber(chatStats.totales.atendidas)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
            <span className="text-[11px] font-bold text-rose-700 uppercase block">Sesiones Abandonadas</span>
            <div className="text-2xl font-black text-rose-700 font-mono mt-1">
              {formatNumber(chatStats.totales.abandonadas)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-[11px] font-bold text-blue-700 uppercase block">Tasa de Atención</span>
            <div className="text-2xl font-black text-blue-700 font-mono mt-1">
              {formatDecimal(chatStats.totales.tasaAtencionPct, 2)}%
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Mes</th>
                <th className="py-2.5 px-3 text-right">Entrantes</th>
                <th className="py-2.5 px-3 text-right">Atendidas</th>
                <th className="py-2.5 px-3 text-right">Abandonadas</th>
                <th className="py-2.5 px-3 text-right">Nivel de Atención</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-mono">
              {chatStats.meses.map((row) => (
                <tr key={row.mes} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-sans font-bold text-slate-900">{row.mes}</td>
                  <td className="py-2 px-3 text-right text-slate-800">{formatNumber(row.entrantes)}</td>
                  <td className="py-2 px-3 text-right font-semibold text-emerald-700">{formatNumber(row.atendidas)}</td>
                  <td className="py-2 px-3 text-right font-semibold text-rose-600">{formatNumber(row.abandonadas)}</td>
                  <td className="py-2 px-3 text-right font-bold text-blue-700">
                    {formatDecimal(row.tasaAtencionPct, 2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. SECCIÓN: EXPLORADOR DE CASOS ANONIMIZADOS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              Explorador de Casos Especiales ({formatNumber(filteredCases.length)} resultados)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Haz clic en cualquier fila para inspeccionar la ficha del caso en horas hábiles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar tipificación, área, ID o ANON-NIT..."
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 w-56"
            />
            <select
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
            >
              <option value="TODOS">Todos los meses</option>
              {SPANISH_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="Resuelto">Resuelto</option>
              <option value="Pendiente">Pendiente</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Mes</th>
                <th className="py-2.5 px-3">Canal</th>
                <th className="py-2.5 px-3">Tipificación</th>
                <th className="py-2.5 px-3">Área</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3 text-right">Horas Hábiles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pagedCases.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onSelectCase(c)}
                  className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                >
                  <td className="py-2 px-3 font-mono font-semibold text-slate-700">{c.id}</td>
                  <td className="py-2 px-3 text-slate-700">{c.mes}</td>
                  <td className="py-2 px-3 text-slate-600">{c.canal}</td>
                  <td className="py-2 px-3 font-medium text-slate-900">{c.tipificacion}</td>
                  <td className="py-2 px-3 text-slate-600">{c.areaResolucion}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.estado === 'Resuelto'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                    {formatNumber(Math.round(c.tiempoSolucionDias * 8))}h
                  </td>
                </tr>
              ))}
              {pagedCases.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No se encontraron casos con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>
            Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              aria-label="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
