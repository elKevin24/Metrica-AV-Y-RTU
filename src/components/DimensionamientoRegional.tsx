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
  ChevronRight
} from 'lucide-react';

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
  // Parámetros interactivos de simulación
  const [productividadObjetivo, setProductividadObjetivo] = useState<number>(80); // 80 expedientes/día (estándar de planta)
  const [modoDemanda, setModoDemanda] = useState<'promedio' | 'pico'>('pico'); // 'promedio' o 'pico' (+45%)
  const [reduccionRetrabajo, setReduccionRetrabajo] = useState<number>(0); // % de reducción de retrabajo (0%, 25%, 50%)

  // Cálculos dinámicos
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

  return (
    <div id="dimensionamiento-regional-section" className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-6">
      
      {/* 1. ENCABEZADO Y CONTEXTO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200/60">
              <Calculator className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Dimensionamiento de Revisores por Regional (SLA &le; 8 Horas Hábiles)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cálculo matemático de dotación analítica necesaria por región para absorber el 100% de la demanda en tiempo real.
          </p>
        </div>

        {/* Badges de Diagnóstico Global */}
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

      {/* 2. BARRA DE CONTROL / SIMULADOR INTERACTIVO */}
      <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            Parámetros del Modelo de Capacidad
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Jornada de 8h laborales netas por analista
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

      {/* 3. TARJETAS REGIONALES DE DIMENSIONAMIENTO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {simulacion.porRegion.map(reg => {
          const holgura = reg.holguraPlanta.toFixed(1);
          return (
            <div 
              key={reg.region}
              className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
            >
              {/* Header Regional */}
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

              {/* Comparativa: Requeridos vs Actuales */}
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

              {/* Dictamen Regional */}
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

      {/* 4. TABLA COMPARATIVA CONSOLIDADA DE DIMENSIONAMIENTO */}
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

      {/* 5. HALLAZGO Y DICTAMEN ESTRATÉGICO */}
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
            <span>• Causa raíz de la cola: Desconexión intermitente y resolución por lotes esporádicos.</span>
            <span>• 25.9% del tiempo se desperdicia en 47,426 re-evaluaciones por rechazos subsanables.</span>
            <span>• Solución: Enrutamiento continuo automatizado en servidor y auto-corrección de DPI/RTU.</span>
          </div>
        </div>
      </div>

    </div>
  );
}
