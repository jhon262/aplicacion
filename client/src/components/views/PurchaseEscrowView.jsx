import React, { useState } from 'react';
import {
  FileSignature,
  PlusCircle,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Coins,
  ArrowRight,
  ExternalLink,
  Loader2,
  Scale,
  RefreshCw,
  Search,
  Filter,
  Check,
  Copy,
  AlertCircle,
  UserCheck,
  PackageCheck,
  Send,
  Eye,
  FileText,
  BadgeAlert,
  Printer,
  Download,
} from 'lucide-react';
import { usePurchaseEscrow, ESCROW_STATES } from '../../hooks/usePurchaseEscrow.js';
import { useAccount, useChainId } from 'wagmi';

export default function PurchaseEscrowView({
  currentTheme,
  userAddress,
  formatAddress,
  setNotification,
}) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const {
    escrowAddress,
    tokenAddress,
    agreements,
    isLoadingAgreements,
    fetchAllAgreements,
    isMediator,
    isActionPending,
    actionError,
    lastTxHash,
    createAgreement,
    acceptAgreement,
    depositEscrow,
    registerDelivery,
    confirmReceipt,
    releasePaymentTimeout,
    cancelAndRefund,
    raiseDispute,
    resolveDispute,
  } = usePurchaseEscrow();

  // Estados de filtros
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'mine', 'funded', 'completed', 'disputed', 'cancelled'
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isMediationModalOpen, setIsMediationModalOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState(null);

  // Formularios de modales
  const [newSeller, setNewSeller] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newConditions, setNewConditions] = useState('');

  const [deliveryCID, setDeliveryCID] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [buyerPercent, setBuyerPercent] = useState('50');
  const [sellerPercent, setSellerPercent] = useState('50');

  const [copiedText, setCopiedText] = useState(null);
  const [localFeedback, setLocalFeedback] = useState(null);

  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [docAgreement, setDocAgreement] = useState(null);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handlePrintDocument = (agreement) => {
    if (!agreement) return;
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      alert('Por favor permite ventanas emergentes en tu navegador para generar el documento imprimible/PDF.');
      return;
    }
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Acta de Acuerdo Ricardiano Web3 #${agreement.id} - UPEC</title>
        <style>
          @page { size: A4; margin: 18mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            line-height: 1.55;
            margin: 0;
            padding: 24px;
            background: #fff;
          }
          .header {
            text-align: center;
            border-bottom: 3px double #047857;
            padding-bottom: 16px;
            margin-bottom: 22px;
          }
          .logo-badge {
            display: inline-block;
            background: #065f46;
            color: #fef3c7;
            font-weight: 800;
            font-size: 13px;
            letter-spacing: 2px;
            padding: 5px 16px;
            border-radius: 9999px;
            margin-bottom: 8px;
          }
          .title-inst {
            font-size: 17px;
            font-weight: 800;
            color: #065f46;
            text-transform: uppercase;
            margin: 0;
          }
          .subtitle {
            font-size: 12.5px;
            color: #475569;
            margin: 4px 0 0;
          }
          .doc-type {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 14px;
            letter-spacing: 0.5px;
          }
          .badge-status {
            display: inline-block;
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 12px;
            border-radius: 6px;
            margin-top: 6px;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
            font-size: 12px;
          }
          .meta-table td {
            padding: 7px 12px;
            border: 1px solid #e2e8f0;
          }
          .meta-table td.label {
            background: #f8fafc;
            font-weight: 700;
            width: 32%;
            color: #334155;
          }
          .clause {
            margin-bottom: 15px;
            font-size: 12px;
            text-align: justify;
          }
          .clause-title {
            font-weight: 700;
            color: #065f46;
            text-transform: uppercase;
            font-size: 11.5px;
            margin-bottom: 3px;
          }
          .hash-box {
            background: #f8fafc;
            border: 1px dashed #cbd5e1;
            padding: 6px 10px;
            font-family: monospace;
            font-size: 11px;
            word-break: break-all;
            border-radius: 6px;
            margin: 5px 0;
            color: #047857;
          }
          .signatures {
            margin-top: 32px;
            display: flex;
            justify-content: space-between;
            gap: 16px;
          }
          .sig-box {
            flex: 1;
            border-top: 1.5px solid #0f172a;
            padding-top: 8px;
            text-align: center;
            font-size: 10.5px;
          }
          .sig-box .role {
            font-weight: 700;
            color: #0f172a;
          }
          .sig-box .address {
            font-family: monospace;
            color: #64748b;
            font-size: 9px;
            margin-top: 3px;
            word-break: break-all;
          }
          .disclaimer {
            margin-top: 24px;
            padding: 9px 12px;
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 6px;
            font-size: 10px;
            color: #92400e;
            text-align: center;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; text-align: right;">
          <button onclick="window.print()" style="background: #047857; color: white; border: none; padding: 8px 18px; font-weight: 600; border-radius: 8px; cursor: pointer; font-size: 13px;">
            🖨️ Imprimir / Guardar como PDF
          </button>
        </div>

        <div class="header">
          <div class="logo-badge">UNIVERSIDAD POLITÉCNICA ESTATAL DEL CARCHI</div>
          <h1 class="title-inst">Facultad de Industrias Agropecuarias y Ciencias Ambientales</h1>
          <p class="subtitle">Investigación en Arquitecturas Web3 y Smart Contracts Descentralizados</p>
          <div class="doc-type">ACTA DE ACUERDO RICARDIANO Y LIQUIDACIÓN EN BLOCKCHAIN</div>
          <div class="badge-status">ESTADO ON-CHAIN: ${agreement.stateMeta?.label?.toUpperCase() || 'REGISTRADO'}</div>
        </div>

        <table class="meta-table">
          <tr>
            <td class="label">Identificador del Acuerdo:</td>
            <td><strong>Acuerdo Académico #${agreement.id}</strong></td>
          </tr>
          <tr>
            <td class="label">Título / Objeto del Acuerdo:</td>
            <td><strong>${agreement.title}</strong></td>
          </tr>
          <tr>
            <td class="label">Monto en Garantía Escrow:</td>
            <td><strong>${agreement.amount} UPECT</strong> (UPEC Token Demo ERC-20)</td>
          </tr>
          <tr>
            <td class="label">Contrato Escrow Descentralizado:</td>
            <td style="font-family: monospace; font-size: 11px;">0xdc64a140aa3e981100a9beca4e685f962f0cf6c9</td>
          </tr>
          <tr>
            <td class="label">Red Blockchain:</td>
            <td>Red Académica UPEC (Chain ID 1337 / Hardhat) / Sepolia Testnet</td>
          </tr>
        </table>

        <div class="clause">
          <div class="clause-title">Cláusula Primera: Objeto y Naturaleza Ricardiana</div>
          El presente acuerdo formaliza las condiciones académicas, compromisos de entrega y especificaciones técnicas pactadas entre las partes contratantes, vinculando la voluntad expresada con la ejecución determinista del Smart Contract de Custodia Descentralizada (PurchaseEscrow.sol).
        </div>

        <div class="clause">
          <div class="clause-title">Cláusula Segunda: Partes Contratantes (Identidad Web3)</div>
          <strong>Parte Compradora (Pagador):</strong> Billetera digital <span style="font-family: monospace;">${agreement.buyer}</span>.<br/>
          <strong>Parte Vendedora (Beneficiario):</strong> Billetera digital <span style="font-family: monospace;">${agreement.seller}</span>.
        </div>

        <div class="clause">
          <div class="clause-title">Cláusula Tercera: Integridad de Términos (Hash IPFS)</div>
          Las condiciones y especificaciones del producto o servicio se encuentran inmutables mediante el identificador criptográfico descentralizado:
          <div class="hash-box"><strong>IPFS Terms Hash:</strong> ${agreement.conditionHash || 'Sin hash provisto'}</div>
        </div>

        <div class="clause">
          <div class="clause-title">Cláusula Cuarta: Evidencia de Entrega y Liquidación</div>
          ${agreement.deliveryEvidenceCID ? `
            La contraparte vendedora acreditó formalmente la entrega del entregable académico bajo el siguiente identificador verificable:
            <div class="hash-box"><strong>IPFS Delivery CID:</strong> ${agreement.deliveryEvidenceCID}</div>
            Cumplida la conformidad del comprador o vencido el plazo de inspección sin disputas, el contrato inteligente liberó de manera irrevocable los <strong>${agreement.amount} UPECT</strong> al beneficiario.
          ` : `
            El acuerdo se encuentra en etapa de ejecución o custodia. La entrega final deberá acreditarse registrando el CID de IPFS correspondiente en el Smart Contract.
          `}
        </div>

        <div class="clause">
          <div class="clause-title">Cláusula Quinta: Jurisdicción Algorítmica y Arbitraje</div>
          Las partes reconocen que la custodia, retención y transferencia de los fondos están gobernadas de forma automatizada por el código del contrato inteligente. Cualquier discrepancia previa a la liberación es sometida a Mediación Académica de Demostración.
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="role">FIRMA DIGITAL - COMPRADOR</div>
            <div style="font-size: 10px; margin-top: 2px;">Validado vía MetaMask / Web3</div>
            <div class="address">${agreement.buyer}</div>
          </div>
          <div class="sig-box">
            <div class="role">FIRMA DIGITAL - VENDEDOR</div>
            <div style="font-size: 10px; margin-top: 2px;">Validado vía MetaMask / Web3</div>
            <div class="address">${agreement.seller}</div>
          </div>
          <div class="sig-box">
            <div class="role">SELLO DE INTEGRIDAD ON-CHAIN</div>
            <div style="font-size: 10px; margin-top: 2px;">Contrato PurchaseEscrow.sol</div>
            <div class="address">0xdc64...0cF6C9</div>
          </div>
        </div>

        <div class="disclaimer">
          <strong>Aviso de Prototipo Académico:</strong> Este documento y las transacciones asociadas forman parte de un prototipo experimental de tesis de la Universidad Politécnica Estatal del Carchi (UPEC). Carece de efectos mercantiles o de contratación pública oficial.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          }
        </script>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Cuentas académicas sugeridas
  const suggestedSellers = [
    { label: 'Docente Evaluador (Cuenta #2)', address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', desc: 'Asesoría y Revisión Técnica', defaultTitle: 'Servicio de Asesoría y Revisión Técnica de Tesis', defaultPrice: '50' },
    { label: 'Investigador Posgrado (Cuenta #3)', address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', desc: 'Licencia de Dataset Académico', defaultTitle: 'Licencia de Uso de Dataset Académico Especializado', defaultPrice: '30' },
    { label: 'Laboratorio de Cómputo (Cuenta #4)', address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', desc: 'Servicios de Computación en la Nube', defaultTitle: 'Acceso a Servidor de Cómputo y Entrenamiento GPU', defaultPrice: '80' },
  ];

  const activeWallet = (typeof window !== 'undefined' && window.ethereum?.selectedAddress) || address;
  const isSelfSeller = Boolean(newSeller && activeWallet && newSeller.toLowerCase() === activeWallet.toLowerCase());

  const handleSelectSuggestedSeller = (s) => {
    setNewSeller(s.address);
    if (!newTitle.trim() && s.defaultTitle) {
      setNewTitle(s.defaultTitle);
    }
    if (!newAmount.trim() && s.defaultPrice) {
      setNewAmount(s.defaultPrice);
    }
  };

  // Manejadores de acciones
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setLocalFeedback(null);
    try {
      const res = await createAgreement(newSeller, newAmount, newTitle, newConditions);
      setIsCreateModalOpen(false);
      setNewSeller('');
      setNewAmount('');
      setNewTitle('');
      setNewConditions('');
      setLocalFeedback({
        type: 'success',
        title: 'Propuesta de Compraventa Registrada',
        message: `El contrato fue emitido on-chain con Tx Hash: ${res.hash.slice(0, 14)}...`,
      });
      if (setNotification) {
        setNotification({
          type: 'success',
          message: 'Propuesta de compraventa creada exitosamente en bloque.',
        });
      }
    } catch (err) {
      setLocalFeedback({
        type: 'error',
        title: 'Error al Crear Propuesta',
        message: err.message,
      });
    }
  };

  const handleAccept = async (agId) => {
    setLocalFeedback(null);
    try {
      const res = await acceptAgreement(agId);
      setLocalFeedback({
        type: 'success',
        title: 'Acuerdo Aceptado',
        message: `El acuerdo #${agId} fue aceptado exitosamente.`,
      });
    } catch (err) {
      setLocalFeedback({ type: 'error', title: 'Error al Aceptar', message: err.message });
    }
  };

  const handleDeposit = async (agId, amount) => {
    setLocalFeedback(null);
    try {
      const res = await depositEscrow(agId, amount);
      setLocalFeedback({
        type: 'success',
        title: 'Fondos en Custodia Garantizada',
        message: `Se bloquearon ${amount} UPECT en el Smart Contract Escrow para el Acuerdo #${agId}.`,
      });
    } catch (err) {
      setLocalFeedback({ type: 'error', title: 'Error al Depositar Fondos', message: err.message });
    }
  };

  const handleDeliverySubmit = async (e) => {
    e.preventDefault();
    if (!selectedAgreement) return;
    setLocalFeedback(null);
    try {
      const res = await registerDelivery(selectedAgreement.id, deliveryCID);
      setIsDeliveryModalOpen(false);
      setDeliveryCID('');
      setSelectedAgreement(null);
      setLocalFeedback({
        type: 'success',
        title: 'Entrega Registrada en Blockchain',
        message: `Se inició el plazo de inspección de 3 días para el Acuerdo #${selectedAgreement.id}.`,
      });
    } catch (err) {
      setLocalFeedback({ type: 'error', title: 'Error al Registrar Entrega', message: err.message });
    }
  };

  const handleConfirmReceipt = async (agId) => {
    setLocalFeedback(null);
    try {
      const res = await confirmReceipt(agId);
      setLocalFeedback({
        type: 'success',
        title: 'Recepción Confirmada y Pago Liberado',
        message: `Los fondos fueron transferidos automáticamente al vendedor on-chain.`,
      });
    } catch (err) {
      setLocalFeedback({ type: 'error', title: 'Error al Confirmar Recepción', message: err.message });
    }
  };

  const handleReleaseTimeout = async (agId) => {
    setLocalFeedback(null);
    try {
      const res = await releasePaymentTimeout(agId);
      setLocalFeedback({
        type: 'success',
        title: 'Fondos Liberados por Plazo Vencido',
        message: `El plazo de inspección de 3 días concluyó sin disputas; el pago fue liberado.`,
      });
    } catch (err) {
      setLocalFeedback({ type: 'error', title: 'Error en Liberación Automática', message: err.message });
    }
  };

  const handleCancel = async (agId) => {
    setLocalFeedback(null);
    try {
      const res = await cancelAndRefund(agId);
      setLocalFeedback({
        type: 'success',
        title: 'Acuerdo Cancelado',
        message: `El acuerdo #${agId} fue cancelado y los fondos reembolsados si correspondía.`,
      });
    } catch (err) {
      setLocalFeedback({ type: 'error', title: 'Error al Cancelar', message: err.message });
    }
  };

  const handleDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAgreement) return;
    setLocalFeedback(null);
    try {
      const res = await raiseDispute(selectedAgreement.id, disputeReason);
      setIsDisputeModalOpen(false);
      setDisputeReason('');
      setSelectedAgreement(null);
      setLocalFeedback({
        type: 'success',
        title: 'Disputa Académica Iniciada',
        message: `El acuerdo pasó al estado de disputa y será revisado por el Mediador Académico.`,
      });
    } catch (err) {
      setLocalFeedback({ type: 'error', title: 'Error al Iniciar Disputa', message: err.message });
    }
  };

  const handleMediationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAgreement) return;
    setLocalFeedback(null);
    try {
      const res = await resolveDispute(selectedAgreement.id, buyerPercent, sellerPercent);
      setIsMediationModalOpen(false);
      setSelectedAgreement(null);
      setLocalFeedback({
        type: 'success',
        title: 'Mediación Académica de Demostración Aplicada',
        message: `La disputa fue resuelta on-chain distribuyendo ${buyerPercent}% al comprador y ${sellerPercent}% al vendedor.`,
      });
    } catch (err) {
      setLocalFeedback({ type: 'error', title: 'Error en Resolución de Mediación', message: err.message });
    }
  };

  // Filtrado de acuerdos
  const filteredAgreements = agreements.filter((ag) => {
    // Filtro por pestaña
    if (filterTab === 'mine') {
      const isMine =
        (address && ag.buyer.toLowerCase() === address.toLowerCase()) ||
        (address && ag.seller.toLowerCase() === address.toLowerCase());
      if (!isMine) return false;
    } else if (filterTab === 'funded' && ag.state !== 2 && ag.state !== 3) {
      return false;
    } else if (filterTab === 'completed' && ag.state !== 4) {
      return false;
    } else if (filterTab === 'disputed' && ag.state !== 5) {
      return false;
    } else if (filterTab === 'cancelled' && ag.state !== 6 && ag.state !== 7) {
      return false;
    }

    // Búsqueda por texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ag.title?.toLowerCase().includes(q);
      const matchId = String(ag.id) === q;
      const matchBuyer = ag.buyer?.toLowerCase().includes(q);
      const matchSeller = ag.seller?.toLowerCase().includes(q);
      return matchTitle || matchId || matchBuyer || matchSeller;
    }

    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Banner de Aviso Académico */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-amber-900">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs sm:text-sm">
          <p className="font-semibold text-amber-800">
            Contratos de Compraventa y Custodia Descentralizada (Escrow) — UPEC
          </p>
          <p className="text-amber-700 mt-0.5">
            Módulo de acuerdos bilaterales garantizados por el contrato inteligente <code>PurchaseEscrow.sol</code>. Los fondos permanecen bloqueados en custodia auditable hasta la confirmación de la entrega o resolución por mediación académica de demostración. Sin valor monetario real.
          </p>
        </div>
      </div>

      {/* Encabezado con Botón de Creación */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Acuerdos de Compraventa</h2>
              <p className="text-xs text-slate-500">
                Garantía y entrega condicionada sobre la red Hardhat (Chain ID 1337)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => fetchAllAgreements()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
            title="Refrescar acuerdos desde blockchain"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingAgreements ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nueva Propuesta</span>
          </button>
        </div>
      </div>

      {/* Feedback contextual de transacciones */}
      {localFeedback && (
        <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs sm:text-sm animate-fadeIn ${
          localFeedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <div className="flex items-start gap-2.5">
            {localFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{localFeedback.title}</p>
              <p className="mt-0.5 text-xs opacity-90">{localFeedback.message}</p>
            </div>
          </div>
          <button
            onClick={() => setLocalFeedback(null)}
            className="font-bold text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Pestañas de estado */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'mine', label: 'Mis Acuerdos' },
            { id: 'funded', label: 'En Custodia' },
            { id: 'completed', label: 'Completados' },
            { id: 'disputed', label: 'En Disputa' },
            { id: 'cancelled', label: 'Cancelados' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === tab.id
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por ID, título o billetera..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Lista de Acuerdos */}
      {isLoadingAgreements ? (
        <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-600 mb-2" />
          <p className="text-xs font-medium">Consultando registros inmutables de PurchaseEscrow...</p>
        </div>
      ) : filteredAgreements.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <FileSignature className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
          <h3 className="text-base font-bold text-slate-700">No se encontraron acuerdos</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? 'No hay contratos de compraventa que coincidan con tu búsqueda.'
              : 'Aún no se han registrado acuerdos de compraventa en este estado. Pulsa "+ Nueva Propuesta" para formalizar el primero.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredAgreements.map((ag) => {
            const isBuyer = address && ag.buyer.toLowerCase() === address.toLowerCase();
            const isSeller = address && ag.seller.toLowerCase() === address.toLowerCase();

            // Cálculo del plazo de inspección (3 días = 259,200 segundos)
            const INSPECTION_SECONDS = 3 * 24 * 3600;
            const now = Math.floor(Date.now() / 1000);
            const inspectionDeadline = ag.deliveredAt > 0 ? ag.deliveredAt + INSPECTION_SECONDS : 0;
            const isInspectionPassed = ag.deliveredAt > 0 && now >= inspectionDeadline;
            const inspectionHoursLeft = inspectionDeadline > now ? Math.round((inspectionDeadline - now) / 3600) : 0;

            return (
              <div
                key={ag.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Cabecera de la tarjeta */}
                <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-200 text-slate-800 rounded-lg">
                      Acuerdo #{ag.id}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ag.stateMeta.color}`}>
                      {ag.stateMeta.label}
                    </span>
                  </div>

                  {/* Insignia de Rol del Usuario Actual */}
                  <div className="flex items-center gap-2">
                    {isBuyer && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" /> Eres el Comprador
                      </span>
                    )}
                    {isSeller && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <PackageCheck className="w-3.5 h-3.5" /> Eres el Vendedor
                      </span>
                    )}
                    {!isBuyer && !isSeller && isMediator && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5" /> Mediador Académico
                      </span>
                    )}
                  </div>
                </div>

                {/* Contenido de la tarjeta */}
                <div className="p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{ag.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span>Condiciones / Hash:</span>
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {ag.conditionHash || 'Sin hash especificado'}
                        </span>
                      </div>
                    </div>

                    {/* Monto en UPECT */}
                    <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl flex items-center gap-2.5 self-start md:self-auto">
                      <Coins className="w-5 h-5 text-emerald-600" />
                      <div>
                        <span className="text-xs text-emerald-700 font-semibold block">Garantía Escrow</span>
                        <span className="text-lg font-extrabold text-emerald-900">{ag.amount} UPECT</span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progreso del Ciclo de Vida del Acuerdo */}
                  <div className="py-2">
                    <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] sm:text-xs font-semibold">
                      {[
                        { step: 0, label: '1. Creado', active: ag.state >= 0 },
                        { step: 1, label: '2. Aceptado', active: ag.state >= 1 && ag.state !== 7 },
                        { step: 2, label: '3. En Custodia', active: ag.state >= 2 && ag.state !== 6 && ag.state !== 7 },
                        { step: 3, label: '4. Entregado', active: ag.state >= 3 && ag.state !== 6 && ag.state !== 7 },
                        { step: 4, label: '5. Liberado', active: ag.state === 4 },
                      ].map((s, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                          <div
                            className={`w-full h-1.5 rounded-full mb-1 transition-all ${
                              ag.state === 5
                                ? 'bg-rose-400'
                                : ag.state === 6 || ag.state === 7
                                ? 'bg-slate-300'
                                : s.active
                                ? 'bg-emerald-600'
                                : 'bg-slate-200'
                            }`}
                          />
                          <span className={s.active ? 'text-slate-800' : 'text-slate-400'}>
                            {s.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Datos de Comprador y Vendedor */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block mb-1">Comprador (Pagador):</span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-800">{ag.buyer.slice(0, 10)}...{ag.buyer.slice(-8)}</span>
                        <button
                          onClick={() => handleCopy(ag.buyer)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block mb-1">Vendedor (Beneficiario):</span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-800">{ag.seller.slice(0, 10)}...{ag.seller.slice(-8)}</span>
                        <button
                          onClick={() => handleCopy(ag.seller)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Información específica si está entregado */}
                  {ag.state === 3 && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs flex items-start justify-between gap-3 text-amber-900">
                      <div>
                        <p className="font-bold">Entrega Registrada On-Chain</p>
                        <p className="text-[11px] font-mono text-amber-800 mt-0.5">
                          Hash de Entrega: {ag.deliveryEvidenceCID || 'CID verificado'}
                        </p>
                        <p className="text-[11px] text-amber-700 mt-1">
                          {isInspectionPassed
                            ? 'Plazo de inspección de 3 días finalizado. El pago puede ser liberado.'
                            : `Plazo de inspección en curso: ~${inspectionHoursLeft} horas restantes para revisar conformidad.`}
                        </p>
                      </div>
                      <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    </div>
                  )}

                  {/* Información específica si está en disputa */}
                  {ag.state === 5 && (
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs flex items-start gap-3 text-rose-900">
                      <BadgeAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Disputa Académica en Mediación</p>
                        <p className="text-[11px] text-rose-800 mt-0.5">
                          Motivo alegado: "{ag.disputeReason || 'Disconformidad con las condiciones del acuerdo'}"
                        </p>
                        <p className="text-[11px] text-rose-700 mt-1">
                          Un mediador académico autorizado evaluará los antecedentes y determinará la distribución de los fondos mediante arbitraje descentralizado.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Botones de Acción Contextuales */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                    {/* Botón común para ver y descargar el Acta Ricardiana en PDF */}
                    <button
                      type="button"
                      onClick={() => {
                        setDocAgreement(ag);
                        setIsDocumentModalOpen(true);
                      }}
                      className="px-3 py-1.5 border border-emerald-200 hover:border-emerald-400 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                      title="Ver y descargar documento del contrato (Acta Ricardiana PDF)"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Acta Ricardiana (PDF)</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Estado 0: Created */}
                    {ag.state === 0 && (
                      <>
                        <button
                          onClick={() => handleCancel(ag.id)}
                          disabled={isActionPending || (!isBuyer && !isSeller)}
                          className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                        >
                          Cancelar Propuesta
                        </button>
                        {(isBuyer || isSeller) && (
                          <button
                            onClick={() => handleAccept(ag.id)}
                            disabled={isActionPending}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                          >
                            {isActionPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Aceptar Acuerdo</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Estado 1: Accepted */}
                    {ag.state === 1 && (
                      <>
                        <button
                          onClick={() => handleCancel(ag.id)}
                          disabled={isActionPending || (!isBuyer && !isSeller)}
                          className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                        >
                          Cancelar
                        </button>
                        {isBuyer && (
                          <button
                            onClick={() => handleDeposit(ag.id, ag.amount)}
                            disabled={isActionPending}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                          >
                            {isActionPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Coins className="w-3.5 h-3.5" />}
                            <span>Depositar {ag.amount} UPECT en Custodia</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Estado 2: Funded */}
                    {ag.state === 2 && (
                      <>
                        {(isBuyer || isSeller) && (
                          <button
                            onClick={() => {
                              setSelectedAgreement(ag);
                              setIsDisputeModalOpen(true);
                            }}
                            disabled={isActionPending}
                            className="px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Abrir Disputa</span>
                          </button>
                        )}
                        {isSeller && (
                          <button
                            onClick={() => {
                              setSelectedAgreement(ag);
                              setIsDeliveryModalOpen(true);
                            }}
                            disabled={isActionPending}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Registrar Entrega (IPFS/Hash)</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Estado 3: Delivered */}
                    {ag.state === 3 && (
                      <>
                        {(isBuyer || isSeller) && (
                          <button
                            onClick={() => {
                              setSelectedAgreement(ag);
                              setIsDisputeModalOpen(true);
                            }}
                            disabled={isActionPending}
                            className="px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Iniciar Disputa</span>
                          </button>
                        )}
                        {isBuyer && (
                          <button
                            onClick={() => handleConfirmReceipt(ag.id)}
                            disabled={isActionPending}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                          >
                            {isActionPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>Confirmar Conformidad y Liberar Pago</span>
                          </button>
                        )}
                        {isInspectionPassed && (
                          <button
                            onClick={() => handleReleaseTimeout(ag.id)}
                            disabled={isActionPending}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Liberar por Plazo Vencido</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Estado 5: Disputed (Mediación académica de demostración) */}
                    {ag.state === 5 && isMediator && (
                      <button
                        onClick={() => {
                          setSelectedAgreement(ag);
                          setIsMediationModalOpen(true);
                        }}
                        disabled={isActionPending}
                        className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>Ejecutar Mediación Académica</span>
                      </button>
                    )}

                    {/* Estado 4: Completed */}
                    {ag.state === 4 && (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Acuerdo Liquidado Exitosamente
                      </span>
                    )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CREAR PROPUESTA DE COMPRAVENTA                  */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-800">Nueva Propuesta de Compraventa</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Título del Acuerdo o Servicio Académico
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Licencia de Software de Investigación en Criptografía"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Dirección del Vendedor (Ethereum / Hardhat)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
                  value={newSeller}
                  onChange={(e) => setNewSeller(e.target.value.trim())}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono text-xs focus:ring-2 transition-colors ${
                    isSelfSeller
                      ? 'border-amber-400 focus:ring-amber-500 bg-amber-50/30'
                      : 'border-slate-300 focus:ring-emerald-500'
                  }`}
                />
                {isSelfSeller && (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2 text-amber-900 text-xs animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold">⚠️ Vendedor no permitido (Es tu propia cuenta)</p>
                      <p className="text-[11px] leading-relaxed text-amber-800">
                        Has ingresado tu propia billetera activa. En el contrato de custodia, el comprador y el vendedor <strong>deben ser billeteras distintas</strong>. Selecciona a continuación la Cuenta #3 o Cuenta #4 para continuar.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sugerencias de vendedor */}
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">Cuentas académicas sugeridas (haz clic para auto-completar):</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {suggestedSellers.map((s, idx) => {
                    const isCurrent = Boolean(activeWallet && s.address.toLowerCase() === activeWallet.toLowerCase());
                    const isSelected = Boolean(newSeller && s.address.toLowerCase() === newSeller.toLowerCase());

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestedSeller(s)}
                        className={`text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all border ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400'
                            : isCurrent
                            ? 'bg-slate-50 border-amber-200 hover:border-amber-300'
                            : 'bg-slate-50 hover:bg-emerald-50/70 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">{s.label}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.2 rounded-full">
                                Tu cuenta actual
                              </span>
                            )}
                          </div>
                          <span className="block text-[11px] text-slate-500">{s.desc}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {s.address.slice(0, 6)}...{s.address.slice(-4)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Precio en Tokens UPECT
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Ej: 50"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Hash de Términos / Condiciones (IPFS o Texto)
                </label>
                <input
                  type="text"
                  placeholder="Ej: bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
                  value={newConditions}
                  onChange={(e) => setNewConditions(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isActionPending || isSelfSeller}
                  className={`px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 transition-all ${
                    isSelfSeller
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-80'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-[0.98]'
                  }`}
                >
                  {isActionPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
                  <span>{isSelfSeller ? 'Selecciona otro Vendedor' : 'Emitir Propuesta con Billetera'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: REGISTRAR ENTREGA                               */}
      {/* ======================================================== */}
      {isDeliveryModalOpen && selectedAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Registrar Entrega del Producto</h3>
              <button onClick={() => setIsDeliveryModalOpen(false)} className="text-slate-400">✕</button>
            </div>

            <p className="text-xs text-slate-600">
              Registra el identificador de IPFS o enlace que acredita la entrega del servicio para el Acuerdo #{selectedAgreement.id}. Al firmar, comenzará el plazo de inspección de 3 días.
            </p>

            <form onSubmit={handleDeliverySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Hash de Evidencia / IPFS CID
                </label>
                <input
                  type="text"
                  required
                  placeholder="bafybeicg4f3x7xeqv2e72z67c76y..."
                  value={deliveryCID}
                  onChange={(e) => setDeliveryCID(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isActionPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-1.5"
                >
                  {isActionPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                  <span>Confirmar Entrega</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: INICIAR DISPUTA ACADÉMICA                       */}
      {/* ======================================================== */}
      {isDisputeModalOpen && selectedAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold">Iniciar Disputa Académica</h3>
              </div>
              <button onClick={() => setIsDisputeModalOpen(false)} className="text-slate-400">✕</button>
            </div>

            <p className="text-xs text-slate-600">
              Al iniciar una disputa, la liberación automática de fondos queda suspendida. El caso será elevado para resolución mediante mediación académica de demostración.
            </p>

            <form onSubmit={handleDisputeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo de la Disputa
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detalla las razones de la discrepancia (ej: entregable incompleto, requisitos no cumplidos)..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDisputeModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={isActionPending}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold flex items-center gap-1.5"
                >
                  {isActionPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>Firmar Apertura de Disputa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: MEDIACIÓN ACADÉMICA DE DEMOSTRACIÓN             */}
      {/* ======================================================== */}
      {isMediationModalOpen && selectedAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-purple-800">
                <Scale className="w-5 h-5" />
                <h3 className="text-base font-bold">Mediación Académica de Demostración</h3>
              </div>
              <button onClick={() => setIsMediationModalOpen(false)} className="text-slate-400">✕</button>
            </div>

            <p className="text-xs text-slate-600">
              Como mediador académico autorizado, define el porcentaje de los {selectedAgreement.amount} UPECT que corresponde devolver al comprador y liberar al vendedor. La suma debe ser exactamente 100%.
            </p>

            <form onSubmit={handleMediationSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Comprador (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={buyerPercent}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBuyerPercent(val);
                      setSellerPercent(100 - val);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Vendedor (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={sellerPercent}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSellerPercent(val);
                      setBuyerPercent(100 - val);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-center"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p>• Retorno al Comprador: <strong>{((parseFloat(selectedAgreement.amount) * buyerPercent) / 100).toFixed(2)} UPECT</strong></p>
                <p>• Pago al Vendedor: <strong>{((parseFloat(selectedAgreement.amount) * sellerPercent) / 100).toFixed(2)} UPECT</strong></p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMediationModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isActionPending || Number(buyerPercent) + Number(sellerPercent) !== 100}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-semibold flex items-center gap-1.5"
                >
                  {isActionPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
                  <span>Aplicar Dictamen de Mediación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: ACTA DE ACUERDO RICARDIANO Y DESCARGA PDF       */}
      {/* ======================================================== */}
      {isDocumentModalOpen && docAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Cabecera del Modal */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-emerald-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-700/60 rounded-xl border border-emerald-500/30">
                  <FileText className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">Acta de Acuerdo Ricardiano Web3</h3>
                  <p className="text-xs text-emerald-200">Universidad Politécnica Estatal del Carchi • Contrato #{docAgreement.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDocumentModalOpen(false)}
                className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800/60 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Contenido Imprimible / Vista Previa del Documento */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs sm:text-sm bg-slate-50/50">
              {/* Membrete Oficial */}
              <div className="text-center pb-4 border-b-2 border-emerald-700/40 space-y-1">
                <span className="inline-block px-3 py-1 bg-emerald-900 text-amber-300 font-extrabold text-[11px] rounded-full tracking-wider">
                  UPEC • FIACA
                </span>
                <h4 className="text-base font-black text-emerald-950 uppercase tracking-wide">
                  Universidad Politécnica Estatal del Carchi
                </h4>
                <p className="text-xs text-slate-600">
                  Carrera de Computación • Prototipo Académico de Titulación Web3 & Smart Contracts
                </p>
                <div className="pt-2">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md font-bold text-xs">
                    ESTADO ON-CHAIN: {docAgreement.stateMeta?.label?.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Ficha Resumen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Título del Acuerdo:</span>
                  <span className="font-bold text-slate-800">{docAgreement.title}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Monto en Garantía:</span>
                  <span className="font-extrabold text-emerald-700">{docAgreement.amount} UPECT (Token Demo ERC-20)</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Comprador (Pagador):</span>
                  <span className="font-mono text-[11px] text-slate-700 break-all">{docAgreement.buyer}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Vendedor (Beneficiario):</span>
                  <span className="font-mono text-[11px] text-slate-700 break-all">{docAgreement.seller}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[11px] font-semibold text-slate-500 block">Smart Contract de Custodia:</span>
                  <span className="font-mono text-[11px] text-slate-600">0xdc64a140aa3e981100a9beca4e685f962f0cf6c9</span>
                </div>
              </div>

              {/* Cláusulas Ricardianas */}
              <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h5 className="font-bold text-emerald-800 text-xs uppercase mb-1">Cláusula 1: Objeto y Naturaleza Ricardiana</h5>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    El presente instrumento vincula la voluntad contractual expresada por las partes con la ejecución determinista del Smart Contract de Custodia (PurchaseEscrow.sol), garantizando que las condiciones pactadas no puedan ser alteradas de forma unilateral.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-emerald-800 text-xs uppercase mb-1">Cláusula 2: Integridad de Términos (Hash IPFS)</h5>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify mb-1.5">
                    Las especificaciones técnicas y requerimientos del producto o servicio se encuentran sellados criptográficamente mediante el siguiente hash de contenido inmutable:
                  </p>
                  <div className="p-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl font-mono text-[11px] text-emerald-700 break-all">
                    {docAgreement.conditionHash || 'Sin identificador IPFS provisto'}
                  </div>
                </div>

                <div>
                  <h5 className="font-bold text-emerald-800 text-xs uppercase mb-1">Cláusula 3: Evidencia de Entrega y Liquidación</h5>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify mb-1.5">
                    {docAgreement.deliveryEvidenceCID ? (
                      <>
                        La parte vendedora registró formalmente la entrega del entregable en blockchain mediante la constancia digital:
                      </>
                    ) : (
                      <>
                        El servicio se encuentra en curso de ejecución. El vendedor registrará la constancia de entrega digital una vez finalizado el trabajo.
                      </>
                    )}
                  </p>
                  {docAgreement.deliveryEvidenceCID && (
                    <div className="p-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl font-mono text-[11px] text-emerald-700 break-all">
                      {docAgreement.deliveryEvidenceCID}
                    </div>
                  )}
                </div>

                <div>
                  <h5 className="font-bold text-emerald-800 text-xs uppercase mb-1">Cláusula 4: Plazo de Inspección y Arbitraje</h5>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    Se estipula un plazo de inspección de 3 días posteriores a la entrega. Durante este plazo, el comprador puede confirmar conformidad para liberar el pago anticipadamente, o iniciar una disputa académica para someter el caso a mediación por un tribunal autorizado.
                  </p>
                </div>
              </div>

              {/* Sellos de Firma Digital */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] font-bold text-slate-700 block">Sello Digital Comprador</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Validado vía Web3</span>
                  <span className="font-mono text-[9px] text-slate-400 block mt-1 break-all">{docAgreement.buyer}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] font-bold text-slate-700 block">Sello Digital Vendedor</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Validado vía Web3</span>
                  <span className="font-mono text-[9px] text-slate-400 block mt-1 break-all">{docAgreement.seller}</span>
                </div>
              </div>

              {/* Aviso Institucional */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center text-[10.5px] text-amber-900">
                <strong>Aviso de Prototipo de Investigación:</strong> Documento generado para demostración académica en la Universidad Politécnica Estatal del Carchi. No posee validez legal ni efectos mercantiles oficiales.
              </div>
            </div>

            {/* Pie de Acciones */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Formato listo para exportación A4 y defensa de tesis</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDocumentModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintDocument(docAgreement)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Guardar en PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
