import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Award,
  ExternalLink,
  ShieldCheck,
  User,
  Loader2,
} from 'lucide-react';

export default function ProjectCard({
  project,
  onVote,
  onFinalize,
  isConnected,
  currentAddress,
}) {
  const [actionLoading, setActionLoading] = useState(false);

  const {
    id,
    title,
    description,
    ipfsMetadataCID,
    submitter,
    votesFor,
    votesAgainst,
    votingDeadline,
    status,
    certificateId,
  } = project;

  const totalVotes = votesFor + votesAgainst;
  const quorumRequired = 3;
  const quorumPercentage = Math.min(Math.round((totalVotes / quorumRequired) * 100), 100);

  const now = Math.floor(Date.now() / 1000);
  const isExpired = now > votingDeadline;
  const canFinalize = status === 0 && (totalVotes >= quorumRequired || isExpired);

  const deadlineDate = new Date(votingDeadline * 1000).toLocaleString('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const handleVote = async (support) => {
    try {
      setActionLoading(true);
      await onVote(id, support);
    } catch (err) {
      console.error('Error al votar:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setActionLoading(true);
      await onFinalize(id);
    } catch (err) {
      console.error('Error al finalizar:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-6 transition-all shadow-xl flex flex-col justify-between group">
      <div>
        {/* Header & Status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
            #{id}
          </span>

          {status === 0 && (
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-3.5 h-3.5" />
              <span>En Votación DAO</span>
            </span>
          )}
          {status === 1 && (
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aprobado & Certificado</span>
            </span>
          )}
          {status === 2 && (
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle className="w-3.5 h-3.5" />
              <span>Rechazado</span>
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h4 className="text-lg font-bold text-white group-hover:text-emerald-400 transition mb-2">
          {title}
        </h4>
        <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">
          {description || 'Sin descripción adicional.'}
        </p>

        {/* Submitter & IPFS */}
        <div className="space-y-2 py-3 border-y border-slate-800/80 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Autor:</span>
            </span>
            <span className="font-mono text-slate-300 font-semibold">{formatAddress(submitter)}</span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>IPFS CID:</span>
            </span>
            <a
              href={`https://gateway.pinata.cloud/ipfs/${ipfsMetadataCID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-emerald-400 hover:text-emerald-300 inline-flex items-center space-x-1 hover:underline"
            >
              <span>{ipfsMetadataCID.substring(0, 10)}...</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Límite DAO:</span>
            </span>
            <span className={isExpired ? 'text-rose-400 font-medium' : 'text-slate-300 font-medium'}>
              {deadlineDate} {isExpired && '(Vencido)'}
            </span>
          </div>
        </div>

        {/* Voting & Quorum Progress */}
        <div className="my-4 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Progreso de Quórum:</span>
            <span className="font-bold text-white">
              {totalVotes} / {quorumRequired} votos ({quorumPercentage}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                totalVotes >= quorumRequired ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${quorumPercentage}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-center text-xs">
            <div className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400">
              <span className="font-black text-sm">{votesFor}</span> a favor
            </div>
            <div className="p-2 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-400">
              <span className="font-black text-sm">{votesAgainst}</span> en contra
            </div>
          </div>
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="pt-2 border-t border-slate-800/80">
        {status === 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleVote(true)}
                disabled={actionLoading || !isConnected || isExpired}
                className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition disabled:opacity-40"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Aprobar</span>
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={actionLoading || !isConnected || isExpired}
                className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold text-xs transition disabled:opacity-40"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>Rechazar</span>
              </button>
            </div>

            {canFinalize && (
              <button
                onClick={handleFinalize}
                disabled={actionLoading || !isConnected}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Award className="w-4 h-4" />
                )}
                <span>Finalizar y Mintear Certificado NFT</span>
              </button>
            )}
          </div>
        )}

        {status === 1 && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-emerald-400">
              <Award className="w-4 h-4" />
              <span className="font-bold">Certificado NFT #{certificateId}</span>
            </div>
            <a
              href={`https://gateway.pinata.cloud/ipfs/${ipfsMetadataCID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <span>Ver en IPFS</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {status === 2 && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-xs text-rose-400 font-medium">
            Proyecto rechazado por decisión de la DAO o falta de quórum.
          </div>
        )}
      </div>
    </div>
  );
}
