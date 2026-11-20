import React, { useState } from 'react';
import {
  Coins,
  ArrowUpRight,
  Clock,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Wallet,
  ShieldCheck,
  ArrowRight,
  Users,
  Send,
  RefreshCw,
} from 'lucide-react';
import { useUPECToken } from '../../hooks/useUPECToken.js';
import { useAccount, useChainId } from 'wagmi';
import { getDatabaseTransactions } from '../../utils/upecDatabase.js';

export default function UPECTokenView({
  currentTheme,
  userAddress,
  formatAddress,
  setNotification,
}) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const {
    tokenAddress,
    balance,
    balanceNumber,
    isLoadingBalance,
    refetchBalance,
    faucetAmountFormatted,
    remainingCooldown,
    isCooldownActive,
    formattedCooldown,
    claimFaucet,
    isClaimingFaucet,
    transferTokens,
    isTransferring,
    addTokenToMetaMask,
    isAddingToWallet,
    txError,
    lastTxHash,
  } = useUPECToken();

  // Formulario de transferencia
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [successTx, setSuccessTx] = useState(null);
  const [formError, setFormError] = useState(null);

  // Lista de direcciones académicas sugeridas para pruebas rápidas
  const suggestedRecipients = [
    { label: 'Docente Evaluador (Cuenta #2)', address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', role: 'Tribunal DAO' },
    { label: 'Estudiante Investigador (Cuenta #3)', address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', role: 'Tesista' },
    { label: 'Secretaría Académica (Cuenta #4)', address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', role: 'Validador' },
  ];

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleClaimFaucet = async () => {
    setFormError(null);
    setSuccessTx(null);
    try {
      const res = await claimFaucet();
      setSuccessTx({
        type: 'Reclamo de Faucet',
        hash: res.hash,
        message: `¡Has recibido ${faucetAmountFormatted} UPECT académicos exitosamente en tu billetera!`,
      });
      if (setNotification) {
        setNotification({
          type: 'success',
          message: `Reclamo exitoso: +${faucetAmountFormatted} UPECT recibidos en bloque.`,
        });
      }
    } catch (err) {
      setFormError(err.message || 'Error al reclamar del faucet.');
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessTx(null);

    if (!recipient.trim()) {
      setFormError('Por favor ingresa la dirección de destino.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setFormError('Ingresa un monto válido mayor a 0 UPECT.');
      return;
    }

    try {
      const res = await transferTokens(recipient.trim(), amount.trim());
      setSuccessTx({
        type: 'Transferencia Directa',
        hash: res.hash,
        message: `¡Se transfirieron ${amount} UPECT a ${recipient.slice(0, 8)}...${recipient.slice(-6)}!`,
      });
      if (setNotification) {
        setNotification({
          type: 'success',
          message: `Transferencia confirmada: ${amount} UPECT enviados con éxito.`,
        });
      }
      setAmount('');
      setRecipient('');
    } catch (err) {
      setFormError(err.message || 'Error al ejecutar la transferencia.');
    }
  };

  const handleAddMetaMask = async () => {
    try {
      await addTokenToMetaMask();
      if (setNotification) {
        setNotification({
          type: 'success',
          message: 'Solicitud enviada a MetaMask para registrar el token UPECT.',
        });
      }
    } catch (err) {
      if (setNotification) {
        setNotification({
          type: 'error',
          message: err.message || 'Error al agregar a MetaMask',
        });
      }
    }
  };

  // Obtener transacciones recientes de la base local
  const transactions = getDatabaseTransactions().filter(
    (tx) => tx.token === 'UPECT' || tx.type?.includes('UPECT')
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Banner de Aviso Académico */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-amber-900">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs sm:text-sm">
          <p className="font-semibold text-amber-800">
            Moneda Académica de Demostración — UPEC Token Demo (UPECT)
          </p>
          <p className="text-amber-700 mt-0.5">
            Token de pruebas basado en el estándar OpenZeppelin ERC-20 implementado exclusivamente para investigación académica en la red local Hardhat (Chain ID 1337). No posee valor monetario ni cotización comercial real.
          </p>
        </div>
      </div>

      {/* Tarjeta Principal de Balance y Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Actual */}
        <div className="md:col-span-2 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 -mr-12 -mt-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <Coins className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">Saldo en MetaMask</h3>
                  <p className="text-xs text-emerald-200">Red Académica Hardhat (1337)</p>
                </div>
              </div>
              <button
                onClick={() => refetchBalance()}
                className="p-2 bg-emerald-800/80 hover:bg-emerald-700/80 rounded-lg text-emerald-200 transition-colors"
                title="Actualizar saldo"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                  {parseFloat(balance).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
                <span className="text-xl font-bold text-amber-300">UPECT</span>
              </div>
              <p className="text-xs text-emerald-200 mt-1">
                Billetera conectada: {address ? `${address.slice(0, 10)}...${address.slice(-8)}` : 'Desconectada'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleAddMetaMask}
                disabled={isAddingToWallet || !isConnected}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-medium flex items-center gap-2 backdrop-blur-sm transition-all"
              >
                <Wallet className="w-3.5 h-3.5 text-amber-300" />
                {isAddingToWallet ? 'Verificando...' : 'Añadir UPECT a MetaMask'}
              </button>

              <div className="px-3 py-2 bg-emerald-950/60 rounded-xl text-xs font-mono flex items-center gap-2 border border-emerald-700/40">
                <span className="text-emerald-300">Contrato:</span>
                <span className="text-emerald-100">{tokenAddress ? `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}` : '0x...'}</span>
                <button
                  onClick={() => handleCopy(tokenAddress)}
                  className="hover:text-amber-300 transition-colors"
                  title="Copiar dirección del token"
                >
                  {copiedAddress ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Módulo de Faucet Académico */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Coins className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-slate-900 text-sm">
                  Dispensador de Tokens de Prueba (Faucet)
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                +{faucetAmountFormatted} UPECT
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Obtén tokens de demostración para participar en contratos de compraventa y pruebas de investigación. Límite: 100 UPECT cada 24 horas por billetera.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 mb-4">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Estado del Faucet:
                </span>
                <span className={`font-semibold ${isCooldownActive ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {isCooldownActive ? 'En Enfriamiento' : 'Disponible para reclamo'}
                </span>
              </div>
              {isCooldownActive && (
                <p className="text-xs font-mono text-amber-800 text-right">
                  Tiempo restante: {formattedCooldown}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleClaimFaucet}
            disabled={isClaimingFaucet || isCooldownActive || !isConnected}
            className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              isCooldownActive || !isConnected
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs active:scale-[0.99]'
            }`}
          >
            {isClaimingFaucet ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Confirmando en Bloque...</span>
              </>
            ) : isCooldownActive ? (
              <>
                <Clock className="w-4 h-4" />
                <span>Reclamo no disponible</span>
              </>
            ) : (
              <>
                <Coins className="w-4 h-4" />
                <span>Solicitar 100 UPECT</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notificación de Éxito o Hash */}
      {successTx && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-start justify-between gap-3 text-emerald-900 animate-fadeIn">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">{successTx.type} Confirmada</p>
              <p className="text-xs text-emerald-700 mt-0.5">{successTx.message}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                  Tx: {successTx.hash.slice(0, 16)}...{successTx.hash.slice(-12)}
                </span>
                <button
                  onClick={() => handleCopy(successTx.hash)}
                  className="text-xs text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copiar Hash
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSuccessTx(null)}
            className="text-emerald-500 hover:text-emerald-700 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Notificación de Error */}
      {(formError || txError) && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 flex items-start justify-between gap-3 text-rose-900 animate-fadeIn">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Error en la Operación</p>
              <p className="text-xs text-rose-700 mt-0.5">{formError || txError?.message}</p>
            </div>
          </div>
          <button
            onClick={() => { setFormError(null); }}
            className="text-rose-500 hover:text-rose-700 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sección Inferior: Formulario de Transferencia y Historial de Movimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de Envío de UPECT */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              <h4 className="font-bold text-slate-800 text-base">Enviar Tokens UPECT</h4>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Disponible: <strong className="text-slate-800">{parseFloat(balance).toFixed(2)} UPECT</strong>
            </span>
          </div>

          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Dirección Destinatario (Ethereum / Hardhat)
              </label>
              <input
                type="text"
                placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            {/* Cuentas sugeridas de prueba */}
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> O selecciona una cuenta de la comunidad UPEC:
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {suggestedRecipients.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRecipient(s.address)}
                    className="text-left px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-xs flex items-center justify-between transition-colors"
                  >
                    <span className="font-medium text-slate-700">{s.label}</span>
                    <span className="font-mono text-slate-400 text-[11px]">{s.address.slice(0, 6)}...{s.address.slice(-4)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Monto a Transferir
                </label>
                <button
                  type="button"
                  onClick={() => setAmount(balance)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                >
                  Enviar Máximo
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all pr-16"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                  UPECT
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isTransferring || !isConnected || balanceNumber <= 0}
              className={`w-full py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md ${
                isTransferring || !isConnected || balanceNumber <= 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-[0.98]'
              }`}
            >
              {isTransferring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Firmando y Minando Transferencia...</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Confirmar y Enviar con MetaMask</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Historial de Movimientos de la Moneda */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <h4 className="font-bold text-slate-800 text-base">Actividad Reciente de UPECT</h4>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {transactions.length} registros
              </span>
            </div>

            {transactions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Coins className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-xs">No hay transferencias o reclamos registrados aún.</p>
                <p className="text-[11px] text-slate-400">
                  Solicita tokens del Faucet o realiza un envío para generar transacciones en el bloque.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {transactions.slice(0, 6).map((tx, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.type?.includes('FAUCET')
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {tx.type?.includes('FAUCET') ? <Coins className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{tx.description || tx.type}</p>
                        <p className="text-[11px] font-mono text-slate-400">
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • Bloque {tx.blockNumber || 'Local'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                        Confirmada
                      </span>
                      <button
                        onClick={() => handleCopy(tx.hash)}
                        className="block text-[10px] font-mono text-slate-400 hover:text-slate-600 mt-1"
                        title={tx.hash}
                      >
                        {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Validación criptográfica local</span>
            <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Chain ID: {chainId || 1337}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
