import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

export interface SemanaData {
  semana: string;
  nuevas: number;
  reingresos: number;
  demanda: number;
  atendidas: number;
  aprobadas: number;
  rechazos: number;
  cobertura: number;
  atendidas_primera?: number;
  atendidas_reingreso?: number;
}

interface Props {
  initialData?: SemanaData[];
}

const DEFAULT_SEMANAS: SemanaData[] = [
  { semana: 'Sem 01', nuevas: 5989, reingresos: 1255, demanda: 7244, atendidas: 7244, aprobadas: 4909, rechazos: 2327, cobertura: 100.0 },
  { semana: 'Sem 02', nuevas: 14904, reingresos: 2269, demanda: 17173, atendidas: 17173, aprobadas: 10707, rechazos: 6446, cobertura: 100.0 },
  { semana: 'Sem 03', nuevas: 12900, reingresos: 2020, demanda: 14920, atendidas: 14920, aprobadas: 9806, rechazos: 5104, cobertura: 100.0 },
  { semana: 'Sem 04', nuevas: 11304, reingresos: 1778, demanda: 13082, atendidas: 13082, aprobadas: 9193, rechazos: 3863, cobertura: 100.0 },
  { semana: 'Sem 05', nuevas: 10882, reingresos: 1813, demanda: 12695, atendidas: 12695, aprobadas: 8601, rechazos: 4081, cobertura: 100.0 },
  { semana: 'Sem 06', nuevas: 9308, reingresos: 1670, demanda: 10978, atendidas: 10978, aprobadas: 7539, rechazos: 3426, cobertura: 100.0 },
  { semana: 'Sem 07', nuevas: 8855, reingresos: 1629, demanda: 10484, atendidas: 10484, aprobadas: 7291, rechazos: 3181, cobertura: 100.0 },
  { semana: 'Sem 08', nuevas: 8362, reingresos: 1588, demanda: 9950, atendidas: 9950, aprobadas: 6757, rechazos: 3185, cobertura: 100.0 },
  { semana: 'Sem 09', nuevas: 7990, reingresos: 1539, demanda: 9529, atendidas: 9529, aprobadas: 6455, rechazos: 3068, cobertura: 100.0 },
  { semana: 'Sem 10', nuevas: 8038, reingresos: 1456, demanda: 9494, atendidas: 9494, aprobadas: 6504, rechazos: 2977, cobertura: 100.0 },
  { semana: 'Sem 11', nuevas: 7547, reingresos: 1422, demanda: 8969, atendidas: 8969, aprobadas: 6135, rechazos: 2821, cobertura: 100.0 },
  { semana: 'Sem 12', nuevas: 7166, reingresos: 1284, demanda: 8450, atendidas: 8450, aprobadas: 5683, rechazos: 2751, cobertura: 100.0 },
  { semana: 'Sem 13', nuevas: 1194, reingresos: 169, demanda: 1363, atendidas: 1363, aprobadas: 1029, rechazos: 332, cobertura: 100.0 },
  { semana: 'Sem 16', nuevas: 26, reingresos: 8, demanda: 34, atendidas: 34, aprobadas: 8, rechazos: 26, cobertura: 100.0 },
  { semana: 'Sem 17', nuevas: 1489, reingresos: 341, demanda: 1830, atendidas: 1830, aprobadas: 1125, rechazos: 703, cobertura: 100.0 },
  { semana: 'Sem 18', nuevas: 6176, reingresos: 1236, demanda: 7412, atendidas: 7412, aprobadas: 5047, rechazos: 2355, cobertura: 100.0 },
  { semana: 'Sem 19', nuevas: 5883, reingresos: 933, demanda: 6816, atendidas: 6816, aprobadas: 4897, rechazos: 1907, cobertura: 100.0 },
  { semana: 'Sem 20', nuevas: 270, reingresos: 23, demanda: 293, atendidas: 293, aprobadas: 239, rechazos: 53, cobertura: 100.0 },
  { semana: 'Sem 21', nuevas: 35, reingresos: 9, demanda: 44, atendidas: 44, aprobadas: 34, rechazos: 10, cobertura: 100.0 },
  { semana: 'Sem 22', nuevas: 7, reingresos: 1, demanda: 8, atendidas: 8, aprobadas: 2, rechazos: 6, cobertura: 100.0 },
  { semana: 'Sem 23', nuevas: 32, reingresos: 7, demanda: 39, atendidas: 39, aprobadas: 7, rechazos: 32, cobertura: 100.0 },
  { semana: 'Sem 24', nuevas: 2762, reingresos: 703, demanda: 3465, atendidas: 3465, aprobadas: 2498, rechazos: 962, cobertura: 100.0 },
  { semana: 'Sem 25', nuevas: 4181, reingresos: 648, demanda: 4829, atendidas: 4829, aprobadas: 3716, rechazos: 1108, cobertura: 100.0 },
  { semana: 'Sem 26', nuevas: 15, reingresos: 5, demanda: 20, atendidas: 20, aprobadas: 11, rechazos: 9, cobertura: 100.0 },
  { semana: 'Sem 27', nuevas: 68, reingresos: 2, demanda: 70, atendidas: 70, aprobadas: 20, rechazos: 50, cobertura: 100.0 },
  { semana: 'Sem 28', nuevas: 245, reingresos: 15, demanda: 260, atendidas: 260, aprobadas: 16, rechazos: 244, cobertura: 100.0 },
];

export const RechazosTrendChart: React.FC<Props> = ({ initialData = DEFAULT_SEMANAS }) => {
  const [periodo, setPeriodo] = useState<'TODAS' | 'Q1' | 'Q2' | 'Q3'>('TODAS');
  const [metricMode, setMetricMode] = useState<'volumen' | 'tasa' | 'dual'>('dual');
  const [showAverage, setShowAverage] = useState<boolean>(true);

  // Formatter helpers
  const fmt = (num: number) => new Intl.NumberFormat('es-GT').format(num);

  // Filtered dataset with calculated percentage
  const chartData = useMemo(() => {
    let raw = initialData && initialData.length > 0 ? initialData : DEFAULT_SEMANAS;
    
    const getWeekNum = (s: string) => parseInt(s.replace('Sem ', ''), 10) || 0;
    if (periodo === 'Q1') {
      raw = raw.filter(d => getWeekNum(d.semana) >= 1 && getWeekNum(d.semana) <= 13);
    } else if (periodo === 'Q2') {
      raw = raw.filter(d => getWeekNum(d.semana) >= 14 && getWeekNum(d.semana) <= 26);
    } else if (periodo === 'Q3') {
      raw = raw.filter(d => getWeekNum(d.semana) >= 27);
    }

    return raw.map(d => {
      const tasaRechazo = d.atendidas > 0 ? Math.round((d.rechazos / d.atendidas) * 1000) / 10 : 0;
      const tasaAprobacion = d.atendidas > 0 ? Math.round((d.aprobadas / d.atendidas) * 1000) / 10 : 0;
      return {
        ...d,
        tasaRechazo,
        tasaAprobacion,
      };
    });
  }, [initialData, periodo]);

  // Summary KPIs for current selection
  const kpis = useMemo(() => {
    const totalRechazos = chartData.reduce((acc, curr) => acc + curr.rechazos, 0);
    const totalAprobadas = chartData.reduce((acc, curr) => acc + curr.aprobadas, 0);
    const totalAtendidas = chartData.reduce((acc, curr) => acc + curr.atendidas, 0);
    const tasaPromedio = totalAtendidas > 0 ? Math.round((totalRechazos / totalAtendidas) * 1000) / 10 : 0;
    
    let maxRechazosItem = chartData[0] || { semana: '-', rechazos: 0 };
    let minTasaItem = chartData[0] || { semana: '-', tasaRechazo: 0 };
    
    chartData.forEach(d => {
      if (d.rechazos > maxRechazosItem.rechazos) maxRechazosItem = d;
      if (d.tasaRechazo < minTasaItem.tasaRechazo) minTasaItem = d;
    });

    return {
      totalRechazos,
      totalAprobadas,
      totalAtendidas,
      tasaPromedio,
      maxSemana: maxRechazosItem.semana,
      maxVal: maxRechazosItem.rechazos,
      minSemana: minTasaItem.semana,
      minTasa: minTasaItem.tasaRechazo,
    };
  }, [chartData]);

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as SemanaData & { tasaRechazo: number; tasaAprobacion: number };
      return (
        <div className="bg-slate-950/95 backdrop-blur-md text-white border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs space-y-2 min-w-[210px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold">
            <span className="text-amber-400 font-mono text-sm">{label}</span>
            <span className="text-[10px] text-slate-400 uppercase font-sans">Auditoría Semanal</span>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-rose-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                <span>Rechazos Emitidos:</span>
              </span>
              <span className="font-mono font-bold text-white">{fmt(dataPoint.rechazos)}</span>
            </div>

            <div className="flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Aprobaciones:</span>
              </span>
              <span className="font-mono font-bold text-white">{fmt(dataPoint.aprobadas)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300 border-t border-slate-800/80 pt-1">
              <span className="text-slate-400">Total Revisiones:</span>
              <span className="font-mono font-semibold text-slate-200">{fmt(dataPoint.atendidas)}</span>
            </div>

            <div className="flex items-center justify-between text-amber-300 font-semibold bg-amber-950/50 p-1.5 rounded-lg border border-amber-500/20">
              <span>Tasa de Rechazo:</span>
              <span className="font-mono font-bold text-amber-400">{dataPoint.tasaRechazo}%</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 pt-0.5 border-t border-slate-800/60 flex items-center justify-between">
            <span>Demanda entrante:</span>
            <span className="font-mono text-slate-300">{fmt(dataPoint.demanda)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-5 transition-all duration-300 border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-xs" id="rechazosTrendCard">
      
      {/* Header with Title and Interactive Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/70 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/80 backdrop-blur-xs">
              Métrica de Calidad & Trazabilidad
            </span>
            <span className="text-slate-300 text-xs">•</span>
            <span className="text-[11px] font-semibold text-slate-500">Librería Recharts</span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
            Tendencia Temporal de Rechazos (Auditoría Semanal)
          </h3>
          <p className="text-xs text-slate-500 max-w-3xl">
            Comportamiento de los <strong>74,824 revisiones de rechazo</strong> a lo largo de las semanas evaluadas, identificando picos de inconsistencias en expedientes y la estabilización del criterio revisor.
          </p>
        </div>

        {/* Controls Bar: Period Selector & Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Period Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 px-2.5 py-1.5 rounded-xl border border-slate-200/80 text-xs shadow-2xs">
            <span className="text-slate-500 font-medium text-[11px]">Corte:</span>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as any)}
              className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer text-xs pr-1"
              id="selectPeriodoRechazos"
            >
              <option value="TODAS">Todas las Semanas (21)</option>
              <option value="Q1">Q1: Ene - Mar (Sem 01-13)</option>
              <option value="Q2">Q2: Abr - Jun (Sem 17-25)</option>
              <option value="Q3">Q3: Cierre Jul (Sem 30-31)</option>
            </select>
          </div>

          {/* Metric View Mode Toggle */}
          <div className="flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 text-xs font-semibold shadow-2xs">
            <button
              onClick={() => setMetricMode('dual')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                metricMode === 'dual'
                  ? 'bg-white shadow-2xs text-rose-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ver Rechazos y Aprobadas"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Dual
            </button>
            <button
              onClick={() => setMetricMode('volumen')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                metricMode === 'volumen'
                  ? 'bg-white shadow-2xs text-rose-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Solo Volumen de Rechazos"
            >
              Volumen
            </button>
            <button
              onClick={() => setMetricMode('tasa')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                metricMode === 'tasa'
                  ? 'bg-white shadow-2xs text-amber-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Solo Tasa de Rechazo (%)"
            >
              % Tasa
            </button>
          </div>

          {/* Toggle Average Line */}
          <button
            onClick={() => setShowAverage(!showAverage)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs ${
              showAverage
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-white text-slate-500 border-slate-200 opacity-60'
            }`}
            title="Mostrar u ocultar línea de promedio histórico"
          >
            <span className="w-2.5 h-0.5 bg-amber-600 inline-block border-t border-dashed"></span>
            <span>Promedio (40.9%)</span>
          </button>
        </div>
      </div>

      {/* 4 Mini Stat Badges for Quick Audit Verification */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-rose-50/70 border border-rose-200/70 rounded-xl backdrop-blur-xs">
          <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Rechazos en Período</div>
          <div className="text-lg sm:text-xl font-black text-rose-900 font-mono mt-0.5" id="statRechazosTotal">
            {fmt(kpis.totalRechazos)}
          </div>
          <div className="text-[10px] text-rose-700 mt-0.5">Revisiones desfavorables</div>
        </div>

        <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl backdrop-blur-xs">
          <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Tasa Promedio Rechazo</div>
          <div className="text-lg sm:text-xl font-black text-amber-900 font-mono mt-0.5" id="statTasaPromedio">
            {kpis.tasaPromedio}%
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5">Sobre expedientes atendidos</div>
        </div>

        <div className="p-3 bg-indigo-50/70 border border-indigo-200/70 rounded-xl backdrop-blur-xs">
          <div className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Pico Máximo Rechazos</div>
          <div className="text-lg sm:text-xl font-black text-indigo-900 font-mono mt-0.5" id="statPicoRechazos">
            {fmt(kpis.maxVal)}
          </div>
          <div className="text-[10px] text-indigo-700 mt-0.5">Registrado en {kpis.maxSemana}</div>
        </div>

        <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl backdrop-blur-xs">
          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Aprobadas Comparativas</div>
          <div className="text-lg sm:text-xl font-black text-emerald-900 font-mono mt-0.5" id="statAprobadasTotal">
            {fmt(kpis.totalAprobadas)}
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">{(100 - kpis.tasaPromedio).toFixed(1)}% resoluciones directas</div>
        </div>
      </div>

      {/* Recharts Main Chart Container */}
      <div className="w-full h-80 sm:h-96 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 15, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
            <XAxis
              dataKey="semana"
              tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={{ stroke: '#cbd5e1' }}
            />
            
            {/* Left Y Axis for Volume */}
            {(metricMode === 'volumen' || metricMode === 'dual') && (
              <YAxis
                yAxisId="left"
                tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
              />
            )}

            {/* Right Y Axis for Percentage */}
            {(metricMode === 'tasa' || metricMode === 'dual') && (
              <YAxis
                yAxisId="right"
                orientation={metricMode === 'tasa' ? 'left' : 'right'}
                domain={[0, 100]}
                tick={{ fill: '#d97706', fontSize: 11, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#fde68a' }}
                tickLine={{ stroke: '#fde68a' }}
                tickFormatter={(val) => `${val}%`}
              />
            )}

            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingBottom: '8px' }}
            />

            {/* Reference Line for Historical Average Rejection Rate */}
            {showAverage && (metricMode === 'tasa' || metricMode === 'dual') && (
              <ReferenceLine
                yAxisId="right"
                y={40.9}
                stroke="#d97706"
                strokeDasharray="4 4"
                strokeWidth={1.8}
                label={{
                  value: 'Promedio Histórico: 40.9%',
                  position: 'insideTopRight',
                  fill: '#b45309',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            )}

            {/* Line 1: Rechazos (Volume) */}
            {(metricMode === 'volumen' || metricMode === 'dual') && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="rechazos"
                name="Rechazos Emitidos"
                stroke="#e11d48"
                strokeWidth={3}
                dot={{ r: 4, fill: '#e11d48', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 7, fill: '#be123c', stroke: '#ffffff', strokeWidth: 2 }}
                animationDuration={800}
              />
            )}

            {/* Line 2: Aprobadas (Volume) in Dual Mode */}
            {metricMode === 'dual' && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="aprobadas"
                name="Aprobaciones"
                stroke="#10b981"
                strokeWidth={2.2}
                strokeDasharray="4 2"
                dot={{ r: 3.5, fill: '#10b981', strokeWidth: 1.5, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                animationDuration={800}
              />
            )}

            {/* Line 3: Tasa de Rechazo (%) */}
            {(metricMode === 'tasa' || metricMode === 'dual') && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tasaRechazo"
                name="Tasa de Rechazo (%)"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6.5, fill: '#d97706', stroke: '#ffffff', strokeWidth: 2 }}
                animationDuration={900}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Audit Insight Callout Footer */}
      <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
          <span>
            <strong>Diagnóstico Forense:</strong> El volumen semanal de rechazos alcanza su punto máximo en la <strong>Sem 03 (8,931 rechazos)</strong> ante el choque de demanda de inicio de año, convergiendo posteriormente a una tasa media estable del <strong>~40.9%</strong>.
          </span>
        </div>
        <div className="shrink-0 text-[11px] font-mono text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200">
          Fuente: Cube OLAP & Capacidad Semanal
        </div>
      </div>

    </div>
  );
};

export default RechazosTrendChart;
