import React from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  FileText,
  User,
  GraduationCap,
} from 'lucide-react';

export default function DeleteProjectModal({
  isOpen,
  onClose,
  project,
  onConfirmDelete,
}) {
  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden">
        
        {/* Header de Alerta */}
        <div className="p-5 bg-red-50 border-b border-red-100 flex items-start space-x-3.5">
          <div className="p-2.5 bg-red-100 text-red-600 rounded-xl shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-red-900">
              ¿Eliminar Proyecto de Grado?
            </h3>
            <p className="text-xs text-red-700 mt-0.5">
              Esta acción eliminará el registro de la tesis de la base de datos local y del panel de evaluación.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-100/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Detalles del Proyecto a Eliminar */}
        <div className="p-5 space-y-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-800 line-clamp-2">
              {project.title}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">Autor:</span> {project.studentName || 'Estudiante UPEC'}
              </div>
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">Carrera:</span> {project.career || 'Ingeniería en Computación'}
              </div>
              {project.ipfsMetadataCID && (
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  CID: {project.ipfsMetadataCID}
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-600">
            ¿Confirmas que deseas retirar este proyecto de la lista? Podrás registrarlo nuevamente cuando desees.
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmDelete(project.id);
              onClose();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Sí, Eliminar Proyecto
          </button>
        </div>

      </div>
    </div>
  );
}
