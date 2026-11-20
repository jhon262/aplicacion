import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Coins,
  FileSignature,
  Award,
  Vote,
  RefreshCw,
  ShieldCheck,
  Database,
  Lock,
  Layers,
} from 'lucide-react';
import { usePublicClient, useChainId } from 'wagmi';
import { parseEventLogs, formatUnits } from 'viem';
import { getDatabaseTransactions, clearDatabaseTransactions } from '../../utils/upecDatabase.js';
import {
  ProjectRegistryABI,
  UPECTokenABI,
  PurchaseEscrowABI,
  CONTRACT_ADDRESSES,
  UPEC_TOKEN_ADDRESSES,
  ESCROW_ADDRESSES,
  DEFAULT_CONTRACT_ADDRESS,
  DEFAULT_UPEC_TOKEN_ADDRESS,
  DEFAULT_ESCROW_ADDRESS,
} from '../../contracts/config.js';

export default function TransactionHistoryView({ currentTheme, userAddress, setNotification }) {
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const [localTransactions, setLocalTransactions] = useState(getDatabaseTransactions);
  const [onChainEvents, setOnChainEvents] = useState([]);
  const [isLoadingOnChain, setIsLoadingOnChain] = useState(false);
  const [activeSourceTab, setActiveSourceTab] = useState('all'); // 'all', 'onchain', 'local'
  const [filterModule, setFilterModule] = useState('all'); // 'all', 'UPECT', 'Escrow', 'Titulacion'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState(null);

  const effectiveChainId = chainId || 1337;
  const rawReg = CONTRACT_ADDRESSES[effectiveChainId] || DEFAULT_CONTRACT_ADDRESS;
  const registryAddr = typeof rawReg === 'object' && rawReg?.registry ? rawReg.registry : rawReg;

  const rawTok = UPEC_TOKEN_ADDRESSES[effectiveChainId] || DEFAULT_UPEC_TOKEN_ADDRESS;
  const tokenAddr = typeof rawTok === 'object' && rawTok?.upectToken ? rawTok.upectToken : rawTok;

  const rawEsc = ESCROW_ADDRESSES[effectiveChainId] || DEFAULT_ESCROW_ADDRESS;
  const escrowAddr = typeof rawEsc === 'object' && rawEsc?.escrow ? rawEsc.escrow : rawEsc;

  // Cargar eventos emitidos directamente en la blockchain
  const fetchOnChainEvents = useCallback(async () => {
    if (!publicClient) return;
    setIsLoadingOnChain(true);
    try {
      const addressesToQuery = [tokenAddr, escrowAddr, registryAddr].filter(
        (a) => a && a !== '0x0000000000000000000000000000000000000000'
      );

      if (addressesToQuery.length === 0) {
        setIsLoadingOnChain(false);
        return;
      }

      const rawLogs = await publicClient.getLogs({
        address: addressesToQuery,
        fromBlock: 0n,
        toBlock: 'latest',
      });

      const combinedAbi = [
        ...UPECTokenABI,
        ...PurchaseEscrowABI,
        ...ProjectRegistryABI,
      ];

      const parsedLogs = parseEventLogs({
        abi: combinedAbi,
        logs: rawLogs,
      });

      const formattedOnChain = parsedLogs.map((log) => {
        const eventName = log.eventName;
        const args = log.args || {};
        let module = 'Blockchain';
        let desc = `Evento emitido: ${eventName}`;
        let token = 'UPECT';
        let fromAddr = log.address;

        if (eventName === 'Transfer') {
          module = 'Moneda UPECT';
          desc = `Transferencia de ${formatUnits(args.value || 0n, 18)} UPECT`;
          fromAddr = args.from;
        } else if (eventName === 'FaucetDispensed') {
          module = 'Moneda UPECT';
          desc = `Grifo Faucet: +${formatUnits(args.amount || 0n, 18)} UPECT`;
          fromAddr = args.recipient;
        } else if (eventName === 'Approval') {
          module = 'Moneda UPECT';
          desc = `Aprobación de gasto ERC-20 para Escrow`;
          fromAddr = args.owner;
        } else if (eventName === 'AgreementCreated') {
          module = 'Contratos Escrow';
          desc = `Acuerdo #${args.agreementId} creado por ${formatUnits(args.price || 0n, 18)} UPECT`;
          fromAddr = args.buyer;
        } else if (eventName === 'AgreementAccepted') {
          module = 'Contratos Escrow';
          desc = `Acuerdo #${args.agreementId} aceptado formalmente`;
          fromAddr = args.party;
        } else if (eventName === 'EscrowDeposited') {
          module = 'Contratos Escrow';
          desc = `Fondos bloqueados en Escrow para Acuerdo #${args.agreementId}`;
          fromAddr = args.buyer;
        } else if (eventName === 'DeliveryRegistered') {
          module = 'Contratos Escrow';
          desc = `Entrega registrada para Acuerdo #${args.agreementId}`;
        } else if (eventName === 'PaymentReleased') {
          module = 'Contratos Escrow';
          desc = `Pago liberado al vendedor para Acuerdo #${args.agreementId}`;
          fromAddr = args.seller;
        } else if (eventName === 'DisputeRaised') {
          module = 'Contratos Escrow';
          desc = `Disputa abierta en Acuerdo #${args.agreementId}`;
          fromAddr = args.initiator;
        } else if (eventName === 'DisputeResolved') {
          module = 'Contratos Escrow';
          desc = `Disputa resuelta por Mediación Académica (#${args.agreementId})`;
          fromAddr = args.mediator;
        } else if (eventName === 'ProjectRegistered') {
          module = 'Titulación & NFT';
          desc = `Tesis #${args.projectId} registrada para votación DAO`;
          fromAddr = args.submitter;
          token = 'NFT';
        } else if (eventName === 'VoteCast') {
          module = 'Titulación & NFT';
          desc = `Voto emitido en Tesis #${args.projectId} (${args.support ? 'A favor' : 'En contra'})`;
          fromAddr = args.voter;
          token = 'DAO';
        } else if (eventName === 'CertificateIssued') {
          module = 'Titulación & NFT';
          desc = `Certificado NFT #${args.tokenId} emitido al autor`;
          fromAddr = args.recipient;
          token = 'NFT';
        }

        return {
          id: `${log.transactionHash}-${log.logIndex}`,
          hash: log.transactionHash,
          type: eventName,
          module,
          description: desc,
          token,
          from: fromAddr,
          blockNumber: Number(log.blockNumber),
          timestamp: new Date().toISOString(),
          status: 'Confirmed',
          source: 'ON_CHAIN',
        };
      });

      // Ordenar por bloque más reciente
      formattedOnChain.sort((a, b) => b.blockNumber - a.blockNumber);
      setOnChainEvents(formattedOnChain);
    } catch (e) {
      console.warn('Error fetching on-chain events:', e);
    } finally {
      setIsLoadingOnChain(false);
    }
  }, [publicClient, tokenAddr, escrowAddr, registryAddr]);

  useEffect(() => {
    fetchOnChainEvents();
    const interval = setInterval(fetchOnChainEvents, 6000);
    return () => clearInterval(interval);
  }, [fetchOnChainEvents]);

  // Escuchar eventos en tiempo real de nuevas transacciones locales
  useEffect(() => {
    const handleUpdate = () => {
      setLocalTransactions(getDatabaseTransactions());
      fetchOnChainEvents();
    };
    window.addEventListener('upec_tx_updated', handleUpdate);
    return () => window.removeEventListener('upec_tx_updated', handleUpdate);
  }, [fetchOnChainEvents]);

  const handleCopy = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleClearLocal = () => {
    if (window.confirm('¿Deseas vaciar los registros de sesión local? (Los eventos de la blockchain permanecerán inalterados)')) {
      clearDatabaseTransactions();
      setLocalTransactions([]);
      if (setNotification) {
        setNotification({
          type: 'info',
          message: 'Registros locales limpiados.',
        });
      }
    }
  };

  // Combinación y deduplicación por Hash
  const allTransactions = [
    ...onChainEvents,
    ...localTransactions
      .filter((lt) => !onChainEvents.some((oe) => oe.hash.toLowerCase() === lt.hash.toLowerCase()))
      .map((lt) => ({ ...lt, source: 'LOCAL' })),
  ];

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allTransactions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `auditoria_upec_blockchain_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    if (allTransactions.length === 0) return;
    const headers = ['Hash', 'Origen', 'Evento_Tipo', 'Modulo', 'Direccion_De', 'Token', 'Estado', 'Bloque', 'Fecha', 'Descripcion'];
    const rows = allTransactions.map((t) => [
      t.hash,
      t.source || 'ON_CHAIN',
      t.type,
      t.module,
      t.from,
      t.token || 'UPECT',
      t.status,
      t.blockNumber || 'Local',
      t.timestamp,
      `"${(t.description || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `auditoria_upec_blockchain_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filtrado compuesto
  const filtered = allTransactions.filter((tx) => {
    if (activeSourceTab === 'onchain' && tx.source !== 'ON_CHAIN') return false;
    if (activeSourceTab === 'local' && tx.source !== 'LOCAL') return false;

    if (filterModule !== 'all') {
      if (filterModule === 'UPECT' && !tx.module?.includes('UPECT') && !tx.type?.includes('UPECT')) return false;
      if (filterModule === 'Escrow' && !tx.module?.includes('Escrow') && !tx.type?.includes('ESCROW') && !tx.type?.includes('Agreement')) return false;
      if (filterModule === 'Titulacion' && !tx.module?.includes('Titulación') && !tx.type?.includes('NFT') && !tx.type?.includes('Project') && !tx.type?.includes('Vote')) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchHash = tx.hash?.toLowerCase().includes(q);
      const matchDesc = tx.description?.toLowerCase().includes(q);
      const matchType = tx.type?.toLowerCase().includes(q);
      const matchFrom = tx.from?.toLowerCase().includes(q);
      return matchHash || matchDesc || matchType || matchFrom;
    }

    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Banner de Aviso Académico y Privacidad de Datos */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-amber-900">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs sm:text-sm">
          <p className="font-semibold text-amber-800">
            Libro Mayor de Eventos On-Chain y Trazabilidad — Universidad Politécnica Estatal del Carchi
          </p>
          <p className="text-amber-700 mt-0.5">
            Los eventos mostrados son consultados criptográficamente desde los registros de eventos de los contratos inteligentes (<code>eth_getLogs</code>). Prototipo con fines académicos y de investigación sin validez legal ni financiera.
          </p>
        </div>
      </div>

      {/* Recuadro Informativo de Separación On-Chain vs Off-Chain (Protección de Datos) */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-blue-950 text-xs">
        <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-bold text-blue-900">
            Arquitectura de Privacidad: Separación On-Chain y Off-Chain (LOPDP)
          </p>
          <p className="text-blue-800 leading-relaxed">
            • <strong>En Blockchain (Público e Inmutable):</strong> Hashes criptográficos de IPFS, estados de acuerdos de compraventa, saldos de UPECT, votos numéricos del tribunal y tokens identificadores únicos.
          </p>
          <p className="text-blue-800 leading-relaxed">
            • <strong>Fuera de Blockchain (Privado y Local):</strong> Nombres personales de estudiantes, números de cédula, perfiles y expedientes académicos se mantienen en almacenamiento seguro fuera de la cadena para garantizar la protección de datos personales.
          </p>
        </div>
      </div>

      {/* Barra de Acciones y Contadores */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">Historial y Auditoría Blockchain</h2>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold border border-emerald-200">
                {onChainEvents.length} Eventos On-Chain
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Red activa: Chain ID {effectiveChainId} • Eventos verificados en bloques
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchOnChainEvents}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            title="Refrescar eventos de la blockchain"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingOnChain ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={allTransactions.length === 0}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            disabled={allTransactions.length === 0}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
          <button
            onClick={handleClearLocal}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold transition-colors"
            title="Limpiar registros locales de sesión"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Controles de Filtros por Origen y Módulo */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Selector de Origen de Datos */}
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            {[
              { id: 'all', label: `Todos (${allTransactions.length})` },
              { id: 'onchain', label: `On-Chain (${onChainEvents.length})` },
              { id: 'local', label: `Sesión Local (${localTransactions.length})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveSourceTab(t.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeSourceTab === t.id
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Filtro por Módulo */}
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            {[
              { id: 'all', label: 'Todos los Módulos' },
              { id: 'Escrow', label: 'Contratos Escrow' },
              { id: 'UPECT', label: 'Moneda UPECT' },
              { id: 'Titulacion', label: 'Titulación & NFT' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setFilterModule(m.id)}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                  filterModule === m.id
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Buscador */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por hash, evento o dirección..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Tabla de Eventos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <History className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-xs font-medium">No se encontraron eventos o transacciones con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Evento / Operación</th>
                  <th className="py-3 px-4">Origen</th>
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4">Tx Hash</th>
                  <th className="py-3 px-4">Involucrado</th>
                  <th className="py-3 px-4">Bloque</th>
                  <th className="py-3 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          tx.module?.includes('UPECT')
                            ? 'bg-amber-100 text-amber-700'
                            : tx.module?.includes('Escrow')
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {tx.module?.includes('UPECT') ? (
                            <Coins className="w-4 h-4" />
                          ) : tx.module?.includes('Escrow') ? (
                            <FileSignature className="w-4 h-4" />
                          ) : (
                            <Award className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800 block">{tx.description}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Evento: {tx.type}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {tx.source === 'ON_CHAIN' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-max">
                          <Layers className="w-3 h-3" /> On-Chain
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 w-max">
                          <Database className="w-3 h-3" /> Sesión Local
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {tx.module || 'Blockchain'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-700">{tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}</span>
                        <button
                          onClick={() => handleCopy(tx.hash)}
                          className="hover:text-emerald-600 text-slate-400"
                          title="Copiar Hash"
                        >
                          {copiedHash === tx.hash ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-500">
                      {tx.from ? `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}` : '0x...'}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600">
                      {tx.blockNumber ? `#${tx.blockNumber}` : 'Local'}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Confirmado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
