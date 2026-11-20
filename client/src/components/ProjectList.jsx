import React, { useState } from 'react';
import ProjectCard from './ProjectCard.jsx';
import { Search, Filter, FolderKanban } from 'lucide-react';

export default function ProjectList({
  projects = [],
  isLoading,
  onVote,
  onFinalize,
  isConnected,
  currentAddress,
  onOpenRegisterModal,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', '0', '1', '2'

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.submitter.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ? true : project.status === Number(statusFilter);

    return matchesSearch && matchesStatus;
  });

  return (
    <section className="space-y-6">
      {/* Controles de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Buscar por título, autor o resumen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'all'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todos ({projects.length})
          </button>
          <button
            onClick={() => setStatusFilter('0')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === '0'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            En Votación
          </button>
          <button
            onClick={() => setStatusFilter('1')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === '1'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Certificados NFT
          </button>
          <button
            onClick={() => setStatusFilter('2')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === '2'
                ? 'bg-rose-500 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Rechazados
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-16 text-slate-500 text-sm">
          Cargando proyectos desde la blockchain...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredProjects.length === 0 && (
        <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-slate-800 bg-slate-900/30">
          <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-white mb-1">No se encontraron proyectos</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
            {searchTerm || statusFilter !== 'all'
              ? 'No hay registros que coincidan con los filtros actuales.'
              : 'Aún no se han registrado proyectos en la blockchain. ¡Sé el primero en postular tu proyecto de tesis!'}
          </p>
          <button
            onClick={onOpenRegisterModal}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
          >
            Registrar Primer Proyecto
          </button>
        </div>
      )}

      {/* Grid of Projects */}
      {!isLoading && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onVote={onVote}
              onFinalize={onFinalize}
              isConnected={isConnected}
              currentAddress={currentAddress}
            />
          ))}
        </div>
      )}
    </section>
  );
}
