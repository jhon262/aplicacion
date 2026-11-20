import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Layers,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FileCode2,
  Terminal,
  ArrowRightLeft,
  Globe,
  Loader2,
} from 'lucide-react';
import { usePublicClient, useChainId, useSwitchChain } from 'wagmi';
import {
  ALL_CONTRACTS,
  CONTRACT_ADDRESSES,
  UPEC_TOKEN_ADDRESSES,
  ESCROW_ADDRESSES,
  DEFAULT_CONTRACT_ADDRESS,
  DEFAULT_UPEC_TOKEN_ADDRESS,
  DEFAULT_ESCROW_ADDRESS,
} from '../../contracts/config.js';

export default function NetworkStatusView({ currentTheme, setNotification }) {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const [blockNumber, setBlockNumber] = useState(null);
  const [gasPrice, setGasPrice] = useState(null);
  const [isRpcOnline, setIsRpcOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedText, setCopiedText] = useState(null);

  const effectiveChainId = chainId || 1337;
  const isSepolia = effectiveChainId === 11155111;
  const isHardhat = effectiveChainId === 1337 || effectiveChainId === 31337;

  const rpcUrl = isSepolia ? 'https://ethereum-sepolia-rpc.publicnode.com' : 'http://127.0.0.1:8545';

  const registryAddr = CONTRACT_ADDRESSES[effectiveChainId] || DEFAULT_CONTRACT_ADDRESS;
  const tokenAddr = UPEC_TOKEN_ADDRESSES[effectiveChainId] || DEFAULT_UPEC_TOKEN_ADDRESS;
  const escrowAddr = ESCROW_ADDRESSES[effectiveChainId] || DEFAULT_ESCROW_ADDRESS;

  const getExplorerUrl = (addr) => {
    if (isSepolia) return `https://sepolia.etherscan.io/address/${addr}`;
    return null;
  };

  const contractsList = [
    {
      name: 'ProjectRegistry.sol',
      tag: 'Titulación & DAO & NFT',
      standard: 'ERC-721 URIStorage + Ownable',
      address: typeof registryAddr === 'object' && registryAddr?.registry ? registryAddr.registry : registryAddr,
      desc: 'Contrato maestro de registro de tesis, votación del tribunal evaluador y emisión de certificados de demostración NFT.',
      methods: ['registerProject', 'vote', 'finalizeProject', 'getAllProjects', 'tokenURI'],
    },
    {
      name: 'UPECToken.sol',
      tag: 'Moneda UPEC Demo',
      standard: 'ERC-20 + AccessControl',
      address: typeof tokenAddr === 'object' && tokenAddr?.upectToken ? tokenAddr.upectToken : tokenAddr,
      desc: 'Token académico fungible con grifo (faucet) controlado por tiempo y emisión restringida sin valor monetario real.',
      methods: ['requestFaucetTokens', 'transfer', 'approve', 'balanceOf', 'faucetAmount', 'getRemainingFaucetCooldown'],
    },
    {
      name: 'PurchaseEscrow.sol',
      tag: 'Custodia & Escrow',
      standard: 'PurchaseEscrow + SafeERC20 + ReentrancyGuard',
      address: typeof escrowAddr === 'object' && escrowAddr?.escrow ? escrowAddr.escrow : escrowAddr,
      desc: 'Smart contract de custodia descentralizada para acuerdos de compraventa con mediación académica y plazo de inspección.',
      methods: ['createAgreement', 'acceptAgreement', 'depositEscrow', 'registerDelivery', 'confirmReceipt', 'releasePaymentTimeout', 'cancelAndRefund', 'raiseDispute', 'resolveDispute'],
    },
  ];

  const fetchNetworkStats = async () => {
    setIsLoading(true);
    try {
      if (publicClient) {
        const block = await publicClient.getBlockNumber();
        setBlockNumber(Number(block));

        const gp = await publicClient.getGasPrice();
        setGasPrice(Number(gp));
        setIsRpcOnline(true);
      } else {
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
        });
        const data = await res.json();
        if (data.result) {
          setBlockNumber(parseInt(data.result, 16));
          setIsRpcOnline(true);
        }
      }
    } catch (err) {
      console.warn('Error fetching RPC stats:', err);
      setIsRpcOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkStats();
    const interval = setInterval(fetchNetworkStats, 5000);
    return () => clearInterval(interval);
  }, [publicClient, effectiveChainId]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSwitchNetwork = async (targetChainId) => {
    if (!switchChain) {
      if (setNotification) {
        setNotification({
          type: 'error',
          message: 'Tu billetera no admite el cambio automático de red. Cámbiala directamente desde MetaMask.',
        });
      }
      return;
    }
    try {
      await switchChain({ chainId: targetChainId });
      if (setNotification) {
        setNotification({
          type: 'success',
          message: `Cambiando a red Chain ID ${targetChainId}...`,
        });
      }
    } catch (err) {
      if (setNotification) {
        setNotification({
          type: 'error',
          message: err.shortMessage || err.message || 'Error al cambiar de red.',
        });
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Banner de Aviso Académico */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-amber-900">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs sm:text-sm">
          <p className="font-semibold text-amber-800">
            Monitor de Conectividad Blockchain — Redes Soportadas UPEC
          </p>
          <p className="text-amber-700 mt-0.5">
            El sistema soporta tanto la red de investigación local Hardhat (Chain ID 1337) como la red pública de pruebas Ethereum Sepolia (Chain ID 11155111). Las operaciones en Sepolia requieren ETH de prueba exclusivamente para el gas.
          </p>
        </div>
      </div>

      {/* Selector Rápido de Red Blockchain */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Red Conectada en MetaMask</h3>
            <p className="text-xs text-slate-500">
              {isSepolia
                ? 'Ethereum Sepolia Testnet (Pública)'
                : isHardhat
                ? 'Hardhat Localhost (Investigación UPEC)'
                : `Red Desconocida (Chain ID: ${effectiveChainId})`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handleSwitchNetwork(1337)}
            disabled={isHardhat || isSwitching}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isHardhat
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold cursor-default'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Hardhat Local (1337)</span>
            {isHardhat && <Check className="w-3.5 h-3.5 text-emerald-700" />}
          </button>

          <button
            onClick={() => handleSwitchNetwork(11155111)}
            disabled={isSepolia || isSwitching}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isSepolia
                ? 'bg-purple-100 text-purple-800 border border-purple-300 font-bold cursor-default'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            {isSwitching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            <span>Sepolia Testnet (11155111)</span>
            {isSepolia && <Check className="w-3.5 h-3.5 text-purple-700" />}
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Red */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RPC Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Estado del Nodo</span>
            <span className="text-lg font-bold text-slate-800 flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${isRpcOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              {isRpcOnline ? 'Conectado (Online)' : 'Desconectado'}
            </span>
            <span className="text-[11px] font-mono text-slate-400 mt-0.5 block truncate max-w-[170px]" title={rpcUrl}>
              {rpcUrl}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
        </div>

        {/* Chain ID */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Chain ID Activo</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block">
              {effectiveChainId}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {isSepolia ? 'Ethereum Sepolia' : '0x539 (Hardhat Local)'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Último Bloque */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Último Bloque</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block font-mono">
              #{blockNumber !== null ? blockNumber.toLocaleString() : '...'}
            </span>
            <span className="text-[11px] text-slate-400">
              {isSepolia ? 'Consenso PoS Ethereum' : 'Minado automine'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Gas Price */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Precio de Gas</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block font-mono">
              {gasPrice !== null ? `${(gasPrice / 1e9).toFixed(2)} Gwei` : '0 Gwei'}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">
              {isSepolia ? 'Tarifa dinámica EIP-1559' : 'Tarifa cero para pruebas'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Catálogo de Contratos Inteligentes Desplegados */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Smart Contracts Desplegados y Verificados</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Direcciones canónicas exportadas en <code>client/src/contracts/config.js</code>
            </p>
          </div>
          <button
            onClick={fetchNetworkStats}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar Estado</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {contractsList.map((c, idx) => {
            const explorerLink = getExplorerUrl(c.address);
            const isZeroAddr = !c.address || c.address === '0x0000000000000000000000000000000000000000';

            return (
              <div
                key={idx}
                className="p-5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl space-y-3 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-[11px] font-semibold">
                      {c.tag}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md text-[10px] font-mono">
                      {c.standard}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200">
                    <span className="text-slate-400">Dir:</span>
                    <span className={`font-semibold ${isZeroAddr ? 'text-amber-600' : 'text-slate-900'}`}>
                      {isZeroAddr ? 'Pendiente en Sepolia' : c.address}
                    </span>
                    {!isZeroAddr && (
                      <button
                        onClick={() => handleCopy(c.address)}
                        className="hover:text-emerald-600 ml-1 transition-colors"
                        title="Copiar dirección"
                      >
                        {copiedText === c.address ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                    )}
                    {explorerLink && !isZeroAddr && (
                      <a
                        href={explorerLink}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-emerald-600 ml-1 transition-colors"
                        title="Ver en Etherscan Sepolia"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </a>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{c.desc}</p>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Funciones Principales ({c.methods.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {c.methods.map((m, mIdx) => (
                      <span
                        key={mIdx}
                        className="px-2 py-0.5 bg-white text-slate-700 font-mono text-[10px] rounded border border-slate-200"
                      >
                        {m}()
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
