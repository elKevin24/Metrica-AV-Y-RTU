import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Sliders, 
  ShieldCheck, 
  Building2, 
  Zap, 
  Info,
  ArrowRight,
  Calculator,
  ChevronRight,
  Moon,
  Sun,
  Calendar,
  Flame,
  Search,
  Layers,
  BarChart3,
  Filter
} from 'lucide-react';
import horasExtraData from '../data/horas_extra_revisores.json';

interface RegionalData {
  region: string;
  nombre: string;
  demandaSemestral: number;
  demandaDiariaProm: number;
  demandaDiariaPico: number;
  revisoresPlanta: number;
  revisoresApoyo: number;
  revisoresTotal: number;
  atendidasSemestral: number;
  tiempoPromMin: number;
  color: string;
  bgBadge: string;
  borderBadge: string;
}

const REGIONES_DATA: RegionalData[] = [
  {
    region: 'CENTRAL',
    nombre: 'Regional Central',
    demandaSemestral: 73327,
    demandaDiariaProm: 505.7,
    demandaDiariaPico: 733.3,
    revisoresPlanta: 34,
    revisoresApoyo: 25,
    revisoresTotal: 59,
    atendidasSemestral: 48427,
    tiempoPromMin: 1.8,
    color: 'text-blue-700',
    bgBadge: 'bg-blue-50 text-blue-700',
    borderBadge: 'border-blue-200'
  },
  {
    region: 'OCCIDENTE',
    nombre: 'Regional Occidente',
    demandaSemestral: 38754,
    demandaDiariaProm: 267.3,
    demandaDiariaPico: 387.5,
    revisoresPlanta: 24,
    revisoresApoyo: 21,
    revisoresTotal: 45,
    atendidasSemestral: 31276,
    tiempoPromMin: 2.1,
    color: 'text-emerald-700',
    bgBadge: 'bg-emerald-50 text-emerald-700',
    borderBadge: 'border-emerald-200'
  },
  {
    region: 'SUR',
    nombre: 'Regional Sur',
    demandaSemestral: 35403,
    demandaDiariaProm: 244.2,
    demandaDiariaPico: 354.0,
    revisoresPlanta: 19,
    revisoresApoyo: 13,
    revisoresTotal: 32,
    atendidasSemestral: 28084,
    tiempoPromMin: 1.9,
    color: 'text-purple-700',
    bgBadge: 'bg-purple-50 text-purple-700',
    borderBadge: 'border-purple-200'
  },
  {
    region: 'NORORIENTE',
    nombre: 'Regional Nororiente',
    demandaSemestral: 34928,
    demandaDiariaProm: 240.9,
    demandaDiariaPico: 349.3,
    revisoresPlanta: 11,
    revisoresApoyo: 14,
    revisoresTotal: 25,
    atendidasSemestral: 27841,
    tiempoPromMin: 2.0,
    color: 'text-amber-700',
    bgBadge: 'bg-amber-50 text-amber-700',
    borderBadge: 'border-amber-200'
  }
];

export default function DimensionamientoRegional() {
  // Pestaña activa principal del componente
  const [subTab, setSubTab] = useState<'dimensionamiento' | 'horasExtra'>('dimensionamiento');

  // Parámetros interactivos de simulación (Tab 1)
  const [productividadObjetivo, setProductividadObjetivo] = useState<number>(80);
  const [modoDemanda, setModoDemanda] = useState<'promedio' | 'pico'>('pico');
  const [reduccionRetrabajo, setReduccionRetrabajo] = useState<number>(0);

  // Filtros de Horas Extra (Tab 2)
  const [regionFilter, setRegionFilter] = useState<string>('TODAS');
  const [searchRevisor, setSearchRevisor] = useState<string>('');

  // Cálculos dinámicos de simulación de capacidad
  const simulacion = useMemo(() => {
    const factorDemanda = modoDemanda === 'pico' ? 1.45 : 1.0;
    const factorRetrabajo = 1 - (reduccionRetrabajo / 100);

    const porRegion = REGIONES_DATA.map(r => {
      const demandaEfectiva = r.demandaDiariaProm * factorDemanda * factorRetrabajo;
      const revisoresRequeridosExacto = demandaEfectiva / productividadObjetivo;
      const revisoresRequeridos = Math.ceil(revisoresRequeridosExacto);
      const capacidadPlantaActual = r.revisoresPlanta * productividadObjetivo;
      const holguraPlanta = r.revisoresPlanta / (revisoresRequeridos || 1);
      const balanceRevisores = r.revisoresPlanta - revisoresRequeridos;

      return {
        ...r,
        demandaEfectiva,
        revisoresRequeridosExacto,
        revisoresRequeridos,
        capacidadPlantaActual,
        holguraPlanta,
        balanceRevisores
      };
    });

    const totalDemandaSemestral = porRegion.reduce((s, r) => s + r.demandaSemestral, 0);
    const totalDemandaEfectiva = porRegion.reduce((s, r) => s + r.demandaEfectiva, 0);
    const totalRevisoresPlanta = porRegion.reduce((s, r) => s + r.revisoresPlanta, 0);
    const totalRevisoresTotal = porRegion.reduce((s, r) => s + r.revisoresTotal, 0);
    const totalRevisoresRequeridos = porRegion.reduce((s, r) => s + r.revisoresRequeridos, 0);
    const totalCapacidadPlanta = totalRevisoresPlanta * productividadObjetivo;
    const holguraNacional = totalRevisoresPlanta / (totalRevisoresRequeridos || 1);

    return {
      porRegion,
      totalDemandaSemestral,
      totalDemandaEfectiva,
      totalRevisoresPlanta,
      totalRevisoresTotal,
      totalRevisoresRequeridos,
      totalCapacidadPlanta,
      holguraNacional
    };
  }, [productividadObjetivo, modoDemanda, reduccionRetrabajo]);

  // Filtrado de revisores de sobretiempo
  const revisoresFiltrados = useMemo(() => {
    return (horasExtraData.topRevisores || []).filter(rev => {
      const matchRegion = regionFilter === 'TODAS' || rev.regional === regionFilter;
      const matchSearch = searchRevisor.trim() === '' || rev.revisor.toLowerCase().includes(searchRevisor.toLowerCase());
      return matchRegion && matchSearch;
    });
  }, [regionFilter, searchRevisor]);

  // Datos regionales filtrados
  const regionalSeleccionada = useMemo(() => {
    if (regionFilter === 'TODAS') return null;
    return (horasExtraData.regionales || []).find(r => r.region === regionFilter);
  }, [regionFilter]);

  return (
    <div id="dimensionamiento-regional-section" className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-6">
      
      {/* NAVEGACIÓN SUPERIOR DE SUB-MÓDULOS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200/70">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Auditoría Operativa de Revisores & Dimensionamiento
            </h3>
            <p className="text-xs text-slate-500">
              Análisis comparativo de dotación nominal, productividad y sobreesfuerzo en horas extra hombre.
            </p>
          </div>
        </div>

        {/* Botones de alternancia de vista */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('horasExtra')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'horasExtra'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-amber-500" />
            <span>Horas Extra Hombre ({horasExtraData.resumen.horasExtraHombreSpan.toLocaleString()}h)</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('dimensionamiento')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'dimensionamiento'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-blue-600" />
            <span>Simulador de Dotación (SLA ≤ 8h)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: AUDITORÍA FORENSE DE HORAS EXTRA HOMBRE (NUEVO MÓDULO)           */}
      {/* ========================================================================= */}
      {subTab === 'horasExtra' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* BANNER RESUMEN EJECUTIVO DE HORAS EXTRA */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-indigo-900/40 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                    <Flame className="w-3 h-3 text-amber-400" />
                    Diagnóstico de Sobreesfuerzo Operativo
                  </span>
                  <span className="text-slate-400 text-xs">•</span>
                  <span className="text-xs text-indigo-200 font-medium">
                    Base: 135,628 expedientes auditados
                  </span>
                </div>
                <h4 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  2,782.1 Horas Extra Hombre Incurridas por el Equipo Revisor
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Para mantener las colas bajo control y evitar el quiebre masivo del SLA de 8 horas hábiles, el personal revisor debió trabajar turnos extraordinarios en fines de semana (<strong>2,347.7 horas-hombre</strong>) y jornadas extendidas en días hábiles (<strong>434.4 horas-hombre</strong>), dictaminando <strong>36,439 trámites</strong> fuera de horario.
                </p>
              </div>

              {/* Botón rápido de conmutación de filtro regional */}
              <div className="flex flex-wrap items-center gap-1.5 bg-white/10 p-1.5 rounded-xl border border-white/10 backdrop-blur-md self-start lg:self-auto">
                {['TODAS', 'CENTRAL', 'OCCIDENTE', 'SUR', 'NORORIENTE'].map(reg => (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => setRegionFilter(reg)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      regionFilter === reg
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {reg === 'TODAS' ? 'Nacional' : reg}
                  </button>
                ))}
              </div>
            </div>

            {/* 4 KPIs Clave de Sobreesfuerzo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Horas Extra (Span)</span>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-1">
                  {regionalSeleccionada ? regionalSeleccionada.horasSpanExtra.toLocaleString() : horasExtraData.resumen.horasExtraHombreSpan.toLocaleString()}h
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {regionalSeleccionada ? `En ${regionalSeleccionada.nombre}` : 'Span guardias y sobretiempo'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Horas Activas Netas</span>
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono mt-1">
                  {regionalSeleccionada ? regionalSeleccionada.horasActivasExtra.toLocaleString() : horasExtraData.resumen.horasExtraHombreActivas.toLocaleString()}h
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Conexión continua dictaminando
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Trámites Extraordinarios</span>
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-rose-300 font-mono mt-1">
                  {regionalSeleccionada ? regionalSeleccionada.totalExtra.toLocaleString() : horasExtraData.resumen.totalTramitesExtraordinarios.toLocaleString()}
                </div>
                <span className="text-[10px] text-rose-300/80 block mt-0.5">
                  {regionalSeleccionada ? `${regionalSeleccionada.pctExtra}% de su volumen` : `${horasExtraData.resumen.pctTramitesExtraordinarios}% del total nacional`}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Fines de Semana</span>
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-indigo-200 font-mono mt-1">
                  {regionalSeleccionada ? regionalSeleccionada.finSemana.toLocaleString() : horasExtraData.resumen.tramitesFinSemana.toLocaleString()}
                </div>
                <span className="text-[10px] text-indigo-300/80 block mt-0.5">
                  {regionalSeleccionada ? `${((regionalSeleccionada.finSemana / regionalSeleccionada.total) * 100).toFixed(1)}% en Sáb/Dom` : `${horasExtraData.resumen.pctFinSemana}% (17.0k Sáb + 7.3k Dom)`}
                </span>
              </div>
            </div>
          </div>

          {/* DESGLOSE POR REGIONAL: TARJETAS COMPARATIVAS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Distribución Regional del Sobreesfuerzo & Horas Extra
              </h4>
              <span className="text-[11px] text-slate-500">
                Haz clic en una región para filtrar la vista
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(horasExtraData.regionales || []).map(r => {
                const isSelected = regionFilter === r.region;
                return (
                  <div
                    key={r.region}
                    onClick={() => setRegionFilter(regionFilter === r.region ? 'TODAS' : r.region)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-400 shadow-sm ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{r.nombre}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.pctExtra > 30 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.pctExtra}% Extra
                      </span>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-500">Horas Extra Span:</span>
                        <span className="text-sm font-black font-mono text-indigo-900">{r.horasSpanExtra}h</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-500">Horas Activas:</span>
                        <span className="text-sm font-bold font-mono text-emerald-700">{r.horasActivasExtra}h</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-500">Trámites Extra:</span>
                        <span className="text-xs font-bold font-mono text-slate-800">
                          {r.totalExtra.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">({r.finSemana.toLocaleString()} Sáb/Dom)</span>
                        </span>
                      </div>
                    </div>

                    {/* Barra de proporción */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
                      <div 
                        className={`h-full rounded-full ${r.pctExtra > 30 ? 'bg-rose-500' : 'bg-amber-500'}`}
                        style={{ width: `${r.pctExtra}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DOS GRÁFICOS ANALÍTICOS: EVOLUCIÓN MENSUAL & DÍAS DE LA SEMANA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Gráfico 1: Evolución Mensual de Horas Extra (Enero pico vs desahogo) */}
            <div className="lg:col-span-7 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Evolución Mensual del Sobreesfuerzo (Horas Extra & % Trámites)
                  </span>
                </div>
                <span className="text-[10px] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                  Pico en Enero: 1,495.5 Horas (41.2%)
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {(horasExtraData.mensual || []).map(m => {
                  const maxHoras = 1500;
                  const pctWidth = Math.min(100, (m.horasSpanExtra / maxHoras) * 100);
                  return (
                    <div key={m.mes} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{m.nombre}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-indigo-900 font-bold">{m.horasSpanExtra}h extra</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600 font-medium">{m.totalExtra.toLocaleString()} casos ({m.pctExtra}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200/80 h-3 rounded-md overflow-hidden flex">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-indigo-600 h-full rounded-md transition-all flex items-center justify-end pr-1"
                          style={{ width: `${Math.max(4, pctWidth)}%` }}
                        >
                          {pctWidth > 20 && (
                            <span className="text-[9px] text-white font-bold font-mono">
                              {m.horasSpanExtra}h
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                <strong>Análisis de Carga Temporal:</strong> Durante la avalancha inicial de enero, se consumió el <strong>53.8% de todas las horas extra del año</strong> (1,495.5 horas de span), donde 4 de cada 10 expedientes debieron revisarse en fin de semana o sobretiempo nocturno.
              </p>
            </div>

            {/* Gráfico 2: Distribución por Día de la Semana (Operativos de Fin de Semana) */}
            <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Distribución por Día de la Semana
                  </span>
                </div>
                <span className="text-[10px] text-purple-700 font-bold bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                  Fin de Semana: 18.0%
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {(horasExtraData.diasSemana || []).map(d => {
                  const maxDay = 25000;
                  const pctWidth = Math.min(100, (d.casos / maxDay) * 100);
                  return (
                    <div key={d.dia} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold flex items-center gap-1.5 ${
                          d.esFinSemana ? 'text-amber-800 font-bold' : 'text-slate-700'
                        }`}>
                          {d.esFinSemana && <Flame className="w-3 h-3 text-amber-500" />}
                          {d.dia}
                        </span>
                        <span className="font-mono text-xs text-slate-700 font-bold">
                          {d.casos.toLocaleString()} <span className="text-[10px] text-slate-400">({d.pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/80 h-2.5 rounded-md overflow-hidden">
                        <div 
                          className={`h-full rounded-md transition-all ${
                            d.esFinSemana ? 'bg-amber-500' : 'bg-slate-700'
                          }`}
                          style={{ width: `${pctWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-snug">
                <strong>Operativo de Choque en Fin de Semana:</strong> Los <strong>sábados (17,036)</strong> y <strong>domingos (7,315)</strong> superaron a varios días hábiles regulares debido a las jornadas especiales asignadas para vaciar la plataforma virtual.
              </div>
            </div>

          </div>

          {/* CURVA HORARIA DE 24 HORAS (JORNADA ORDINARIA VS NOCTURNA) */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Curva Horaria de Atención (00:00 a 23:00) — Jornada Ordinaria vs Guardias
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
                  Ordinario (08:00 - 16:00): 73.1%
                </span>
                <span className="flex items-center gap-1 font-semibold text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
                  Fuera de Horario / Noches: 26.9%
                </span>
              </div>
            </div>

            {/* Histograma de 24 columnas */}
            <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 items-end h-28 pt-2">
              {(horasExtraData.distribucionHoraria || []).map(h => {
                const maxHour = 20000;
                const heightPct = Math.max(3, (h.casos / maxHour) * 100);
                return (
                  <div key={h.hora} className="flex flex-col items-center justify-end h-full group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                      <div className="bg-slate-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap shadow-md font-mono">
                        {h.horaLabel}: {h.casos.toLocaleString()} ({h.pct}%)
                      </div>
                    </div>
                    
                    <div 
                      className={`w-full rounded-t-xs transition-all ${
                        h.esJornadaOrdinaria 
                          ? 'bg-emerald-500 hover:bg-emerald-600' 
                          : 'bg-amber-500 hover:bg-amber-600'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[8px] text-slate-400 mt-1 font-mono">
                      {h.hora % 3 === 0 ? `${h.hora}h` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TABLA DE TOP REVISORES CON MAYOR CARGA EXTRAORDINARIA */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Top Revisores con Mayor Número de Horas Extra & Fin de Semana
                </h4>
                <p className="text-xs text-slate-500">
                  Mostrando los analistas con mayor sobrecarga horaria fuera de la jornada regular.
                </p>
              </div>

              {/* Barra de búsqueda de revisor */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por código (ej. CACHANGC)..."
                  value={searchRevisor}
                  onChange={(e) => setSearchRevisor(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/90 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Revisor</th>
                    <th className="py-2.5 px-3">Regional</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3 text-right">Total Casos</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/60 text-amber-900 border-x border-amber-100">
                      Casos Horario Extra
                    </th>
                    <th className="py-2.5 px-3 text-center">Fines Semana</th>
                    <th className="py-2.5 px-3 text-center">Noches / Madrugadas</th>
                    <th className="py-2.5 px-3 text-center">Días Sáb/Dom</th>
                    <th className="py-2.5 px-3 text-right font-bold text-indigo-950">Horas Extra (Span)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {revisoresFiltrados.slice(0, 15).map(rev => (
                    <tr key={rev.revisor} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {rev.revisor}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {rev.regional}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          rev.tipo === 'PLANTA' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {rev.tipo}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {rev.totalCasos.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-amber-800 bg-amber-50/40 border-x border-amber-100">
                        {rev.casosExtra.toLocaleString()} <span className="text-[10px] font-normal text-amber-600">({rev.pctExtra}%)</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                        {rev.casosFinSemana.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                        {rev.casosNoche.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-700">
                        {rev.diasFinSemana} días
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-900 text-sm">
                        {rev.horasSpanExtra}h
                      </td>
                    </tr>
                  ))}
                  {revisoresFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400 text-xs">
                        No se encontraron revisores con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CAUSALIDAD FORENSE & CONCLUSIONES ESTRATÉGICAS */}
          <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200/90 flex flex-col sm:flex-row items-start gap-3.5">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
              <Zap className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 text-xs">
              <h5 className="font-bold text-indigo-950 text-sm">
                Dictamen Forense: ¿Por qué se necesitaron 2,782 horas extra si la dotación de planta era suficiente?
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="bg-white/80 p-3 rounded-lg border border-indigo-100 space-y-1">
                  <span className="font-bold text-indigo-900 block">1. Asimetría de Asignación Territorial</span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Occidente y Central sufrieron saturación mientras otras agencias tenían baja carga. Al no existir un enrutador dinámico inter-regional, los revisores locales se vieron forzados a abrir guardias de fin de semana para no dejar colapsar el SLA.
                  </p>
                </div>
                <div className="bg-white/80 p-3 rounded-lg border border-indigo-100 space-y-1">
                  <span className="font-bold text-indigo-900 block">2. Retrabajo por 51,027 Rechazos</span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    23,823 trámites reingresaron a revisión. Este retrabajo consumió aproximadamente <strong>1,500 horas-hombre adicionales</strong>, duplicando la carga en expedientes con errores menores de DPI o correo.
                  </p>
                </div>
                <div className="bg-white/80 p-3 rounded-lg border border-indigo-100 space-y-1">
                  <span className="font-bold text-indigo-900 block">3. Concentración del Sobreesfuerzo en Planta</span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    El <strong>97.6% del sobretiempo</strong> fue cubierto por los mismos 88 revisores de planta, demostrando un alto compromiso pero con riesgo evidente de fatiga cognitiva y desgaste operativo.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: SIMULADOR DE DIMENSIONAMIENTO REGIONAL (SLA ≤ 8H)               */}
      {/* ========================================================================= */}
      {subTab === 'dimensionamiento' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* ENCABEZADO Y CONTEXTO DEL SIMULADOR */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                Dimensionamiento de Revisores por Regional (SLA &le; 8 Horas Hábiles)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Cálculo matemático de dotación analítica necesaria por región para absorber el 100% de la demanda en jornada regular sin recurrir a horas extra.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                Requiere: {simulacion.totalRevisoresRequeridos} analistas de {simulacion.totalRevisoresPlanta} titulares
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Superávit Planta: {simulacion.holguraNacional.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* BARRA DE CONTROL / SIMULADOR INTERACTIVO */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                Parámetros del Modelo de Capacidad
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Jornada ordinaria de 8h laborales netas por analista
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {/* Parámetro 1: Productividad Diaria Objetivo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex justify-between">
                  <span>Ritmo por Revisor:</span>
                  <span className="font-mono font-bold text-blue-700">{productividadObjetivo} exp/día ({Math.round(480 / productividadObjetivo)}m/exp)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {[60, 80, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setProductividadObjetivo(val)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        productividadObjetivo === val 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val} {val === 80 ? '⭐ Estándar' : val === 60 ? 'Holgado' : 'Intensivo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parámetro 2: Régimen de Demanda */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex justify-between">
                  <span>Escenario de Carga:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {modoDemanda === 'pico' ? 'Demanda Pico (+45%)' : 'Demanda Promedio'}
                  </span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setModoDemanda('promedio')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      modoDemanda === 'promedio'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Promedio Regular
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoDemanda('pico')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      modoDemanda === 'pico'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Pico Máximo 🔥
                  </button>
                </div>
              </div>

              {/* Parámetro 3: Reducción de Retrabajos por Rechazos */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex justify-between">
                  <span>Efecto Cero Retrabajo:</span>
                  <span className="font-mono font-bold text-emerald-700">-{reduccionRetrabajo}% de rechazos</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {[0, 25, 50].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setReduccionRetrabajo(pct)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        reduccionRetrabajo === pct 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pct === 0 ? 'Actual' : `-${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TARJETAS REGIONALES DE DIMENSIONAMIENTO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {simulacion.porRegion.map(reg => {
              const holgura = reg.holguraPlanta.toFixed(1);
              return (
                <div 
                  key={reg.region}
                  className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${reg.bgBadge} ${reg.borderBadge}`}>
                        {reg.region}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {Math.round(reg.demandaEfectiva)} exp/día
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 mt-2">{reg.nombre}</h4>
                    <p className="text-[11px] text-slate-500">
                      {reg.demandaSemestral.toLocaleString()} exp totales ({((reg.demandaSemestral / simulacion.totalDemandaSemestral) * 100).toFixed(1)}% país)
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-200/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Revisores Requeridos:</span>
                      <span className="font-mono font-black text-blue-700 text-sm">
                        {reg.revisoresRequeridos} <span className="text-[10px] font-normal text-slate-500">analistas</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Planta Titular Asignada:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {reg.revisoresPlanta} <span className="text-[10px] font-normal text-slate-500">(+{reg.revisoresApoyo} apoyo)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (reg.revisoresRequeridos / reg.revisoresPlanta) * 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Carga por titular:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {Math.round(reg.demandaEfectiva / reg.revisoresPlanta)} exp/día (holgura {holgura}x)
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Superávit +{reg.balanceRevisores} analistas
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      SLA &le; 8h garantizado
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TABLA COMPARATIVA CONSOLIDADA */}
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Regional</th>
                  <th className="py-2.5 px-3 text-right">Demanda Diaria</th>
                  <th className="py-2.5 px-3 text-center bg-blue-50/50 text-blue-900 border-x border-blue-100">
                    Revisores Necesarios (SLA 8h)
                  </th>
                  <th className="py-2.5 px-3 text-center">Planta Titular</th>
                  <th className="py-2.5 px-3 text-center">Personal Apoyo</th>
                  <th className="py-2.5 px-3 text-center">Total Activo</th>
                  <th className="py-2.5 px-3 text-right">Capacidad de Planta</th>
                  <th className="py-2.5 px-3 text-center bg-emerald-50/50 text-emerald-900 border-l border-emerald-100">
                    Holgura / Cobertura
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {simulacion.porRegion.map(r => (
                  <tr key={r.region} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${r.region === 'CENTRAL' ? 'bg-blue-500' : r.region === 'OCCIDENTE' ? 'bg-emerald-500' : r.region === 'SUR' ? 'bg-purple-500' : 'bg-amber-500'}`} />
                      {r.nombre}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {Math.round(r.demandaEfectiva).toLocaleString()} <span className="text-[10px] text-slate-400">exp/d</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-blue-700 bg-blue-50/30 border-x border-blue-100 text-sm">
                      {r.revisoresRequeridos} <span className="text-[10px] font-normal text-slate-500">analistas</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                      {r.revisoresPlanta}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                      {r.revisoresApoyo}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                      {r.revisoresTotal}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900">
                      {r.capacidadPlantaActual.toLocaleString()} <span className="text-[10px] text-slate-400">exp/d</span>
                    </td>
                    <td className="py-2.5 px-3 text-center bg-emerald-50/30 border-l border-emerald-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100/80 text-emerald-800">
                        {r.holguraPlanta.toFixed(1)}x cobertura
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                <tr>
                  <td className="py-3 px-3">TOTAL PAÍS</td>
                  <td className="py-3 px-3 text-right font-mono">
                    {Math.round(simulacion.totalDemandaEfectiva).toLocaleString()} exp/d
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-blue-800 bg-blue-100/60 border-x border-blue-200 text-sm">
                    {simulacion.totalRevisoresRequeridos} analistas
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-900">
                    {simulacion.totalRevisoresPlanta}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">
                    {simulacion.totalRevisoresTotal - simulacion.totalRevisoresPlanta}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-900">
                    {simulacion.totalRevisoresTotal}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-indigo-900">
                    {simulacion.totalCapacidadPlanta.toLocaleString()} exp/d
                  </td>
                  <td className="py-3 px-3 text-center bg-emerald-100/70 border-l border-emerald-200">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900">
                      {simulacion.holguraNacional.toFixed(1)}x cobertura nacional
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* DICTAMEN ESTRATÉGICO */}
          <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/90 flex flex-col sm:flex-row items-start gap-3.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 mt-0.5">
              <Zap className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs">
              <h5 className="font-bold text-blue-950 text-sm">
                Conclusión Forense: No existe déficit de personal humano en ninguna regional
              </h5>
              <p className="text-blue-900/90 leading-relaxed">
                Para satisfacer holgadamente la meta de <strong>SLA &le; 8 horas hábiles</strong> en los picos de mayor demanda de todo el semestre, la institución necesita únicamente <strong>{simulacion.totalRevisoresRequeridos} analistas dedicados en tiempo continuo</strong> ({simulacion.porRegion.map(r => `${r.region}: ${r.revisoresRequeridos}`).join(', ')}). 
                La institución dispone actualmente de <strong>88 analistas titulares de planta</strong> ({simulacion.holguraNacional.toFixed(1)}x lo necesario).
              </p>
              <div className="pt-2 flex flex-wrap gap-3 font-medium text-[11px] text-blue-800">
                <span>• El uso de 2,782 horas extra fue originado por acumulación en colas regionales rígidas, no por falta de personal.</span>
                <span>• Si se enrutan los expedientes dinámicamente entre regiones, se elimina la necesidad de horas extra.</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
