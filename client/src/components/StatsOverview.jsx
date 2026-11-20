import React from 'react';
import { Layers, CheckCircle2, Clock, Users } from 'lucide-react';

export default function StatsOverview({ projects = [] }) {
  const total = projects.length;
  const approved = projects.filter((p) => p.status === 1).length;
  const pending = projects.filter((p) => p.status === 0).length;

  const stats = [
    {
      label: 'Proyectos Registrados',
      value: total,
      icon: Layers,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20',
    },
    {
      label: 'Certificados NFT Emitidos',
      value: approved,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'En Votación DAO',
      value: pending,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Quórum Mínimo Requerido',
      value: '3 Votos',
      icon: Users,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 my-8">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className={`p-5 rounded-2xl border ${stat.bg} backdrop-blur-sm transition-all hover:translate-y-[-2px]`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {stat.label}
              </span>
              <div className={`p-2 rounded-xl ${stat.bg}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{stat.value}</div>
          </div>
        );
      })}
    </div>
  );
}
