import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';

interface RegionalMetrics {
  id: string;
  nombre: string;
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

  const reg = REGIONES_DATA[selectedReg];

  return (
    <div className="space-y-6">
      
      {/* 1. CABECERA MINIMALISTA & SELECTORES */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">
                <Layers className="w-4 h-4" />
              </span>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Ciclos y Tiempos de Atención por Regional
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Medición de la atención activa en pantalla, ciclo end-to-end de la gestión y distribución en horario hábil institucional (08:00 a 16:00).
            </p>
          </div>

          {/* Segmented Control Minimalista para Horas Hábiles vs Calendario */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <span className="text-[11px] text-slate-400 font-medium">Unidad:</span>
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

        {/* SELECTOR REGIONAL DISCRETO */}
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
                  {r.totalAtendidas.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. KPIS RECTORES (ESTILO MINIMALISTA) */}
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

      {/* 3. COMPARACIÓN REGIONAL: DENTRO VS FUERA DE JORNADA */}
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

                {/* Barra minimalista de dos tonos sobrios */}
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

        {/* Resumen explicativo conciso sin adornos */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <span className="font-medium text-slate-900 block mb-0.5">Ventana de Dictamen Institucional</span>
            El 73.1% de los trámites se dictamina entre las 08:00 y las 16:00. El 26.9% restante se resuelve en sobretiempo de tarde/noche (8.9%) o fines de semana (18.0%).
          </div>
          <div>
            <span className="font-medium text-slate-900 block mb-0.5">Descalce con la Demanda Ciudadana</span>
            El 43.7% de los trámites ingresa en horarios inhábiles (noches y fines de semana), generando que cada jornada inicie con cola acumulada.
          </div>
        </div>
      </div>

      {/* 4. CICLOS END-TO-END SEGÚN DESENLACE */}
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

      {/* 5. MATRIZ COMPARATIVA REGIONAL COMPLETA */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="border-b border-slate-100 pb-2.5">
          <h3 className="text-sm font-semibold text-slate-900">
            Matriz Comparativa de Tiempos y Ciclos por Regional
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Visión horizontal del desempeño en pantalla, duración del ciclo de vida y régimen horario.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200/70">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/70">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Regional</th>
                <th className="py-2.5 px-3 text-center font-semibold">Atención en Pantalla</th>
                <th className="py-2.5 px-3 text-center font-semibold">Ciclo Hábil (Media / Mediana)</th>
                <th className="py-2.5 px-3 text-center font-semibold">Ciclo Calendario</th>
                <th className="py-2.5 px-3 text-center font-semibold">En Jornada (08:00 a 16:00)</th>
                <th className="py-2.5 px-3 text-center font-semibold">Fuera de Jornada</th>
                <th className="py-2.5 px-3 text-right font-semibold">Total Gestiones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(['CENTRAL', 'OCCIDENTE', 'NORORIENTE', 'SUR'] as const).map((rk) => {
                const row = REGIONES_DATA[rk];
                const isSelected = selectedReg === rk;
                return (
                  <tr 
                    key={rk}
                    onClick={() => setSelectedReg(rk)}
                    className={`transition-colors cursor-pointer ${isSelected ? 'bg-slate-50 font-medium' : 'hover:bg-slate-50/50'}`}
                  >
                    <td className="py-2.5 px-3 text-slate-900 font-medium">
                      {row.nombre}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                      {row.atnMinMediana} min <span className="text-slate-400 text-[10px]">({Math.round(row.atnSegMedia)}s avg)</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-900">
                      {row.cicloHabilMedia.toFixed(1)}h <span className="text-slate-400 text-[10px]">({row.cicloHabilMediana}h med)</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {row.cicloCalMedia.toFixed(1)}h <span className="text-slate-400 text-[10px]">(~{row.diasCalMedia}d)</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-900">
                      {row.atnDentro8a4.toLocaleString()} <span className="text-slate-500 text-[10px]">({row.atnDentro8a4Pct}%)</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {row.atnFuera8a4.toLocaleString()} <span className="text-slate-400 text-[10px]">({row.atnFuera8a4Pct}%)</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                      {row.totalAtendidas.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold border-t border-slate-200 text-slate-900 text-xs">
              <tr>
                <td className="py-2.5 px-3">Total País</td>
                <td className="py-2.5 px-3 text-center font-mono">
                  {REGIONES_DATA.PAIS.atnMinMediana} min (69s)
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold">
                  {REGIONES_DATA.PAIS.cicloHabilMedia.toFixed(1)}h (10.0h med)
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                  {REGIONES_DATA.PAIS.cicloCalMedia.toFixed(1)}h (~3.3d)
                </td>
                <td className="py-2.5 px-3 text-center font-mono">
                  {REGIONES_DATA.PAIS.atnDentro8a4.toLocaleString()} (73.1%)
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                  {REGIONES_DATA.PAIS.atnFuera8a4.toLocaleString()} (26.9%)
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold">
                  {REGIONES_DATA.PAIS.totalAtendidas.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
}
