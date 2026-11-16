import React from 'react';
import {
  UploadCloud,
  Download,
  Printer,
  Timer,
  ShieldCheck,
  Briefcase,
  Lock,
} from 'lucide-react';
import { formatNumber } from '../../utils/contactCenter/formatters';

interface HeaderProps {
  onOpenUpload: () => void;
  onExport: () => void;
  totalCases: number;
  totalSumHours: number;
  isCustomDataset?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUpload,
  onExport,
  totalCases,
  totalSumHours,
  isCustomDataset = false,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm px-4 sm:px-6 py-3.5 print:static print:border-none print:shadow-none">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Contact Center — Tiempos de Solución y Chat
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <ShieldCheck className="w-3 h-3" />
                {formatNumber(totalCases)} Casos
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                <Briefcase className="w-3 h-3" />
                Base 8h Hábiles
              </span>
              {!isCustomDataset && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                  <Lock className="w-3 h-3" />
                  PII Anonimizada
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sumatoria auditada ({formatNumber(totalSumHours)} hrs hábiles), Media, Mediana, Moda y uso mensual de chat 2025
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 print:hidden shrink-0">
          <button
            id="upload-excel-btn"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Cargar Excel</span>
          </button>

          <button
            id="export-report-btn"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>

          <button
            id="print-report-btn"
            onClick={handlePrint}
            title="Imprimir o Guardar PDF"
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
