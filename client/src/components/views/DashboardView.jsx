import React from 'react';
import {
  Building2,
  LayoutDashboard,
  Award,
  Vote,
  FolderKanban,
  FilePlus,
  ShieldCheck,
  Coins,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Database,
} from 'lucide-react';

export default function DashboardView({
  currentUser,
  currentTheme,
  projects = [],
  approvedProjects = [],
  myProjects = [],
  onSelectTab,
  onOpenDocumentViewer,
  primaryColor = '#007A3D',
}) {
  const pendingProjects = projects.filter((p) => p.status === 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Banner Principal Institucional */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7 text-white shadow-xs border border-emerald-700/60"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, #004D26 65%, #052e16 100%)`,
        }}
      >
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/30 text-amber-300 text-xs font-semibold shadow-xs">
            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Universidad Politécnica Estatal del Carchi • FIACA</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Prototipo Académico de Titulación y Custodia Web3
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal max-w-2xl">
            Entorno de investigación para la acreditación académica descentralizada, evaluación colegiada mediante Tribunal DAO, custodia de condiciones en IPFS y emisión de certificados NFT (ERC-721).
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium text-emerald-100">
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Red EVM Hardhat (1337)</span>
            </span>
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Tribunal DAO Quórum 3/3</span>
            </span>
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
              <span>Nodos IPFS Operativos</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Tarjetas de Métricas Institucionales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Métrica 1: Tesis Aprobadas */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-2 hover:border-emerald-600/40 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Certificados NFT</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200/60">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">{approvedProjects.length}</span>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">Acreditados</span>
          </div>
          <p className="text-[11px] text-slate-500">Tesis con quórum 3/3 finalizado</p>
        </div>

        {/* Métrica 2: Tesis en Votación */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-2 hover:border-amber-600/40 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Tribunal DAO</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200/60">
              <Vote className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">{pendingProjects.length}</span>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">En deliberación</span>
          </div>
          <p className="text-[11px] text-slate-500">Dictámenes pendientes de firma</p>
        </div>

        {/* Métrica 3: Mis Proyectos */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-2 hover:border-slate-400 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Investigaciones</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <FolderKanban className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">{myProjects.length}</span>
            <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">En autoría</span>
          </div>
          <p className="text-[11px] text-slate-500">Vinculados a tu perfil universitario</p>
        </div>

        {/* Métrica 4: Total en Red */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-2 hover:border-emerald-600/40 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-600">Registro Blockchain</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200/60">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">{projects.length}</span>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">On-Chain</span>
          </div>
          <p className="text-[11px] text-slate-500">Contratos inmutables registrados</p>
        </div>
      </div>

      {/* 3. Acciones Operacionales */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Módulos Operacionales</h2>
          <p className="text-xs text-slate-500">Acceso directo a las funciones de titulación y custodia del protocolo</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => onSelectTab('database')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-300 text-slate-900 text-xs transition-colors group text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-bold text-slate-800 group-hover:text-emerald-950">Base de datos</span>
                <span className="text-[11px] text-slate-500">Gestión de expedientes y cuentas</span>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('register')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-300 text-slate-900 text-xs transition-colors group text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
                <FilePlus className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-bold text-slate-800 group-hover:text-emerald-950">Registrar tesis</span>
                <span className="text-[11px] text-slate-500">Cargar PDF y metadatos IPFS</span>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('vote')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200/80 hover:border-amber-300 text-slate-900 text-xs transition-colors group text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-700 text-white flex items-center justify-center shrink-0">
                <Vote className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-bold text-slate-800 group-hover:text-amber-950">Tribunal DAO</span>
                <span className="text-[11px] text-slate-500">Votación docente colegiada</span>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-800 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('certificate')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-300 text-slate-900 text-xs transition-colors group text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-bold text-slate-800 group-hover:text-emerald-950">Certificados NFT</span>
                <span className="text-[11px] text-slate-500">Diplomas con código QR</span>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('verify')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-300 text-slate-900 text-xs transition-colors group text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-bold text-slate-800">Verificación</span>
                <span className="text-[11px] text-slate-500">Validar huella criptográfica</span>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>

      {/* 4. Resumen de Proyectos Recientes */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Proyectos Registrados Recientemente</h2>
            <p className="text-xs text-slate-500">Tesis y trabajos de grado custodiados en el protocolo de investigación</p>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('my-projects')}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center space-x-1"
          >
            <span>Ver todos ({projects.length})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2.5">
          {projects.slice(0, 3).map((proj) => (
            <div
              key={proj.id}
              className="p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 truncate">{proj.title}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                      proj.status === 1
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : proj.status === 2
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {proj.status === 1 ? 'Aprobado NFT' : proj.status === 2 ? 'Rechazado' : 'En votación DAO'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-1">{proj.description}</p>
                <div className="flex items-center space-x-3 text-[10px] text-slate-500">
                  <span>Autor: <strong className="text-slate-700">{proj.studentName || 'Benítez Ruales María José'}</strong></span>
                  <span>•</span>
                  <span className="font-mono">CID: {proj.ipfsMetadataCID ? `${proj.ipfsMetadataCID.substring(0, 10)}...` : 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {onOpenDocumentViewer && (
                  <button
                    type="button"
                    onClick={() => onOpenDocumentViewer(proj, 'pdf')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors"
                    title="Leer tesis en formato PDF"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Ver PDF</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectTab(proj.status === 1 ? 'certificate' : 'vote')}
                  className="px-3 py-1.5 rounded-lg bg-[#007A3D] hover:bg-emerald-900 text-white font-semibold text-xs shadow-2xs transition-colors"
                >
                  {proj.status === 1 ? 'Ver Certificado' : 'Ir a Votar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
