import React, { useState, useEffect } from 'react';

interface KpiData {
  totalCasos: number;
  totalAprobados: number;
  totalRechazos: number;
}

function getInitialKpi(): KpiData | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  if (w.__lastKpi) return w.__lastKpi;
  if (w.DATA?.loaded && typeof w.processOlapFilters === 'function') {
    try {
      const r = w.processOlapFilters(w.DATA.cubo, 'HUMANAS', 'TODOS', 'TODOS', 'TODOS', 'TODAS', 'TODOS', 'TODAS');
      return {
        totalCasos: r.totalCasos,
        totalAprobados: r.totalAprobados,
        totalRechazos: r.totalRechazos,
      };
    } catch { return null; }
  }
  return null;
}

export default function KpiSummary() {
  const [kpi, setKpi] = useState<KpiData | null>(null);

  useEffect(() => {
    // Cargar KPI inicial en cliente
    const initData = getInitialKpi();
    if (initData) setKpi(initData);

    const handler = (e: CustomEvent<KpiData>) => setKpi(e.detail);
    document.addEventListener('olap:kpi', handler as EventListener);
    
    const poll = setInterval(() => {
      const data = getInitialKpi();
      if (data) { setKpi(data); clearInterval(poll); }
    }, 100);

    return () => {
      clearInterval(poll);
      document.removeEventListener('olap:kpi', handler as EventListener);
    };
  }, []);

  if (!kpi) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-4 sm:p-4.5 rounded-2xl shadow-sm border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cargando...</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">—</h3>
          </div>
        ))}
      </div>
    );
  }

  const tasaApr = kpi.totalCasos > 0 ? ((kpi.totalAprobados / kpi.totalCasos) * 100).toFixed(1) : '0.0';
  const tasaRech = kpi.totalCasos > 0 ? ((kpi.totalRechazos / kpi.totalCasos) * 100).toFixed(1) : '0.0';
  const totalEnProceso = Math.max(0, kpi.totalCasos - kpi.totalAprobados - kpi.totalRechazos);
  const tasaProc = kpi.totalCasos > 0 ? ((totalEnProceso / kpi.totalCasos) * 100).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="bg-white p-4 sm:p-4.5 rounded-2xl shadow-sm border border-slate-200">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">1. Universo Gestionado</span>
        <h3 className="text-2xl font-black text-slate-900 mt-1">{kpi.totalCasos.toLocaleString()}</h3>
        <span className="text-xs text-blue-600 font-semibold mt-1 inline-block">100% de expedientes</span>
      </div>
      <div className="bg-white p-4 sm:p-4.5 rounded-2xl shadow-sm border border-slate-200">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">2. Aprobadas con Éxito</span>
        <h3 className="text-2xl font-black text-emerald-600 mt-1">{kpi.totalAprobados.toLocaleString()}</h3>
        <span className="text-xs text-emerald-600 font-bold mt-1 inline-block">{tasaApr}% del universo</span>
      </div>
      <div className="bg-white p-4 sm:p-4.5 rounded-2xl shadow-sm border border-slate-200">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">3. Rechazos Emitidos</span>
        <h3 className="text-2xl font-black text-rose-600 mt-1">{kpi.totalRechazos.toLocaleString()}</h3>
        <span className="text-xs text-rose-600 font-bold mt-1 inline-block">{tasaRech}% del universo</span>
      </div>
      <div className="bg-white p-4 sm:p-4.5 rounded-2xl shadow-sm border border-slate-200">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">4. En Proceso / Otras</span>
        <h3 className="text-2xl font-black text-slate-700 mt-1">{totalEnProceso.toLocaleString()}</h3>
        <span className="text-xs text-slate-500 font-semibold mt-1 inline-block">{tasaProc}% del universo</span>
      </div>
    </div>
  );
}
