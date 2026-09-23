import { useEffect, useState } from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';

interface FilterState {
  region: string;
  gestion: string;
  mes: string;
  estado: string;
  macro: string;
}

declare global {
  interface Window {
    applyFilters?: () => void;
    resetFilters?: () => void;
  }
}

const SLICER_FIELDS = ['selRegion', 'selGestion', 'selMes', 'selEstado', 'selMacro'] as const;

function readFilterState(): FilterState {
  const get = (id: string, fallback: string) =>
    (document.getElementById(id) as HTMLSelectElement | null)?.value || fallback;
  return {
    region: get('selRegion', 'TODAS'),
    gestion: get('selGestion', 'TODAS'),
    mes: get('selMes', 'TODOS'),
    estado: get('selEstado', 'TODOS'),
    macro: get('selMacro', 'TODAS'),
  };
}

const INITIAL_FILTERS: FilterState = {
  region: 'TODAS',
  gestion: 'TODAS',
  mes: 'TODOS',
  estado: 'TODOS',
  macro: 'TODAS',
};

export default function FilterRibbon() {
  const [f, setF] = useState<FilterState>(() => (typeof document === 'undefined' ? INITIAL_FILTERS : readFilterState()));

  useEffect(() => {
    const sync = () => setF(readFilterState());
    window.addEventListener('filters:sync', sync);
    return () => window.removeEventListener('filters:sync', sync);
  }, []);

  const change = (key: keyof FilterState, value: string) => {
    setF(prev => ({ ...prev, [key]: value }));
    const id = `sel${key[0].toUpperCase()}${key.slice(1)}`;
    const el = document.getElementById(id) as HTMLSelectElement | null;
    if (el) el.value = value;
    if (typeof window.applyFilters === 'function') window.applyFilters();
    setTimeout(() => {
      if (typeof window.applyFilters === 'function') window.applyFilters();
    }, 20);
  };

  const reset = () => {
    setF(INITIAL_FILTERS);
    if (typeof window.resetFilters === 'function') window.resetFilters();
  };

  const slicerBtn =
    'flex-1 min-w-0 sm:min-w-[125px] flex items-center gap-1.5 bg-white/70 hover:bg-white/95 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 backdrop-blur-md border border-slate-200/80 hover:border-slate-300 rounded-xl px-2.5 sm:px-3 py-1.5 shadow-2xs transition-all';
  const labelCls = 'text-slate-400 font-medium text-[10px] sm:text-[11px] shrink-0';
  const selectCls =
    'w-full bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer text-xs truncate';

  return (
    <div className="glass-header px-3 sm:px-6 py-2 shrink-0 z-10 sticky top-0 transition-all">
      <div className="max-w-[1400px] mx-auto flex items-center gap-2 sm:gap-2.5 w-full overflow-x-auto no-scrollbar scroll-smooth py-0.5">

        <div className="flex sm:hidden items-center gap-1 shrink-0 px-2 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold shadow-xs">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
          <span>Filtros</span>
        </div>

        <div className={slicerBtn}>
          <span className={labelCls}>Región:</span>
          <select id="selRegion" value={f.region} onChange={e => change('region', e.target.value)} className={selectCls}>
            <option value="TODAS">Todas las Regiones</option>
            <option value="CENTRAL">Central</option>
            <option value="OCCIDENTE">Occidente</option>
            <option value="NORORIENTE">Nororiente</option>
            <option value="SUR">Sur</option>
          </select>
        </div>

        <div className={slicerBtn}>
          <span className={labelCls}>Trámite:</span>
          <select id="selGestion" value={f.gestion} onChange={e => change('gestion', e.target.value)} className={selectCls}>
            <option value="TODAS">Todos los Trámites</option>
            <option value="ACTIVACIÓN">Activación Agencia Virtual</option>
            <option value="CAMBIO DE CORREO ELECTRÓNICO">Cambio de Correo Electrónico</option>
          </select>
        </div>

        <div className={slicerBtn}>
          <span className={labelCls}>Mes:</span>
          <select id="selMes" value={f.mes} onChange={e => change('mes', e.target.value)} className={selectCls}>
            <option value="TODOS">Todos los Meses</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={String(m)}>
                {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][m - 1]}
              </option>
            ))}
          </select>
        </div>

        <div className={slicerBtn}>
          <span className={labelCls}>Estado:</span>
          <select id="selEstado" value={f.estado} onChange={e => change('estado', e.target.value)} className={selectCls}>
            <option value="TODOS">Todos los Estados</option>
            <option value="APROBADA">Aprobadas</option>
            <option value="RECHAZADA CON REQUERIMIENTO">Rechazadas</option>
            <option value="CANCELADA">Canceladas</option>
            <option value="EN PROCESO">En Proceso</option>
          </select>
        </div>

        <div className="flex-1 min-w-[160px] sm:min-w-[155px] flex items-center gap-1.5 bg-white/70 hover:bg-white/95 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 backdrop-blur-md border border-slate-200/80 hover:border-slate-300 rounded-xl px-2.5 sm:px-3 py-1.5 shadow-2xs transition-all">
          <span className={labelCls}>Causal:</span>
          <select id="selMacro" value={f.macro} onChange={e => change('macro', e.target.value)} className={selectCls}>
            <option value="TODAS">Todas las Causas</option>
            <option value="DOCUMENTACION_DPI">Documentación / DPI</option>
            <option value="VIDEO_CONFIRMACION">Video Confirmación</option>
            <option value="SISTEMA_REGLAS_DURAS">Sistema / Reglas Duras</option>
            <option value="DATOS_INCONSISTENTES">Datos Inconsistentes</option>
            <option value="REPRESENTACION_LEGAL">Representación Legal</option>
            <option value="SIN_MOTIVO">Sin Motivo (SUB-00)</option>
          </select>
        </div>

        <div className="shrink-0">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-white/80 hover:bg-white active:scale-95 backdrop-blur-md border border-slate-200/90 rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-2xs"
            title="Restablecer todos los filtros (Alt+R)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Restablecer</span>
          </button>
        </div>

      </div>
    </div>
  );
}