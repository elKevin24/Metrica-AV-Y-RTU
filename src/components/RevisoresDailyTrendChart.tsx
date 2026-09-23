import React, { useState, useMemo, useEffect } from 'react';
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

export interface DiaDetalle {
  fecha: string;
  diaSemana: string;
  atendidas: number;
  aprobadas: number;
  rechazadas: number;
  rechazos?: number;
  tasaRechazo: number;
  tasaAprobacion: number;
  tiempoPromSec: number;
  tiempoPromMin: number;
  metaAlcanzada?: boolean;
  pctMeta?: number;
  revisoresActivos?: number;
  promPorRevisor?: number;
  tramites: {
    correo: number;
    activacion: number;
  };
}

export interface RevisorMeta {
  revisor: string;
  tipo: string;
  regional: string;
  regional_nombre?: string;
  punto_atencion?: string;
  total: number;
  aprobadas: number;
  rechazadas: number;
  pct_aprobadas: number;
  tiempo_prom_min: number;
  prom_diario: number;
  cuadrante?: string;
  dias_activos: number;
}

export interface RevisoresDiarioData {
  total_revisores: number;
  puntos_por_regional?: { [key: string]: string[] };
  nacional: DiaDetalle[];
  regionales?: { [key: string]: DiaDetalle[] };
  puntos_atencion?: { [key: string]: DiaDetalle[] };
  revisores: {
    [key: string]: {
      meta: RevisorMeta;
      serie_diaria: DiaDetalle[];
    };
  };
}

interface Props {
  initialData?: RevisoresDiarioData;
}

const DEFAULT_PUNTOS_POR_REGIONAL: { [key: string]: string[] } = {
  CENTRAL: [
    'Sede Central (Edificio Dubai)',
    'Agencia Montserrat',
    'Agencia Galerías Primma',
    'Agencia San Rafael',
    'Agencia Carretera a El Salvador',
    'Agencia Chimaltenango',
    'Agencia Sacatepéquez (Antigua)',
    'Agencia El Progreso (Guastatoya)',
  ],
  OCCIDENTE: [
    'Agencia Quetzaltenango (Sede Occidente)',
    'Agencia Huehuetenango',
    'Agencia San Marcos',
    'Agencia Totonicapán',
    'Agencia Sololá',
    'Agencia Quiché',
  ],
  SUR: [
    'Agencia Escuintla (Sede Sur)',
    'Agencia Santa Rosa (Cuilapa)',
    'Agencia Suchitepéquez (Mazatenango)',
    'Agencia Retalhuleu',
    'Agencia Puerto Quetzal',
  ],
  NORORIENTE: [
    'Agencia Zacapa (Sede Nororiente)',
    'Agencia Chiquimula',
    'Agencia Izabal (Puerto Barrios)',
    'Agencia Alta Verapaz (Cobán)',
    'Agencia Baja Verapaz (Salamá)',
    'Agencia Petén (Santa Elena)',
    'Agencia Jalapa',
    'Agencia Jutiapa',
  ],
};

export const RevisoresDailyTrendChart: React.FC<Props> = ({ initialData }) => {
  const [data, setData] = useState<RevisoresDiarioData | null>(initialData || null);
  const [selectedRegional, setSelectedRegional] = useState<string>('TODAS');
  const [selectedPunto, setSelectedPunto] = useState<string>('TODOS');
  const [selectedRevisor, setSelectedRevisor] = useState<string>('CONSOLIDADO');
  const [periodo, setPeriodo] = useState<string>('TODOS');
  const [soloHabiles, setSoloHabiles] = useState<boolean>(true);
  const [metricMode, setMetricMode] = useState<'dual' | 'volumen' | 'tasa' | 'tiempo'>('dual');
  const [showMetaLine, setShowMetaLine] = useState<boolean>(true);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // Lazy fetch if not pre-rendered
  useEffect(() => {
    if (!data) {
      const base = (typeof window !== 'undefined' && (window as any).__BASE_URL__)
        ? (window as any).__BASE_URL__.replace(/\/$/, '')
        : '';
      fetch(`${base}/data/revisores_diario.json`.replace('//', '/'))
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json) setData(json);
        })
        .catch(() => {});
    }
  }, [data]);

  const fmt = (num: number) => new Intl.NumberFormat('es-GT').format(num);

  const puntosMapping = useMemo(() => {
    return data?.puntos_por_regional || DEFAULT_PUNTOS_POR_REGIONAL;
  }, [data]);

  // Dynamic available Puntos based on selected Regional
  const availablePuntos = useMemo(() => {
    if (selectedRegional === 'TODAS') {
      const all: string[] = [];
      Object.values(puntosMapping).forEach((list) => all.push(...list));
      return Array.from(new Set(all));
    }
    return puntosMapping[selectedRegional] || [];
  }, [puntosMapping, selectedRegional]);

  // Handle Regional Change
  const handleRegionalChange = (newReg: string) => {
    setSelectedRegional(newReg);
    setSelectedPunto('TODOS');
    setSelectedRevisor('CONSOLIDADO');
  };

  // Handle Punto Change
  const handlePuntoChange = (newPunto: string) => {
    setSelectedPunto(newPunto);
    setSelectedRevisor('CONSOLIDADO');
  };

  // List of all revisores filtered by selected Regional and Punto de Atención
  const filteredRevisoresList = useMemo(() => {
    if (!data?.revisores) return [];
    return Object.keys(data.revisores)
      .map((code) => {
        const item = data.revisores[code];
        return {
          code,
          meta: item.meta,
          total: item.meta?.total || 0,
          regional: item.meta?.regional || 'CENTRAL',
          punto: item.meta?.punto_atencion || 'Sede Central'
        };
      })
      .filter((r) => {
        if (selectedRegional !== 'TODAS' && r.regional !== selectedRegional) return false;
        if (selectedPunto !== 'TODOS' && r.punto !== selectedPunto) return false;
        return true;
      })
      .sort((a, b) => b.total - a.total);
  }, [data, selectedRegional, selectedPunto]);

  // Active series resolution based on selection hierarchy:
  // 1. Specific Revisor
  // 2. Specific Punto de Atención
  // 3. Specific Regional
  // 4. Nacional
  const rawSeries = useMemo(() => {
    if (!data) return [];
    if (selectedRevisor !== 'CONSOLIDADO') {
      return data.revisores?.[selectedRevisor]?.serie_diaria || [];
    }
    if (selectedPunto !== 'TODOS' && data.puntos_atencion?.[selectedPunto]) {
      return data.puntos_atencion[selectedPunto];
    }
    if (selectedRegional !== 'TODAS' && data.regionales?.[selectedRegional]) {
      return data.regionales[selectedRegional];
    }
    return data.nacional || [];
  }, [data, selectedRevisor, selectedPunto, selectedRegional]);

  const activeMeta = useMemo(() => {
    if (!data || selectedRevisor === 'CONSOLIDADO') return null;
    return data.revisores?.[selectedRevisor]?.meta || null;
  }, [data, selectedRevisor]);

  // Filtered series by period and business days
  const chartData = useMemo(() => {
    let list = [...rawSeries];

    if (periodo !== 'TODOS') {
      if (periodo === '30D') {
        list = list.slice(-30);
      } else if (periodo.startsWith('2026-')) {
        list = list.filter((d) => d.fecha.startsWith(periodo));
      }
    }

    if (soloHabiles) {
      list = list.filter((d) => !['Sáb', 'Dom'].includes(d.diaSemana));
    }

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    return list.map((d) => {
      const mIdx = parseInt(d.fecha.slice(5, 7), 10) - 1;
      const diaNum = d.fecha.slice(8, 10);
      return {
        ...d,
        etiquetaCorta: `${diaNum} ${meses[mIdx] || ''}`,
        rechazosContador: d.rechazos ?? d.rechazadas,
        superaMeta: d.atendidas >= 100
      };
    });
  }, [rawSeries, periodo, soloHabiles]);

  // Scope label for UI badge
  const scopeLabel = useMemo(() => {
    if (selectedRevisor !== 'CONSOLIDADO') return `Revisor: ${selectedRevisor}`;
    if (selectedPunto !== 'TODOS') return selectedPunto;
    if (selectedRegional !== 'TODAS') return `Regional ${selectedRegional}`;
    return 'Consolidado Nacional';
  }, [selectedRevisor, selectedPunto, selectedRegional]);

  // Summary Metrics
  const summary = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { total: 0, promDiario: 0, tasaRechazo: 0, metaPct: 0, mejorDia: 0 };
    }
    const total = chartData.reduce((acc, c) => acc + c.atendidas, 0);
    const rechazos = chartData.reduce((acc, c) => acc + (c.rechazos ?? c.rechazadas), 0);
    const diasCumplidos = chartData.filter((c) => c.atendidas >= 100).length;
    const mejorDia = Math.max(...chartData.map((c) => c.atendidas));

    return {
      total,
      promDiario: Math.round((total / chartData.length) * 10) / 10,
      tasaRechazo: total > 0 ? Math.round((rechazos / total) * 1000) / 10 : 0,
      metaPct: Math.round((diasCumplidos / chartData.length) * 100),
      diasCumplidos,
      mejorDia
    };
  }, [chartData]);

  // Custom minimal Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload as DiaDetalle & {
        etiquetaCorta: string;
        rechazosContador: number;
        superaMeta: boolean;
      };

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-800 rounded-xl p-3 shadow-xl text-xs space-y-2 min-w-[210px] z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold">
            <div>
              <span className="text-amber-400 font-mono text-xs block">
                {d.diaSemana} {d.fecha}
              </span>
              <span className="text-[10px] text-slate-400 font-sans font-normal">
                {scopeLabel}
              </span>
            </div>
            {selectedRevisor !== 'CONSOLIDADO' ? (
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                  d.superaMeta ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {d.superaMeta ? 'Meta ✓' : `${d.atendidas}/100`}
              </span>
            ) : d.revisoresActivos ? (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                {d.revisoresActivos} auditores
              </span>
            ) : null}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                Atendidas:
              </span>
              <span className="font-mono font-bold text-white">{fmt(d.atendidas)}</span>
            </div>

            <div className="flex justify-between items-center text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Aprobadas:
              </span>
              <span className="font-mono font-semibold">{fmt(d.aprobadas)} ({d.tasaAprobacion}%)</span>
            </div>

            <div className="flex justify-between items-center text-rose-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Rechazos:
              </span>
              <span className="font-mono font-semibold">{fmt(d.rechazosContador)} ({d.tasaRechazo}%)</span>
            </div>

            {selectedRevisor === 'CONSOLIDADO' && d.promPorRevisor ? (
              <div className="flex justify-between items-center text-amber-300 border-t border-slate-800/80 pt-1 text-[10px]">
                <span>Promedio / Auditor:</span>
                <span className="font-mono font-bold">{d.promPorRevisor} exp/día</span>
              </div>
            ) : null}

            {d.tiempoPromMin > 0 && (
              <div className="flex justify-between items-center text-slate-400 border-t border-slate-800/80 pt-1 text-[10px]">
                <span>Tiempo medio:</span>
                <span className="font-mono text-slate-300">{d.tiempoPromMin} min/exp</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-4 border border-slate-200/80 bg-white/90 shadow-xs" id="revisoresDailyTrendCard">
      {/* 1. Encabezado Minimalista con Contexto Geográfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black tracking-tight text-slate-900 uppercase">
              Evolución Diaria de Atenciones
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {scopeLabel}
            </span>
            {activeMeta && (
              <span className="text-[10px] font-medium text-slate-500">
                {activeMeta.regional} • {activeMeta.punto_atencion} • {activeMeta.tiempo_prom_min}m/exp
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Monitoreo diario segmentado por <strong>Regional</strong>, <strong>Punto de Atención</strong> y <strong>Revisor Nominal</strong>.
          </p>
        </div>

        {/* Acceso Rápido: Solo Días Hábiles y Reset */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setSoloHabiles(!soloHabiles)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              soloHabiles
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Ocultar sábados y domingos sin operación"
          >
            {soloHabiles ? '✓ Días Hábiles (L-V)' : 'Todos los Días'}
          </button>
          
          {(selectedRegional !== 'TODAS' || selectedPunto !== 'TODOS' || selectedRevisor !== 'CONSOLIDADO' || periodo !== 'TODOS') && (
            <button
              onClick={() => {
                setSelectedRegional('TODAS');
                setSelectedPunto('TODOS');
                setSelectedRevisor('CONSOLIDADO');
                setPeriodo('TODOS');
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer"
              title="Restablecer todos los filtros a nivel Nacional"
            >
              Restablecer
            </button>
          )}
        </div>
      </div>

      {/* 2. Barra de Filtros: Regional, Punto de Atención, Revisor, Período y Modos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-xs">
        
        {/* Filtro 1: Gerencia Regional */}
        <div className="space-y-0.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">1. Regional:</label>
          <select
            value={selectedRegional}
            onChange={(e) => handleRegionalChange(e.target.value)}
            className="w-full bg-white text-slate-800 font-semibold border border-slate-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="TODAS">🏛️ Todas las Regionales</option>
            <option value="CENTRAL">Central</option>
            <option value="OCCIDENTE">Occidente</option>
            <option value="SUR">Sur</option>
            <option value="NORORIENTE">Nororiente</option>
          </select>
        </div>

        {/* Filtro 2: Punto de Atención / Agencia */}
        <div className="space-y-0.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">2. Punto de Atención:</label>
          <select
            value={selectedPunto}
            onChange={(e) => handlePuntoChange(e.target.value)}
            className="w-full bg-white text-slate-800 font-semibold border border-slate-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="TODOS">📍 Todos los Puntos ({availablePuntos.length})</option>
            {availablePuntos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro 3: Revisor Nominal */}
        <div className="space-y-0.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">3. Revisor Auditor:</label>
          <select
            value={selectedRevisor}
            onChange={(e) => setSelectedRevisor(e.target.value)}
            className="w-full bg-white text-slate-900 font-bold border border-slate-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="CONSOLIDADO">
              👥 {selectedPunto !== 'TODOS' ? `Consolidado (${selectedPunto})` : selectedRegional !== 'TODAS' ? `Consolidado Regional (${selectedRegional})` : 'Consolidado General'}
            </option>
            <optgroup label={`Revisores Filtrados (${filteredRevisoresList.length})`}>
              {filteredRevisoresList.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} — {fmt(r.total)} exp ({r.punto})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Filtro 4: Período */}
        <div className="space-y-0.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">4. Período / Mes:</label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="w-full bg-white text-slate-700 font-medium border border-slate-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="TODOS">Todos los Meses</option>
            <option value="30D">Últimos 30 Días</option>
            <option value="2026-01">Enero 2026</option>
            <option value="2026-02">Febrero 2026</option>
            <option value="2026-03">Marzo 2026</option>
            <option value="2026-04">Abril 2026</option>
            <option value="2026-05">Mayo 2026</option>
            <option value="2026-06">Junio 2026</option>
            <option value="2026-07">Julio 2026</option>
          </select>
        </div>

        {/* Modos de Métrica y Jornada */}
        <div className="sm:col-span-2 space-y-0.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">5. Métrica / Jornada:</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex bg-white p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
              <button
                onClick={() => setMetricMode('dual')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  metricMode === 'dual' ? 'bg-slate-900 text-white font-bold' : 'text-slate-500'
                }`}
              >
                Dual
              </button>
              <button
                onClick={() => setMetricMode('volumen')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  metricMode === 'volumen' ? 'bg-slate-900 text-white font-bold' : 'text-slate-500'
                }`}
              >
                Volumen
              </button>
              <button
                onClick={() => setMetricMode('tasa')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  metricMode === 'tasa' ? 'bg-slate-900 text-white font-bold' : 'text-slate-500'
                }`}
              >
                % Rechazo
              </button>
              <button
                onClick={() => setMetricMode('tiempo')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  metricMode === 'tiempo' ? 'bg-slate-900 text-white font-bold' : 'text-slate-500'
                }`}
              >
                Tiempo
              </button>
            </div>

            <button
              onClick={() => setSoloHabiles(!soloHabiles)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                soloHabiles
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              {soloHabiles ? 'Días Hábiles' : 'Todos'}
            </button>

            {selectedRevisor !== 'CONSOLIDADO' && (
              <button
                onClick={() => setShowMetaLine(!showMetaLine)}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                  showMetaLine
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                Meta 100
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Indicadores Clave Dinámicos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Atendidas</span>
          <div className="text-base font-black text-slate-900 font-mono">{fmt(summary.total)}</div>
          <span className="text-[10px] text-slate-500">{summary.promDiario} exp/día</span>
        </div>

        <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            {selectedRevisor === 'CONSOLIDADO' ? 'Promedio / Auditor' : 'Cumplimiento Meta (100)'}
          </span>
          <div className="text-base font-black text-slate-900 font-mono">
            {selectedRevisor === 'CONSOLIDADO' ? `${summary.promDiario} exp` : `${summary.metaPct}%`}
          </div>
          <span className="text-[10px] text-slate-500">
            {selectedRevisor === 'CONSOLIDADO' ? 'Carga media diaria' : `${summary.diasCumplidos} días alcanzados`}
          </span>
        </div>

        <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Tasa Rechazo</span>
          <div className="text-base font-black text-rose-600 font-mono">{summary.tasaRechazo}%</div>
          <span className="text-[10px] text-slate-500">vs 40.9% media nal.</span>
        </div>

        <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Pico Máximo Diario</span>
          <div className="text-base font-black text-indigo-700 font-mono">{fmt(summary.mejorDia)}</div>
          <span className="text-[10px] text-slate-500">Máximo en una jornada</span>
        </div>
      </div>

      {/* 4. Gráfico Recharts Minimalista */}
      <div className="w-full h-[320px] pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="etiquetaCorta"
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              interval={Math.max(0, Math.floor(chartData.length / 15))}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              unit={metricMode === 'tasa' ? '%' : metricMode === 'tiempo' ? 'm' : ''}
              tickFormatter={(v) => (metricMode === 'dual' || metricMode === 'volumen' ? fmt(v) : v)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: '10px', paddingBottom: '6px' }}
            />

            {/* Meta Line (100 exp) */}
            {selectedRevisor !== 'CONSOLIDADO' && showMetaLine && metricMode !== 'tasa' && metricMode !== 'tiempo' && (
              <ReferenceLine
                y={100}
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: 'Meta 100',
                  position: 'insideTopLeft',
                  fill: '#059669',
                  fontSize: 9,
                  fontWeight: 600
                }}
              />
            )}

            {/* 40.9% rejection standard */}
            {metricMode === 'tasa' && (
              <ReferenceLine
                y={40.9}
                stroke="#f43f5e"
                strokeWidth={1}
                strokeDasharray="4 4"
                label={{
                  value: '40.9% Media Nal.',
                  position: 'insideTopRight',
                  fill: '#e11d48',
                  fontSize: 9
                }}
              />
            )}

            {metricMode === 'dual' && (
              <>
                <Line
                  type="monotone"
                  dataKey="atendidas"
                  name="Atendidas"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={{ r: 1, fill: '#4f46e5' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="aprobadas"
                  name="Aprobadas"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="rechazosContador"
                  name="Rechazos"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  dot={false}
                />
              </>
            )}

            {metricMode === 'volumen' && (
              <Line
                type="monotone"
                dataKey="atendidas"
                name="Expedientes Atendidos"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 1.5, fill: '#6366f1' }}
                activeDot={{ r: 5 }}
              />
            )}

            {metricMode === 'tasa' && (
              <>
                <Line
                  type="monotone"
                  dataKey="tasaRechazo"
                  name="% Rechazo"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="tasaAprobacion"
                  name="% Aprobación"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  dot={false}
                />
              </>
            )}

            {metricMode === 'tiempo' && (
              <Line
                type="monotone"
                dataKey="tiempoPromMin"
                name="Minutos/Expediente"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 5. Pie y Detalle de Bitácora */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500">
        <span>{chartData.length} jornadas evaluadas • {scopeLabel}</span>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          {showDetails ? 'Ocultar bitácora' : 'Ver bitácora de días'}
        </button>
      </div>

      {/* 6. Tabla de Bitácora */}
      {showDetails && (
        <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b border-slate-100 text-[10px]">
              <tr>
                <th className="py-1.5 px-2.5">Fecha</th>
                <th className="py-1.5 px-2">Día</th>
                <th className="py-1.5 px-2 text-right">Atendidas</th>
                <th className="py-1.5 px-2 text-right">Aprobadas</th>
                <th className="py-1.5 px-2 text-right">Rechazos</th>
                <th className="py-1.5 px-2 text-right">% Rechazo</th>
                <th className="py-1.5 px-2 text-center">Meta 100</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {chartData.map((row) => (
                <tr key={row.fecha} className="hover:bg-slate-50/50">
                  <td className="py-1 px-2.5 font-sans font-medium">{row.fecha}</td>
                  <td className="py-1 px-2 font-sans text-slate-400">{row.diaSemana}</td>
                  <td className="py-1 px-2 text-right font-bold text-slate-900">{fmt(row.atendidas)}</td>
                  <td className="py-1 px-2 text-right text-emerald-600">{fmt(row.aprobadas)}</td>
                  <td className="py-1 px-2 text-right text-rose-600">{fmt(row.rechazosContador)}</td>
                  <td className="py-1 px-2 text-right">{row.tasaRechazo}%</td>
                  <td className="py-1 px-2 text-center font-sans">
                    {row.atendidas >= 100 ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold">
                        ✓
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RevisoresDailyTrendChart;
