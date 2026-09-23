import React, { useState } from 'react';
import forensicMonthly from '../data/mensual_atenciones_forensic.json';
import {
  Layers,
  Building2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sun,
  Moon,
  Timer,
  Zap,
  Users,
  Inbox,
  ArrowRight,
  TrendingDown,
  UserCheck,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Eye,
  FileCheck
} from 'lucide-react';

interface MonthlyAtencionData {
  mesKey: string;
  mesNombre: string;
  diasHabiles: number;
  gestionesNuevas: number;
  reingresos: number;
  demandaAtenciones: number;
  atencionesRealizadas: number;
  atencionesPrimera: number;
  atencionesReingreso: number;
  aprobadas: number;
  rechazos: number;
  tasaRechazo: number;
  plantaTeorica: number;
  capacidadPlanta: number;
  revNecesariosAtenciones: number;
  revNecesariosGestiones: number;
  balanceVsPlanta: number;
}

interface RegionalMetrics {
  id: string;
  nombre: string;
  // Carga Operativa Global
  ingresadasSolicitudes: number;
  ingresadasExpedientes: number;
  gestionesAtendidas: number;
  atencionesTotales: number;
  ratioAtencionPorGestion: number;
  // Plantilla de Gestores
  gestoresObservadosPlanta: number;
  gestoresObservadosApoyo: number;
  gestoresObservadosTotal: number;
  gestoresTeoricos17: number;
  gestoresRequeridosSla8h: string;
  // Evolución Mensual basada en ATENCIONES (toques reales)
  mensualAtenciones: MonthlyAtencionData[];
  // Atención por Atención (Pantalla)
  atnSegMedia: number;
  atnSegMediana: number;
  atnMinMedia: number;
  atnMinMediana: number;
  atnMenos2MinPct: number;
  // Atención por Gestión (Ciclo Total)
  cicloHabilMedia: number;
  cicloHabilMediana: number;
  cicloCalMedia: number;
  cicloCalMediana: number;
  diasCalMedia: number;
  // Gestiones Dentro vs Fuera (8 a 4)
  totalAtendidas: number;
  atnDentro8a4: number;
  atnDentro8a4Pct: number;
  atnFuera8a4: number;
  atnFuera8a4Pct: number;
  atnNochesLV: number;
  atnFinde: number;
  // Creación Contribuyente
  creaDentro8a4Pct: number;
  creaFuera8a4Pct: number;
  // Ciclos por Desenlace (Horas Hábiles)
  ftrHabil: number;
  ftrCal: number;
  subsanadaHabil: number;
  subsanadaCal: number;
  canceladaHabil: number;
  canceladaCal: number;
  penalizacionHabil: number;
}

const REGIONES_DATA: Record<string, RegionalMetrics> = {
  CENTRAL: {
    id: 'CENTRAL',
    nombre: 'Central',
    ingresadasSolicitudes: 73327,
    ingresadasExpedientes: 48427,
    gestionesAtendidas: 48427,
    atencionesTotales: 64892,
    ratioAtencionPorGestion: 1.34,
    gestoresObservadosPlanta: 34,
    gestoresObservadosApoyo: 25,
    gestoresObservadosTotal: 59,
    gestoresTeoricos17: 6.1,
    gestoresRequeridosSla8h: '6 - 9',
    mensualAtenciones: (forensicMonthly as any)['CENTRAL'],
    atnSegMedia: 288.2,
    atnSegMediana: 71.0,
    atnMinMedia: 4.80,
    atnMinMediana: 1.18,
    atnMenos2MinPct: 77.2,
    cicloHabilMedia: 25.55,
    cicloHabilMediana: 14.80,
    cicloCalMedia: 110.15,
    cicloCalMediana: 73.40,
    diasCalMedia: 4.6,
    totalAtendidas: 48427,
    atnDentro8a4: 36604,
    atnDentro8a4Pct: 75.6,
    atnFuera8a4: 11823,
    atnFuera8a4Pct: 24.4,
    atnNochesLV: 3912,
    atnFinde: 7911,
    creaDentro8a4Pct: 55.4,
    creaFuera8a4Pct: 44.6,
    ftrHabil: 11.2,
    ftrCal: 48.5,
    subsanadaHabil: 26.4,
    subsanadaCal: 118.2,
    canceladaHabil: 58.1,
    canceladaCal: 245.0,
    penalizacionHabil: 15.2
  },
  OCCIDENTE: {
    id: 'OCCIDENTE',
    nombre: 'Occidente',
    ingresadasSolicitudes: 38754,
    ingresadasExpedientes: 31276,
    gestionesAtendidas: 31276,
    atencionesTotales: 38782,
    ratioAtencionPorGestion: 1.24,
    gestoresObservadosPlanta: 24,
    gestoresObservadosApoyo: 21,
    gestoresObservadosTotal: 45,
    gestoresTeoricos17: 3.9,
    gestoresRequeridosSla8h: '3 - 5',
    mensualAtenciones: (forensicMonthly as any)['OCCIDENTE'],
    atnSegMedia: 149.4,
    atnSegMediana: 74.0,
    atnMinMedia: 2.49,
    atnMinMediana: 1.23,
    atnMenos2MinPct: 78.9,
    cicloHabilMedia: 15.21,
    cicloHabilMediana: 8.70,
    cicloCalMedia: 66.02,
    cicloCalMediana: 41.70,
    diasCalMedia: 2.8,
    totalAtendidas: 31276,
    atnDentro8a4: 21323,
    atnDentro8a4Pct: 68.2,
    atnFuera8a4: 9953,
    atnFuera8a4Pct: 31.8,
    atnNochesLV: 3410,
    atnFinde: 6543,
    creaDentro8a4Pct: 57.1,
    creaFuera8a4Pct: 42.9,
    ftrHabil: 7.2,
    ftrCal: 32.1,
    subsanadaHabil: 16.1,
    subsanadaCal: 72.4,
    canceladaHabil: 44.2,
    canceladaCal: 191.0,
    penalizacionHabil: 8.9
  },
  NORORIENTE: {
    id: 'NORORIENTE',
    nombre: 'Nororiente',
    ingresadasSolicitudes: 34928,
    ingresadasExpedientes: 27841,
    gestionesAtendidas: 27841,
    atencionesTotales: 33688,
    ratioAtencionPorGestion: 1.21,
    gestoresObservadosPlanta: 11,
    gestoresObservadosApoyo: 14,
    gestoresObservadosTotal: 25,
    gestoresTeoricos17: 3.5,
    gestoresRequeridosSla8h: '3 - 4',
    mensualAtenciones: (forensicMonthly as any)['NORORIENTE'],
    atnSegMedia: 135.7,
    atnSegMediana: 55.0,
    atnMinMedia: 2.26,
    atnMinMediana: 0.92,
    atnMenos2MinPct: 83.1,
    cicloHabilMedia: 14.34,
    cicloHabilMediana: 8.50,
    cicloCalMedia: 62.08,
    cicloCalMediana: 37.80,
    diasCalMedia: 2.6,
    totalAtendidas: 27841,
    atnDentro8a4: 20760,
    atnDentro8a4Pct: 74.6,
    atnFuera8a4: 7081,
    atnFuera8a4Pct: 25.4,
    atnNochesLV: 2315,
    atnFinde: 4766,
    creaDentro8a4Pct: 56.8,
    creaFuera8a4Pct: 43.2,
    ftrHabil: 7.8,
    ftrCal: 34.2,
    subsanadaHabil: 15.4,
    subsanadaCal: 69.1,
    canceladaHabil: 42.0,
    canceladaCal: 184.2,
    penalizacionHabil: 7.6
  },
  SUR: {
    id: 'SUR',
    nombre: 'Sur',
    ingresadasSolicitudes: 35403,
    ingresadasExpedientes: 28084,
    gestionesAtendidas: 28084,
    atencionesTotales: 34262,
    ratioAtencionPorGestion: 1.22,
    gestoresObservadosPlanta: 19,
    gestoresObservadosApoyo: 13,
    gestoresObservadosTotal: 32,
    gestoresTeoricos17: 3.5,
    gestoresRequeridosSla8h: '3 - 4',
    mensualAtenciones: (forensicMonthly as any)['SUR'],
    atnSegMedia: 166.1,
    atnSegMediana: 71.0,
    atnMinMedia: 2.77,
    atnMinMediana: 1.18,
    atnMenos2MinPct: 79.4,
    cicloHabilMedia: 13.84,
    cicloHabilMediana: 8.00,
    cicloCalMedia: 60.80,
    cicloCalMediana: 29.30,
    diasCalMedia: 2.5,
    totalAtendidas: 28084,
    atnDentro8a4: 20502,
    atnDentro8a4Pct: 73.0,
    atnFuera8a4: 7582,
    atnFuera8a4Pct: 27.0,
    atnNochesLV: 2451,
    atnFinde: 5131,
    creaDentro8a4Pct: 56.5,
    creaFuera8a4Pct: 43.5,
    ftrHabil: 6.9,
    ftrCal: 30.5,
    subsanadaHabil: 14.8,
    subsanadaCal: 66.8,
    canceladaHabil: 41.5,
    canceladaCal: 180.1,
    penalizacionHabil: 7.9
  },
  PAIS: {
    id: 'PAIS',
    nombre: 'Total País',
    ingresadasSolicitudes: 182412,
    ingresadasExpedientes: 135628,
    gestionesAtendidas: 135628,
    atencionesTotales: 159451,
    ratioAtencionPorGestion: 1.18,
    gestoresObservadosPlanta: 88,
    gestoresObservadosApoyo: 73,
    gestoresObservadosTotal: 161,
    gestoresTeoricos17: 17.0,
    gestoresRequeridosSla8h: '16 - 22',
    mensualAtenciones: (forensicMonthly as any)['PAIS'],
    atnSegMedia: 199.6,
    atnSegMediana: 69.0,
    atnMinMedia: 3.33,
    atnMinMediana: 1.15,
    atnMenos2MinPct: 78.9,
    cicloHabilMedia: 18.44,
    cicloHabilMediana: 10.00,
    cicloCalMedia: 79.88,
    cicloCalMediana: 43.90,
    diasCalMedia: 3.3,
    totalAtendidas: 135628,
    atnDentro8a4: 99189,
    atnDentro8a4Pct: 73.1,
    atnFuera8a4: 36439,
    atnFuera8a4Pct: 26.9,
    atnNochesLV: 12088,
    atnFinde: 24351,
    creaDentro8a4Pct: 56.3,
    creaFuera8a4Pct: 43.7,
    ftrHabil: 8.45,
    ftrCal: 37.27,
    subsanadaHabil: 18.99,
    subsanadaCal: 84.43,
    canceladaHabil: 48.86,
    canceladaCal: 207.75,
    penalizacionHabil: 10.54
  }
};

export default function CiclosAtencionView() {
  const [selectedReg, setSelectedReg] = useState<string>('PAIS');
  const [tipoHoras, setTipoHoras] = useState<'habiles' | 'calendario'>('habiles');
  const [perspectiva, setPerspectiva] = useState<'atenciones' | 'gestiones'>('atenciones');

  const reg = REGIONES_DATA[selectedReg];

  // Totales acumulados
  const totNuevas = reg.mensualAtenciones.reduce((acc, m) => acc + m.gestionesNuevas, 0);
  const totReingresos = reg.mensualAtenciones.reduce((acc, m) => acc + m.reingresos, 0);
  const totDemandaAtn = reg.mensualAtenciones.reduce((acc, m) => acc + m.demandaAtenciones, 0);
  const totAtnRealizadas = reg.mensualAtenciones.reduce((acc, m) => acc + m.atencionesRealizadas, 0);
  const totAtnPrimera = reg.mensualAtenciones.reduce((acc, m) => acc + m.atencionesPrimera, 0);
  const totAtnReingreso = reg.mensualAtenciones.reduce((acc, m) => acc + m.atencionesReingreso, 0);
  const totAprobadas = reg.mensualAtenciones.reduce((acc, m) => acc + m.aprobadas, 0);
  const totRechazos = reg.mensualAtenciones.reduce((acc, m) => acc + m.rechazos, 0);
  const avgRevNecAtn = (reg.mensualAtenciones.reduce((acc, m) => acc + m.revNecesariosAtenciones, 0) / reg.mensualAtenciones.length).toFixed(1);
  const avgRevNecGest = (reg.mensualAtenciones.reduce((acc, m) => acc + m.revNecesariosGestiones, 0) / reg.mensualAtenciones.length).toFixed(1);

  return (
    <div className="space-y-6">
      
      {/* 1. CABECERA & CONTROLES */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">
                <Layers className="w-4 h-4" />
              </span>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Auditoría Forense: Atenciones Reales vs Gestiones y Capacidad de Revisores
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Desglose mensual de <b>Atenciones (toques en pantalla con retrabajo)</b> vs <b>Gestiones (expedientes)</b> y dimensionamiento real frente a los <b>17 analistas de planta</b>.
            </p>
          </div>

          {/* Segmented Control: Horas Hábiles vs Calendario */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <span className="text-[11px] text-slate-400 font-medium">Unidad de Ciclo:</span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200/70">
              <button
                type="button"
                onClick={() => setTipoHoras('habiles')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  tipoHoras === 'habiles'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Horas Hábiles
              </button>
              <button
                type="button"
                onClick={() => setTipoHoras('calendario')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  tipoHoras === 'calendario'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Horas Calendario
              </button>
            </div>
          </div>
        </div>

        {/* SELECTOR REGIONAL */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3.5">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mr-2">
            Regional:
          </span>
          {Object.values(REGIONES_DATA).map((r) => {
            const isSelected = selectedReg === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedReg(r.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {r.nombre}
                <span className="ml-1.5 opacity-60 font-mono text-[10px]">
                  {r.atencionesTotales.toLocaleString()} atn
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. ALERTA FORENSE CRÍTICA: DISTINCIÓN GESTIÓN VS ATENCIÓN */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-950 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Hallazgo Forense Clave: ¿Por qué la data parece mentir si solo se cuentan Gestiones?</span>
        </div>
        <p className="leading-relaxed text-amber-900/90">
          Una <strong>Gestión</strong> es el expediente o trámite legal único del ciudadano ({totNuevas.toLocaleString()} en el periodo). Pero la <strong>Atención</strong> es cada acto u operación en pantalla que ejecuta un revisor ({totAtnRealizadas.toLocaleString()} atenciones realizadas). Debido a la <strong>alta tasa de rechazo ({((totRechazos / totAtnRealizadas) * 100).toFixed(1)}%)</strong>, hubo <strong>{totReingresos.toLocaleString()} reingresos</strong> que obligaron a los revisores a dictaminar expedientes 2 o más veces. 
        </p>
        <p className="font-medium text-amber-950">
          👉 El dimensionamiento humano real debe calcularse sobre <strong>ATENCIONES (toques en pantalla)</strong>, no sobre gestiones finales. Medir solo gestiones oculta un <strong>{((totAtnReingreso / totAtnRealizadas) * 100).toFixed(1)}% de sobrecarga operativa por retrabajo</strong>.
        </p>
      </div>

      {/* 3. MÓDULO MENSUAL COMPLETO: ATENCIONES VS GESTIONES */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              Evolución Mensual: Demanda, Atenciones y Revisores Necesarios ({reg.nombre})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Contraste mes a mes del esfuerzo real en pantalla (toques) vs la capacidad teórica de los <strong>{reg.gestoresTeoricos17} revisores de planta</strong>.
            </p>
          </div>

          {/* Switch de Perspectiva */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] text-slate-400 font-medium">Criterio de Cálculo:</span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200/70">
              <button
                type="button"
                onClick={() => setPerspectiva('atenciones')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  perspectiva === 'atenciones'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Atenciones (Toques Reales)
              </button>
              <button
                type="button"
                onClick={() => setPerspectiva('gestiones')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  perspectiva === 'gestiones'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Solo Gestiones Nuevas
              </button>
            </div>
          </div>
        </div>

        {/* 4 CARDS RESUMEN DE LA CARGA REAL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50 space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">Demanda Total de Atenciones</span>
            <div className="text-xl font-bold font-mono text-slate-900">
              {totDemandaAtn.toLocaleString()} <span className="text-xs font-normal text-slate-500">toques exigidos</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              {totNuevas.toLocaleString()} nuevas + {totReingresos.toLocaleString()} reingresos
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">Atenciones Realizadas</span>
            <div className="text-xl font-bold font-mono text-slate-900">
              {totAtnRealizadas.toLocaleString()} <span className="text-xs font-normal text-slate-500">toques en pantalla</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              {totAtnPrimera.toLocaleString()} 1ra vez + {totAtnReingreso.toLocaleString()} retrabajo
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">Rechazos / Retrabajo Generado</span>
            <div className="text-xl font-bold font-mono text-rose-700">
              {totRechazos.toLocaleString()} <span className="text-xs font-normal text-slate-500">({((totRechazos / totAtnRealizadas) * 100).toFixed(1)}%)</span>
            </div>
            <p className="text-[10px] text-slate-500">
              {totAprobadas.toLocaleString()} aprobaciones directas o finales
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-900/20 bg-slate-900 text-white space-y-1">
            <span className="text-[11px] text-slate-300 font-medium block">Revisores Necesarios en Pico (Ene)</span>
            <div className="text-xl font-bold font-mono text-white">
              {perspectiva === 'atenciones' ? reg.mensualAtenciones[0]?.revNecesariosAtenciones : reg.mensualAtenciones[0]?.revNecesariosGestiones} <span className="text-xs font-normal text-slate-300">analistas</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Frente a los {reg.gestoresTeoricos17} de planta ({reg.mensualAtenciones[0]?.balanceVsPlanta} de déficit)
            </p>
          </div>
        </div>

        {/* TABLA MENSUAL DETALLADA */}
        <div className="overflow-x-auto rounded-lg border border-slate-200/70">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/70">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Mes</th>
                <th className="py-2.5 px-3 text-center font-semibold">Días Háb.</th>
                <th className="py-2.5 px-3 text-right font-semibold">Gestiones Nuevas</th>
                <th className="py-2.5 px-3 text-right font-semibold text-amber-800">Reingresos (Retrabajo)</th>
                <th className="py-2.5 px-3 text-right font-semibold bg-slate-100/70 text-slate-900">
                  Demanda Atenciones
                </th>
                <th className="py-2.5 px-3 text-right font-semibold">Atenciones Realizadas</th>
                <th className="py-2.5 px-3 text-center font-semibold">Tasa Rechazo</th>
                <th className="py-2.5 px-3 text-center font-semibold bg-blue-50 text-blue-950">
                  {perspectiva === 'atenciones' ? 'Rev. Nec. (Atenciones)' : 'Rev. Nec. (Gestiones)'}
                </th>
                <th className="py-2.5 px-3 text-center font-semibold">Capacidad Planta ({reg.gestoresTeoricos17})</th>
                <th className="py-2.5 px-3 text-center font-semibold">Balance vs Planta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reg.mensualAtenciones.map((m) => {
                const revNec = perspectiva === 'atenciones' ? m.revNecesariosAtenciones : m.revNecesariosGestiones;
                const balance = Number((m.plantaTeorica - revNec).toFixed(1));
                const esDeficit = balance < 0;

                return (
                  <tr key={m.mesKey} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {m.mesNombre}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {m.diasHabiles}d
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {m.gestionesNuevas.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-amber-800">
                      +{m.reingresos.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 bg-slate-100/40">
                      {m.demandaAtenciones.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {m.atencionesRealizadas.toLocaleString()} <span className="text-[10px] text-slate-400">({m.atencionesPrimera.toLocaleString()} 1ra)</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {m.tasaRechazo}%
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold bg-blue-50/40 text-blue-950">
                      {revNec} analistas
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {m.capacidadPlanta.toLocaleString()} toques
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold">
                      {esDeficit ? (
                        <span className="text-rose-700">
                          {balance} (Déficit)
                        </span>
                      ) : (
                        <span className="text-emerald-700">
                          +{balance} (Superávit)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold border-t border-slate-200 text-slate-900 text-xs">
              <tr>
                <td className="py-2.5 px-3 font-bold">Total Periodo</td>
                <td className="py-2.5 px-3 text-center font-mono">136d</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold">{totNuevas.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">+{totReingresos.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold bg-slate-200/50">{totDemandaAtn.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold">{totAtnRealizadas.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-center font-mono font-bold">{((totRechazos / totAtnRealizadas) * 100).toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-950">
                  {perspectiva === 'atenciones' ? avgRevNecAtn : avgRevNecGest} prom / mes
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                  {(reg.gestoresTeoricos17 * 136 * 80).toLocaleString()} toques
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-emerald-700 font-bold">
                  Cubierto
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* DICTAMEN DE AUDITORÍA: POR QUÉ LAS ATENCIONES REVELAN LA VERDAD */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/70 text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
            <UserCheck className="w-4 h-4 text-emerald-700" />
            Dictamen Forense sobre la Carga de Atenciones vs los 17 de Planta:
          </div>
          <p className="leading-relaxed">
            <strong>1. En el primer trimestre (Enero a Marzo) el retrabajo ahogó la planta:</strong> Debido a una tasa de rechazo superior al 40%, cada mes se generaron entre 12,000 y 13,000 atenciones repetidas por reingreso. En enero se demandaron <strong>73,022 atenciones</strong> (requiriendo <strong>43.5 revisores dedicados</strong>, un déficit de 26.5 frente a los 17 de planta).
          </p>
          <p className="leading-relaxed">
            <strong>2. Si se eliminara el retrabajo (aprobación a la primera):</strong> La demanda de enero hubiera sido de solo 60,426 toques (necesitando 36 revisores en lugar de 44). El retrabajo consumió por sí solo el tiempo de <strong>8 analistas a tiempo completo</strong> solo en enero.
          </p>
          <p className="leading-relaxed">
            <strong>3. En régimen normal (Mayo en adelante) los 17 de planta son más que suficientes:</strong> Incluso con retrabajo, en mayo solo se necesitaron 12.9 revisores (+4.1 libres de planta), en junio 6.6 revisores (+10.4 libres) y en julio 5.5 revisores (+11.5 libres).
          </p>
        </div>
      </div>

      {/* 4. KPIS RECTORES DE TIEMPOS EN PANTALLA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1 */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-slate-500">Atención en Pantalla</span>
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {reg.atnMinMediana}
            </span>
            <span className="text-xs text-slate-500 font-medium">min mediana</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Media: {reg.atnMinMedia} min ({Math.round(reg.atnSegMedia)}s)</span>
            <span className="font-medium text-slate-700">{reg.atnMenos2MinPct}% &le; 2m</span>
          </p>
        </div>

        {/* KPI 2 */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-slate-500">Ciclo por Gestión</span>
            <Timer className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {tipoHoras === 'habiles' ? `${reg.cicloHabilMedia.toFixed(1)}h` : `${reg.diasCalMedia}d`}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {tipoHoras === 'habiles' ? 'media hábil' : 'días naturales'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Mediana: {tipoHoras === 'habiles' ? `${reg.cicloHabilMediana}h` : `${reg.cicloCalMediana}h`}</span>
            <span className="font-mono text-slate-600">
              {tipoHoras === 'habiles' ? `${reg.cicloCalMedia.toFixed(0)}h cal` : `${reg.cicloHabilMedia.toFixed(0)}h hábiles`}
            </span>
          </p>
        </div>

        {/* KPI 3 */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-slate-500">En Horario (08:00 a 16:00)</span>
            <Sun className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {reg.atnDentro8a4Pct}%
            </span>
            <span className="text-xs text-slate-500 font-medium">de resoluciones</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Lunes a Viernes</span>
            <span className="font-mono text-slate-700">{reg.atnDentro8a4.toLocaleString()} exp</span>
          </p>
        </div>

        {/* KPI 4 */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-slate-500">Fuera de Horario</span>
            <Moon className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {reg.atnFuera8a4Pct}%
            </span>
            <span className="text-xs text-slate-500 font-medium">sobretiempo</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Fines de semana: {reg.atnFinde.toLocaleString()}</span>
            <span className="font-mono text-slate-700">{reg.atnFuera8a4.toLocaleString()} exp</span>
          </p>
        </div>

      </div>

      {/* 5. MATRIZ INTEGRAL DE DISTRIBUCIÓN HORARIA */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Distribución de Resoluciones en Horario Hábil (08:00 a 16:00) por Regional
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Contraste entre el horario de dictamen de los analistas y el horario continuo de ingreso ciudadano.
            </p>
          </div>
          <span className="text-[11px] text-slate-500 font-mono self-start sm:self-auto">
            135,628 expedientes auditados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {(['CENTRAL', 'NORORIENTE', 'OCCIDENTE', 'SUR'] as const).map((rk) => {
            const d = REGIONES_DATA[rk];
            const isSelected = selectedReg === rk;
            return (
              <div
                key={rk}
                onClick={() => setSelectedReg(rk)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-50 border-slate-400/80 shadow-2xs ring-1 ring-slate-400/30'
                    : 'bg-white border-slate-200/70 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-900">{d.nombre}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {d.totalAtendidas.toLocaleString()}
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex my-2">
                  <div 
                    className="bg-slate-800 h-full transition-all"
                    style={{ width: `${d.atnDentro8a4Pct}%` }}
                    title={`En jornada: ${d.atnDentro8a4Pct}%`}
                  />
                  <div 
                    className="bg-slate-300 h-full transition-all"
                    style={{ width: `${d.atnFuera8a4Pct}%` }}
                    title={`Fuera: ${d.atnFuera8a4Pct}%`}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-600 font-mono">
                  <span>{d.atnDentro8a4Pct}% en jornada</span>
                  <span className="text-slate-400">{d.atnFuera8a4Pct}% fuera</span>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>En jornada (L-V):</span>
                    <span className="font-mono text-slate-700">{d.atnDentro8a4.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fin de semana:</span>
                    <span className="font-mono text-slate-700">{d.atnFinde.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-0.5 border-t border-slate-100">
                    <span>Demanda fuera de hora:</span>
                    <span className="font-mono text-slate-700">{d.creaFuera8a4Pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. CICLOS END-TO-END SEGÚN DESENLACE */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Ciclo de Vida por Gestión (End-to-End) según Desenlace
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Efecto del retrabajo en {reg.nombre}: tiempo de resolución según si requirió subsanación o se aprobó al primer intento.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Regional: <strong className="text-slate-900">{reg.nombre}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          
          {/* Card 1: FTR */}
          <div className="p-4 rounded-xl border border-slate-200/70 bg-white space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">Aprobada a la Primera</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500">Resolución directa sin observaciones previas.</p>
            <div className="pt-2 border-t border-slate-100">
              <div className="text-xl font-bold font-mono text-slate-900">
                {tipoHoras === 'habiles' ? `${reg.ftrHabil}h` : `${reg.ftrCal}h`}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {tipoHoras === 'habiles' ? `~${(reg.ftrCal / 24).toFixed(1)} días calendario` : `${reg.ftrHabil}h hábiles`}
              </div>
            </div>
          </div>

          {/* Card 2: Subsanada */}
          <div className="p-4 rounded-xl border border-slate-200/70 bg-white space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">Con Subsanación</span>
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500">Rechazo previo + corrección + segunda revisión.</p>
            <div className="pt-2 border-t border-slate-100">
              <div className="text-xl font-bold font-mono text-slate-900">
                {tipoHoras === 'habiles' ? `${reg.subsanadaHabil}h` : `${reg.subsanadaCal}h`}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Penalización por retrabajo: +{reg.penalizacionHabil.toFixed(1)}h hábiles
              </div>
            </div>
          </div>

          {/* Card 3: Cancelada */}
          <div className="p-4 rounded-xl border border-slate-200/70 bg-white space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">Cancelada / Inconclusa</span>
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500">Vencimiento, anomalía formal o desistimiento.</p>
            <div className="pt-2 border-t border-slate-100">
              <div className="text-xl font-bold font-mono text-slate-900">
                {tipoHoras === 'habiles' ? `${reg.canceladaHabil}h` : `${reg.canceladaCal}h`}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                ~{(reg.canceladaCal / 24).toFixed(1)} días calendario en buzón
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
