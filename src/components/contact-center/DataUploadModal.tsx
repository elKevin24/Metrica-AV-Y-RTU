import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { parseSpecialCasesExcelFile } from '../../services/contactCenter/excelParser';
import { formatNumber } from '../../utils/contactCenter/formatters';
import type { SpecialCase } from '../../types/contactCenter';

interface DataUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateSpecialCases: (cases: SpecialCase[]) => void;
  onResetToDefaults: () => void;
}

export const DataUploadModal: React.FC<DataUploadModalProps> = ({
  isOpen,
  onClose,
  onUpdateSpecialCases,
  onResetToDefaults,
}) => {
  const [parsing, setParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [parsedCases, setParsedCases] = useState<SpecialCase[] | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setParsing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const cases = parseSpecialCasesExcelFile(buffer);
      if (cases.length > 0) {
        setParsedCases(cases);
        setSuccessMsg(
          `Detectado: Reporte de Casos Especiales con ${formatNumber(cases.length)} registros (procesado localmente en tu navegador).`
        );
      } else {
        throw new Error('No se encontraron registros de casos especiales en el archivo.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el archivo Excel.');
      setParsedCases(null);
    } finally {
      setParsing(false);
    }
  };

  const handleApply = () => {
    if (!parsedCases) return;
    onUpdateSpecialCases(parsedCases);
    onClose();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Cargar Archivo Excel de Casos Especiales
              </h3>
              <p className="text-xs text-slate-500">
                Procesamiento 100% local en navegador (no se sube a ningún servidor)
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

        <div className="p-6 space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/30"
            onClick={() => document.getElementById('excel-file-input')?.click()}
          >
            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              className="hidden"
            />
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">
              Arrastra tu archivo aquí o haz clic para examinar
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Compatible con archivos Excel (.xlsx, .xls)
            </p>
          </div>

          {parsing && (
            <div className="p-3 rounded-lg bg-blue-50 text-blue-800 text-xs flex items-center gap-2">
              <span>Procesando y calculando tiempos de solución...</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">¡Archivo validado exitosamente!</strong>
                <p className="mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Error al procesar</strong>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">¿Deseas restaurar los datos anonimizados 2025?</span>
            <button
              onClick={() => {
                onResetToDefaults();
                onClose();
              }}
              className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restablecer
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={!parsedCases}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Aplicar y Actualizar Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
