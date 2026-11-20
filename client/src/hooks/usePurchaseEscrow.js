import { useState, useEffect, useCallback } from 'react';
import {
  useAccount,
  useChainId,
  useReadContract,
  useWalletClient,
  usePublicClient,
} from 'wagmi';
import { formatUnits, parseUnits, isAddress } from 'viem';
import PurchaseEscrowABI from '../contracts/PurchaseEscrowABI.json';
import UPECTokenABI from '../contracts/UPECTokenABI.json';
import { ESCROW_ADDRESSES, DEFAULT_ESCROW_ADDRESS, UPEC_TOKEN_ADDRESSES, DEFAULT_UPEC_TOKEN_ADDRESS } from '../contracts/config.js';
import { saveDatabaseTransaction } from '../utils/upecDatabase.js';

export const ESCROW_STATES = {
  0: { label: 'Propuesta Creada', color: 'bg-blue-100 text-blue-800 border-blue-300', code: 'Created' },
  1: { label: 'Acuerdo Aceptado', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', code: 'Accepted' },
  2: { label: 'Fondos en Custodia', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', code: 'Funded' },
  3: { label: 'Entrega Registrada', color: 'bg-amber-100 text-amber-800 border-amber-300', code: 'Delivered' },
  4: { label: 'Completado y Liberado', color: 'bg-green-100 text-green-800 border-green-300', code: 'Completed' },
  5: { label: 'En Disputa Académica', color: 'bg-rose-100 text-rose-800 border-rose-300', code: 'Disputed' },
  6: { label: 'Reembolsado', color: 'bg-gray-100 text-gray-800 border-gray-300', code: 'Refunded' },
  7: { label: 'Cancelado', color: 'bg-slate-100 text-slate-700 border-slate-300', code: 'Cancelled' },
};

export function usePurchaseEscrow() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [agreements, setAgreements] = useState([]);
  const [isLoadingAgreements, setIsLoadingAgreements] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [lastTxHash, setLastTxHash] = useState(null);

  // Direcciones de contratos
  const rawEscrowAddr = ESCROW_ADDRESSES[chainId] || DEFAULT_ESCROW_ADDRESS;
  const escrowAddress = typeof rawEscrowAddr === 'object' && rawEscrowAddr?.escrow ? rawEscrowAddr.escrow : rawEscrowAddr;

  const rawTokenAddr = UPEC_TOKEN_ADDRESSES[chainId] || DEFAULT_UPEC_TOKEN_ADDRESS;
  const tokenAddress = typeof rawTokenAddr === 'object' && rawTokenAddr?.upectToken ? rawTokenAddr.upectToken : rawTokenAddr;

  // Contador total de acuerdos
  const { data: rawCounter, refetch: refetchCounter } = useReadContract({
    address: escrowAddress,
    abi: PurchaseEscrowABI,
    functionName: 'getAgreementCount',
  });

  // Verificar si el usuario es mediador autorizado
  const MEDIATOR_ROLE = '0x4918e97495b45c225a65df77053eb3c0e5a9537f5979ad46002f5a0fb76b8852'; // keccak256("MEDIATOR_ROLE")
  const { data: isMediator } = useReadContract({
    address: escrowAddress,
    abi: PurchaseEscrowABI,
    functionName: 'hasRole',
    args: address ? [MEDIATOR_ROLE, address] : undefined,
    query: {
      enabled: !!address && !!escrowAddress,
    },
  });

  // Cargar todos los acuerdos on-chain
  const fetchAllAgreements = useCallback(async () => {
    if (!publicClient || !escrowAddress) return;
    setIsLoadingAgreements(true);
    try {
      let total = 0;
      try {
        const c = await publicClient.readContract({
          address: escrowAddress,
          abi: PurchaseEscrowABI,
          functionName: 'getAgreementCount',
        });
        total = Number(c);
      } catch (err) {
        console.warn('Error reading getAgreementCount:', err);
      }

      if (total === 0) {
        setAgreements([]);
        setIsLoadingAgreements(false);
        return;
      }

      const list = [];
      for (let i = 1; i <= total; i++) {
        try {
          const res = await publicClient.readContract({
            address: escrowAddress,
            abi: PurchaseEscrowABI,
            functionName: 'getAgreement',
            args: [BigInt(i)],
          });

          // Desestructuración del tuple retornado por getAgreement en PurchaseEscrow.sol:
          // (id, buyer, seller, price, termsCID, deliveryProofCID, deliveryDeadline, inspectionDeadline, state)
          const [
            id,
            buyer,
            seller,
            price,
            termsCID,
            deliveryProofCID,
            deliveryDeadline,
            inspectionDeadline,
            state,
          ] = res;

          let title = `Acuerdo #${id}`;
          let conditionHash = termsCID || '';
          if (termsCID && termsCID.includes(' :: ')) {
            const parts = termsCID.split(' :: ');
            title = parts[0];
            conditionHash = parts[1] || '';
          } else if (termsCID) {
            title = termsCID;
          }

          list.push({
            id: Number(id),
            title,
            buyer,
            seller,
            amount: formatUnits(price, 18),
            rawAmount: price,
            conditionHash,
            deliveryEvidenceCID: deliveryProofCID,
            deliveryDeadline: Number(deliveryDeadline),
            inspectionDeadline: Number(inspectionDeadline),
            state: Number(state),
            stateMeta: ESCROW_STATES[Number(state)] || ESCROW_STATES[0],
            createdAt: 0,
            deliveredAt: Number(inspectionDeadline) > 0 ? Number(inspectionDeadline) - 3 * 24 * 3600 : 0,
            completedAt: 0,
            disputeReason: '',
          });
        } catch (fetchErr) {
          console.warn(`Error fetching agreement #${i}:`, fetchErr);
        }
      }

      // Ordenar más recientes primero
      list.sort((a, b) => b.id - a.id);
      setAgreements(list);
    } catch (e) {
      console.error('Error fetching all agreements:', e);
    } finally {
      setIsLoadingAgreements(false);
    }
  }, [publicClient, escrowAddress]);

  useEffect(() => {
    fetchAllAgreements();
  }, [fetchAllAgreements, rawCounter]);

  // Ejecutor de transacciones
  const executeEscrowWrite = async (functionName, args, actionType, description) => {
    setActionError(null);
    setLastTxHash(null);
    setIsActionPending(true);

    if (!isConnected || !address) {
      setIsActionPending(false);
      throw new Error('Por favor conecta tu billetera MetaMask antes de continuar.');
    }

    try {
      let hash;
      const activeAccount = (typeof window !== 'undefined' && window.ethereum?.selectedAddress)
        ? window.ethereum.selectedAddress
        : address;

      // Pre-flight simulation y estimación de gas dinámica
      let gasLimitToUse = 1500000n;
      if (publicClient) {
        try {
          const estimatedGas = await publicClient.estimateContractGas({
            address: escrowAddress,
            abi: PurchaseEscrowABI,
            functionName,
            args,
            account: activeAccount,
          });
          // Margen de seguridad del 40% para ejecución local
          gasLimitToUse = (estimatedGas * 140n) / 100n;
        } catch (simErr) {
          console.warn(`Simulación previa de ${functionName} arrojó error:`, simErr);
          const fullErr = simErr.shortMessage || simErr.message || '';
          if (fullErr.includes('InvalidParties') || fullErr.includes('seller == msg.sender')) {
            throw new Error('El contrato rechazó la operación: El comprador y el vendedor son la misma dirección. Por favor selecciona una cuenta de vendedor distinta a la tuya.');
          }
          if (fullErr.includes('InvalidPrice')) {
            throw new Error('El precio en tokens UPECT debe ser mayor a cero.');
          }
          if (fullErr.includes('InvalidTerms')) {
            throw new Error('El título o las condiciones del acuerdo no pueden estar vacíos.');
          }
          if (fullErr.includes('InvalidTimePeriod')) {
            throw new Error('El plazo de entrega debe ser de al menos 1 hora.');
          }
          if (fullErr.includes('InvalidState')) {
            throw new Error('El estado actual del acuerdo no permite ejecutar esta acción.');
          }
          if (fullErr.includes('UnauthorizedCaller')) {
            throw new Error('No tienes autorización para realizar esta acción sobre este acuerdo.');
          }
          if (fullErr.includes('Transaction ran out of gas') || fullErr.includes('out of gas')) {
            throw new Error('La transacción falló al simularse en el contrato (gas insuficiente o regla incumplida). Verifica que el vendedor sea una cuenta distinta.');
          }
          throw new Error(simErr.shortMessage || 'Error de validación previa en el contrato inteligente.');
        }
      }

      if (walletClient) {
        hash = await walletClient.writeContract({
          address: escrowAddress,
          abi: PurchaseEscrowABI,
          functionName,
          args,
          account: activeAccount,
          gas: gasLimitToUse,
        });
      } else if (typeof window !== 'undefined' && window.ethereum) {
        const { createWalletClient, custom } = await import('viem');
        const customClient = createWalletClient({
          chain: { id: chainId || 1337 },
          transport: custom(window.ethereum),
        });
        hash = await customClient.writeContract({
          address: escrowAddress,
          abi: PurchaseEscrowABI,
          functionName,
          args,
          account: activeAccount,
          gas: gasLimitToUse,
        });
      } else {
        throw new Error('No se detectó un proveedor Web3 compatible.');
      }

      setLastTxHash(hash);

      let receipt = null;
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash });
      }

      saveDatabaseTransaction({
        hash,
        type: actionType,
        module: 'Contratos Escrow',
        from: activeAccount,
        token: 'UPECT',
        description,
        status: receipt?.status === 'reverted' ? 'Failed' : 'Confirmed',
        blockNumber: receipt?.blockNumber ? Number(receipt.blockNumber) : null,
        gasUsed: receipt?.gasUsed ? Number(receipt.gasUsed) : null,
        timestamp: new Date().toISOString(),
      });

      // Refrescar lista de contratos
      await fetchAllAgreements();
      if (refetchCounter) await refetchCounter();

      setIsActionPending(false);
      return { hash, receipt };
    } catch (err) {
      setIsActionPending(false);
      console.error(`Error en executeEscrowWrite (${functionName}):`, err);
      let msg = err.shortMessage || err.message || 'Error en la transacción';
      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        msg = 'La firma fue cancelada en la billetera por el usuario.';
      } else if (msg.includes('InvalidParties') || msg.includes('seller == msg.sender')) {
        msg = 'No puedes crear un acuerdo de compraventa contigo mismo como vendedor. Selecciona una billetera distinta a tu cuenta activa.';
      } else if (msg.includes('Transaction ran out of gas') || msg.includes('out of gas')) {
        msg = 'Transacción rechazada por el contrato (gas agotado). Comprueba que el vendedor sea una cuenta distinta a la tuya y que dispongas de fondos de gas en la red.';
      } else if (msg.includes('Plazo de inspeccion aun vigente')) {
        msg = 'El plazo de inspección de 3 días aún está vigente para este acuerdo.';
      } else if (msg.includes('Solo el mediador')) {
        msg = 'Solo un usuario con rol de Mediador Académico autorizado puede resolver disputas.';
      }
      const customErr = new Error(msg);
      setActionError(customErr);
      throw customErr;
    }
  };

  // 1. Crear propuesta de compraventa
  const createAgreement = async (sellerAddress, amountStr, title, conditionHash) => {
    if (!sellerAddress || !isAddress(sellerAddress)) {
      throw new Error('Dirección del vendedor inválida.');
    }
    const activeBuyer = (typeof window !== 'undefined' && window.ethereum?.selectedAddress)
      ? window.ethereum.selectedAddress
      : address;

    if (activeBuyer && sellerAddress.toLowerCase() === activeBuyer.toLowerCase()) {
      throw new Error('El vendedor no puede ser tu misma billetera activa. Selecciona o ingresa una dirección de vendedor distinta a la tuya.');
    }
    if (address && sellerAddress.toLowerCase() === address.toLowerCase()) {
      throw new Error('El vendedor debe ser una billetera distinta al comprador.');
    }
    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('El monto en UPECT debe ser mayor a cero.');
    }
    if (!title || !title.trim()) {
      throw new Error('El título del acuerdo o producto es obligatorio.');
    }

    const hashToSave = conditionHash && conditionHash.trim()
      ? conditionHash.trim()
      : `upec-cond-${Date.now()}`;

    const amountUnits = parseUnits(amountStr.trim(), 18);
    const termsPayload = `${title.trim()} :: ${hashToSave}`;
    const deliveryPeriodSeconds = 7n * 24n * 3600n; // 7 días de plazo de entrega

    return await executeEscrowWrite(
      'createAgreement',
      [sellerAddress, amountUnits, termsPayload, deliveryPeriodSeconds],
      'ESCROW_CREATE',
      `Creación de propuesta de compraventa: "${title}" por ${amountStr} UPECT`
    );
  };

  // 2. Aceptar acuerdo (comprador o vendedor)
  const acceptAgreement = async (agreementId) => {
    return await executeEscrowWrite(
      'acceptAgreement',
      [BigInt(agreementId)],
      'ESCROW_ACCEPT',
      `Aceptación formal del Acuerdo de Compraventa #${agreementId}`
    );
  };

  // 3. Depositar fondos en custodia (requiere aprobación previa si no alcanza el allowance)
  const depositEscrow = async (agreementId, amountStr) => {
    if (!publicClient) throw new Error('Cliente público no inicializado');

    const amountUnits = parseUnits(amountStr.trim(), 18);
    const activeAccount = (typeof window !== 'undefined' && window.ethereum?.selectedAddress)
      ? window.ethereum.selectedAddress
      : address;

    // Verificar allowance actual
    let currentAllowance = 0n;
    try {
      currentAllowance = await publicClient.readContract({
        address: tokenAddress,
        abi: UPECTokenABI,
        functionName: 'allowance',
        args: [activeAccount, escrowAddress],
      });
    } catch (e) {
      console.warn('Error reading allowance:', e);
    }

    // Si el allowance es menor que el monto requerido, solicitar aprobación en MetaMask
    if (currentAllowance < amountUnits) {
      setIsActionPending(true);
      try {
        let approveHash;
        if (walletClient) {
          approveHash = await walletClient.writeContract({
            address: tokenAddress,
            abi: UPECTokenABI,
            functionName: 'approve',
            args: [escrowAddress, amountUnits],
            account: activeAccount,
          });
        } else if (typeof window !== 'undefined' && window.ethereum) {
          const { createWalletClient, custom } = await import('viem');
          const customClient = createWalletClient({
            chain: { id: chainId || 1337 },
            transport: custom(window.ethereum),
          });
          approveHash = await customClient.writeContract({
            address: tokenAddress,
            abi: UPECTokenABI,
            functionName: 'approve',
            args: [escrowAddress, amountUnits],
            account: activeAccount,
          });
        }
        if (publicClient && approveHash) {
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      } catch (appErr) {
        setIsActionPending(false);
        throw new Error('La aprobación de tokens UPECT para el contrato de custodia fue cancelada.');
      }
    }

    // Ahora ejecutar el depósito en custodia
    return await executeEscrowWrite(
      'depositEscrow',
      [BigInt(agreementId)],
      'ESCROW_DEPOSIT',
      `Depósito de ${amountStr} UPECT en garantía para el Acuerdo #${agreementId}`
    );
  };

  // 4. Registrar entrega por parte del vendedor (con CID o evidencia)
  const registerDelivery = async (agreementId, evidenceCID) => {
    const cidToSave = evidenceCID && evidenceCID.trim() ? evidenceCID.trim() : `upec-proof-${Date.now()}`;
    return await executeEscrowWrite(
      'registerDelivery',
      [BigInt(agreementId), cidToSave],
      'ESCROW_DELIVERY',
      `Registro de entrega y evidencia para el Acuerdo #${agreementId}`
    );
  };

  // 5. Confirmar recepción y liberar fondos al vendedor
  const confirmReceipt = async (agreementId) => {
    return await executeEscrowWrite(
      'confirmReceipt',
      [BigInt(agreementId)],
      'ESCROW_RELEASE',
      `Confirmación de conformidad y liberación de pago al vendedor para el Acuerdo #${agreementId}`
    );
  };

  // 6. Liberación automática por plazo vencido (3 días)
  const releasePaymentTimeout = async (agreementId) => {
    return await executeEscrowWrite(
      'releasePaymentTimeout',
      [BigInt(agreementId)],
      'ESCROW_TIMEOUT_RELEASE',
      `Liberación automática de fondos por vencimiento del plazo de inspección (Acuerdo #${agreementId})`
    );
  };

  // 7. Cancelar y reembolsar
  const cancelAndRefund = async (agreementId) => {
    return await executeEscrowWrite(
      'cancelAndRefund',
      [BigInt(agreementId)],
      'ESCROW_CANCEL',
      `Cancelación y reembolso para el Acuerdo #${agreementId}`
    );
  };

  // 8. Iniciar disputa académica
  const raiseDispute = async (agreementId, reason) => {
    if (!reason || !reason.trim()) {
      throw new Error('Debes proporcionar el motivo de la disputa académica.');
    }
    return await executeEscrowWrite(
      'raiseDispute',
      [BigInt(agreementId), reason.trim()],
      'DISPUTE_RAISE',
      `Apertura de disputa académica en Acuerdo #${agreementId}: "${reason.trim()}"`
    );
  };

  // 9. Resolver disputa mediante Mediación académica de demostración
  const resolveDispute = async (agreementId, buyerPercent, sellerPercent) => {
    const b = Number(buyerPercent);
    const s = Number(sellerPercent);
    if (b + s !== 100) {
      throw new Error('La suma de los porcentajes de comprador y vendedor debe ser exactamente 100%.');
    }
    return await executeEscrowWrite(
      'resolveDispute',
      [BigInt(agreementId), BigInt(b), BigInt(s)],
      'DISPUTE_RESOLVE',
      `Resolución por Mediación académica de demostración en Acuerdo #${agreementId} (${b}% comprador / ${s}% vendedor)`
    );
  };

  return {
    escrowAddress,
    tokenAddress,
    agreements,
    isLoadingAgreements,
    fetchAllAgreements,
    isMediator: !!isMediator,
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
  };
}
