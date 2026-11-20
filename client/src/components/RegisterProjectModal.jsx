import React, { useState } from 'react';
import { X, UploadCloud, FileText, Clock, AlertCircle, Loader2 } from 'lucide-react';

export default function RegisterProjectModal({
  isOpen,
  onClose,
  onRegister,
  isPending,
  isConfirming,
  isConnected,
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ipfsCID, setIpfsCID] = useState('');
  const [duration, setDuration] = useState('604800'); // 7 días en segundos por defecto
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isConnected) {
      setErrorMsg('Debes conectar tu billetera Web3 (MetaMask/Rainbow) antes de registrar.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('El título del proyecto es obligatorio.');
      return;
    }
    if (!ipfsCID.trim()) {
      setErrorMsg('El Hash/CID de IPFS es obligatorio para asegurar la trazabilidad digital.');
      return;
    }

    try {
      await onRegister({
        title: title.trim(),
        description: description.trim(),
        ipfsCID: ipfsCID.trim(),
        durationInSeconds: Number(duration),
      });
      // Limpiar formulario y cerrar
      setTitle('');
      setDescription('');
      setIpfsCID('');
      onClose();
    } catch (err) {
      setErrorMsg(err.shortMessage || err.message || 'Error al enviar la transacción.');
    }
  };

  const handleSetMockCID = () => {
    // Ejemplo de CID v1 para pruebas rápidas
    setIpfsCID('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Registrar Proyecto de Tesis</h3>
              <p className="text-xs text-slate-400">Registro inmutable en blockchain y metadata en IPFS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Título del Proyecto / Tesis *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Arquitectura Descentralizada Web3 para la UPEC"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Resumen / Abstract
            </label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción del alcance, objetivos y metodología del proyecto..."
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Hash IPFS del Documento (CID) *
              </label>
              <button
                type="button"
                onClick={handleSetMockCID}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium underline"
              >
                Usar CID demo
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                value={ipfsCID}
                onChange={(e) => setIpfsCID(e.target.value)}
                placeholder="Ej: Qm... o bafy..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono text-xs"
              />
              <UploadCloud className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Usa el script <code className="text-emerald-400">node scripts/uploadToIPFS.js &lt;archivo&gt;</code> para obtener el CID desde Pinata.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Ventana de Votación DAO
            </label>
            <div className="relative">
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition appearance-none"
              >
                <option value="86400">1 Día (Pruebas / Demo rápida)</option>
                <option value="259200">3 Días</option>
                <option value="604800">7 Días (Periodo oficial recomendado)</option>
                <option value="1209600">14 Días</option>
              </select>
              <Clock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || isConfirming || !isConnected}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-semibold text-sm transition shadow-lg shadow-emerald-500/20"
            >
              {(isPending || isConfirming) && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {isPending
                  ? 'Confirmando en Wallet...'
                  : isConfirming
                  ? 'Minando en Blockchain...'
                  : 'Registrar en Smart Contract'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
