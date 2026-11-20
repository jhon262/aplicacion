import React from 'react';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Coins,
  FileSignature,
  Briefcase,
  History,
  Activity,
  Compass,
  Code2,
  Lock,
} from 'lucide-react';

export default function UpcomingModuleView({
  moduleId,
  title,
  subtitle,
  icon: IconComponent = Layers,
  phase = 'Fase 3 y 4',
  description,
  features = [],
  technicalSpecs = [],
  primaryColor = '#007A3D',
}) {
  return (
    <div className="space-y-6">
      {/* Cabecera del Módulo con Banner Institucional */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-950 rounded-xl p-6 sm:p-7 text-white border border-emerald-800/60 shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Módulo en desarrollo • {phase}</span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="w-10 h-10 rounded-lg bg-emerald-800/60 border border-emerald-700/50 flex items-center justify-center shrink-0">
              <IconComponent className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{title}</h2>
              <p className="text-xs sm:text-sm text-emerald-200/80">{subtitle}</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
            {description}
          </p>
        </div>
      </div>

      {/* Grid de Características y Especificaciones Técnicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Tarjeta de Funcionalidades Planificadas */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Funcionalidades en implementación
            </h3>
          </div>

          <div className="space-y-2.5">
            {features.map((feat, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">{feat.title}</span>
                  <span className="text-[11px] text-slate-600 leading-relaxed">{feat.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tarjeta de Arquitectura y Especificaciones de Smart Contracts */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Code2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Especificaciones de arquitectura Web3
            </h3>
          </div>

          <div className="space-y-2">
            {technicalSpecs.map((spec, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-600 font-medium">{spec.label}</span>
                <span className="font-mono font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs text-[11px]">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200/90 text-amber-950 text-xs flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Nota de investigación:</strong> Este módulo se encuentra articulado con los Smart Contracts institucionales (`UPECToken.sol` y `PurchaseEscrow.sol`) en el marco de la tesis FIACA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
