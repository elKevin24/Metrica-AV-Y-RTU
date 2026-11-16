import React from 'react';
import {
  X,
  User,
  Building2,
  Tag,
  FileText,
  CheckCircle2,
  Clock,
  Ticket,
  Hash,
} from 'lucide-react';
import type { SpecialCase } from '../../types/contactCenter';

interface CaseDetailModalProps {
  caseItem: SpecialCase | null;
  onClose: () => void;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({ caseItem, onClose }) => {
  if (!caseItem) return null;

  const isResolved = caseItem.estado === 'Resuelto';
  const businessHours = Math.round(caseItem.tiempoSolucionDias * 8);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Ficha de Caso Especial</h3>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {caseItem.id}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Mes de registro: <strong>{caseItem.mes}</strong> | Canal: <strong>{caseItem.canal}</strong>
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

        <div className="p-6 space-y-5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Estado Actual:
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  isResolved
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {isResolved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Caso Resuelto
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    En Proceso / Pendiente
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Tiempo de Solución:</span>
              <strong className="text-blue-700 font-black text-sm bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                {businessHours} horas hábiles
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-xs font-semibold text-slate-500 block mb-1">
                Identificador de Contribuyente
              </span>
              <div className="text-base font-mono font-bold text-slate-900 flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-slate-400" />
                {caseItem.nit}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-xs font-semibold text-slate-500 block mb-1">
                Ticket de Mesa de Ayuda
              </span>
              <div className="text-base font-mono font-bold text-blue-600 flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-blue-500" />
                {caseItem.ticket || 'Sin Ticket Asignado'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-xs font-semibold text-slate-500 block mb-1">
                Tipificación / Categoría
              </span>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-500" />
                {caseItem.tipificacion}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-xs font-semibold text-slate-500 block mb-1">
                Supervisor Responsable
              </span>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-500" />
                {caseItem.supervisor}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-xs font-semibold text-slate-500 block mb-1">
                Área / Unidad Resolutiva
              </span>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-500" />
                {caseItem.areaResolucion}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-xs font-semibold text-slate-500 block mb-1">
                Reportado Por (Agente)
              </span>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                {caseItem.reportadoPor || 'Agente de Contact Center'}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Descripción del Inconveniente Reportado
            </span>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
              {caseItem.descripcion || 'Sin descripción detallada registrada.'}
            </div>
          </div>

          {caseItem.observacion && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Observaciones y Seguimiento
              </span>
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-950 text-xs leading-relaxed">
                {caseItem.observacion}
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Línea de Tiempo del Caso
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block">Fecha de Ingreso:</span>
                <strong className="text-slate-900 font-semibold">{caseItem.fechaIngreso}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Fecha de Traslado:</span>
                <strong className="text-slate-900 font-semibold">{caseItem.fechaTraslado}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Fecha de Resolución:</span>
                <strong className="text-slate-900 font-semibold">
                  {caseItem.fechaResuelto || (isResolved ? 'Resuelto' : 'En proceso')}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
