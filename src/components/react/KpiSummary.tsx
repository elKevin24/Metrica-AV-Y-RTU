import React, { useState, useEffect } from 'react';

interface KpiData {
  totalCasos: number;
  totalAtendidas?: number;
  totalAprobados: number;
  totalRechazos: number;
  totalOtrosEstados?: number;
  totalCanceladas?: number;
  totalNoConf?: number;
  totalAprobSubsanadas?: number;
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
        totalAtendidas: r.totalAtendidas ?? Math.max(0, r.totalCasos - (r.totalNoConf || 0)),
        totalAprobados: r.totalAprobados,
        totalRechazos: r.totalRechazos,
        totalOtrosEstados: r.totalOtrosEstados ?? Math.max(0, r.totalCasos - r.totalAprobados),
        totalCanceladas: r.totalCanceladas ?? 0,
        totalNoConf: r.totalNoConf ?? 0,
        totalAprobSubsanadas: r.totalAprobSubsanadas ?? 0,
      };
    } catch { return null; }
  }
  return null;
}

export default function KpiSummary() {
  const [kpi, setKpi] = useState<KpiData | null>(null);

  useEffect(() => {
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
      <div suppressHydrationWarning className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} suppressHydrationWarning className="bg-white p-4 sm:p-4.5 rounded-2xl shadow-sm border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cargando...</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">—</h3>
          </div>
        ))}
      </div>
    );
  }

  const totalAtendidas = kpi.totalAtendidas ?? Math.max(0, kpi.totalCasos - 32362);
  const totalOtros = kpi.totalOtrosEstados ?? Math.max(0, kpi.totalCasos - kpi.totalAprobados);

  const pctAtendidas = kpi.totalCasos > 0 ? ((totalAtendidas / kpi.totalCasos) * 100).toFixed(1) : '0.0';
  const tasaAprAtendidas = totalAtendidas > 0 ? ((kpi.totalAprobados / totalAtendidas) * 100).toFixed(1) : '0.0';
  const tasaAprTotal = kpi.totalCasos > 0 ? ((kpi.totalAprobados / kpi.totalCasos) * 100).toFixed(1) : '0.0';
  const tasaRechAtendidas = totalAtendidas > 0 ? ((kpi.totalRechazos / totalAtendidas) * 100).toFixed(1) : '0.0';
  const pctOtros = kpi.totalCasos > 0 ? ((totalOtros / kpi.totalCasos) * 100).toFixed(1) : '0.0';

  return (
    <div suppressHydrationWarning className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {/* 1. Total de Gestiones (Año) */}
      <div suppressHydrationWarning className="bg-white p-4 sm:p-4.5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">1. Total Gestiones Año</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">{kpi.totalCasos.toLocaleString()}</h3>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100">
          <span className="text-xs text-blue-600 font-bold inline-block">100% ingresadas</span>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Demanda global en portal</p>
        </div>
      </div>

      {/* 2. Gestiones Atendidas por Revisor */}
      <div suppressHydrationWarning className="bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 p-4 sm:p-4.5 rounded-2xl shadow-sm border border-blue-200/80 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">2. Gestiones Atendidas</span>
          <h3 className="text-2xl font-black text-blue-700 mt-1 font-mono">{totalAtendidas.toLocaleString()}</h3>
        </div>
        <div className="mt-2 pt-2 border-t border-blue-100/60">
          <span className="text-xs text-blue-800 font-bold inline-block">{pctAtendidas}% pasaron a cola</span>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">32,362 no confirmaron correo</p>
        </div>
      </div>

      {/* 3. Aprobadas con Éxito */}
      <div suppressHydrationWarning className="bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 p-4 sm:p-4.5 rounded-2xl shadow-sm border border-emerald-200/80 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">3. Aprobadas con Éxito</span>
          <h3 className="text-2xl font-black text-emerald-700 mt-1 font-mono">{kpi.totalAprobados.toLocaleString()}</h3>
        </div>
        <div className="mt-2 pt-2 border-t border-emerald-100/60">
          <span className="text-xs text-emerald-800 font-bold inline-block">{tasaAprAtendidas}% en atendidas</span>
          <p className="text-[10px] text-emerald-600 font-mono mt-0.5">{tasaAprTotal}% del universo anual</p>
        </div>
      </div>

      {/* 4. Rechazos Emitidos (Elegante, sin sobrecargar de rojo) */}
      <div suppressHydrationWarning className="bg-white p-4 sm:p-4.5 rounded-2xl shadow-sm border border-slate-200 hover:border-rose-200 flex flex-col justify-between transition-colors">
        <div>
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">4. Rechazos Emitidos</span>
          <h3 className="text-2xl font-black text-rose-600 mt-1 font-mono">{kpi.totalRechazos.toLocaleString()}</h3>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100">
          <span className="text-xs text-rose-700 font-semibold inline-block bg-rose-50 px-2 py-0.5 rounded border border-rose-100">{tasaRechAtendidas}% de incidencia</span>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Gestiones con ≥1 rechazo</p>
        </div>
      </div>

      {/* 5. Otros Estados (Canceladas, No Confirmadas, En Proceso) */}
      <div suppressHydrationWarning className="bg-white p-4 sm:p-4.5 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block truncate">5. Otros Estados</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 uppercase tracking-wider shrink-0">No Aprobadas</span>
          </div>
          <h3 className="text-2xl font-black text-slate-700 mt-1 font-mono">{totalOtros.toLocaleString()}</h3>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-700 font-semibold inline-block bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{pctOtros}% del universo</span>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Canceladas, no conf. o proceso</p>
        </div>
      </div>
    </div>
  );
}
