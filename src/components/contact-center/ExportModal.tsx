import React from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  FileCode,
  AlertTriangle,
} from 'lucide-react';
import type { SpecialCase } from '../../types/contactCenter';
import { exportCasesToCSV, exportToJSON } from '../../services/contactCenter/exportService';
import { formatNumber } from '../../utils/contactCenter/formatters';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredCases: SpecialCase[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  filteredCases,
}) => {
  if (!isOpen) return null;

  const criticalCases = filteredCases.filter((c) => Math.round(c.tiempoSolucionDias * 8) > 56);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Download className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Exportar Reporte de Tiempos</h3>
              <p className="text-xs text-slate-500">
                Formato en Horas Hábiles (8 horas por día hábil)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <button
            onClick={() => {
              exportCasesToCSV(filteredCases, 'tiempos_solucion_casos_horas_habiles.csv');
              onClose();
            }}
            className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-xs font-bold text-slate-900 block">
                  Reporte de Tiempos en Horas Hábiles (CSV)
                </strong>
                <span className="text-[11px] text-slate-500">
                  {formatNumber(filteredCases.length)} casos calculados a 8h hábiles por día
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
          </button>

          <button
            onClick={() => {
              exportCasesToCSV(criticalCases, 'casos_demora_critica_mayor_56h_habiles.csv');
              onClose();
            }}
            className="w-full text-left p-3.5 rounded-xl border border-rose-200 hover:border-rose-500 hover:bg-rose-50/40 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-xs font-bold text-slate-900 block">
                  Solo Casos Críticos &gt; 56 Horas Hábiles (CSV)
                </strong>
                <span className="text-[11px] text-slate-500">
                  {formatNumber(criticalCases.length)} casos con demoras superiores a 7 días hábiles
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
          </button>

          <button
            onClick={() => {
              exportToJSON(filteredCases, 'casos_especiales_tiempos_8h_habiles.json');
              onClose();
            }}
            className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/40 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-xs font-bold text-slate-900 block">
                  Estructura de Datos JSON (8h Hábiles)
                </strong>
                <span className="text-[11px] text-slate-500">
                  Formato estructurado para auditorías operativas
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-purple-600" />
          </button>
        </div>
      </div>
    </div>
  );
};
