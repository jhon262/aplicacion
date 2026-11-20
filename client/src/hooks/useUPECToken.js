import { useState, useEffect, useCallback } from 'react';
import {
  useAccount,
  useChainId,
  useReadContract,
  useWalletClient,
  usePublicClient,
} from 'wagmi';
import { formatUnits, parseUnits, isAddress } from 'viem';
import UPECTokenABI from '../contracts/UPECTokenABI.json';
import { UPEC_TOKEN_ADDRESSES, DEFAULT_UPEC_TOKEN_ADDRESS } from '../contracts/config.js';
import { saveDatabaseTransaction } from '../utils/upecDatabase.js';

export function useUPECToken() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isClaimingFaucet, setIsClaimingFaucet] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isAddingToWallet, setIsAddingToWallet] = useState(false);
  const [txError, setTxError] = useState(null);
  const [lastTxHash, setLastTxHash] = useState(null);
  const [remainingCooldown, setRemainingCooldown] = useState(0);

  // Resolver dirección del contrato de UPECT según la red activa
  const rawAddr = UPEC_TOKEN_ADDRESSES[chainId] || DEFAULT_UPEC_TOKEN_ADDRESS;
  const tokenAddress = typeof rawAddr === 'object' && rawAddr?.upectToken ? rawAddr.upectToken : rawAddr;

  // 1. Lectura del saldo del usuario
  const {
    data: rawBalance,
    refetch: refetchBalance,
    isLoading: isLoadingBalance,
  } = useReadContract({
    address: tokenAddress,
    abi: UPECTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!tokenAddress,
    },
  });

  // 2. Lectura de parámetros del Faucet
  const { data: rawFaucetAmount } = useReadContract({
    address: tokenAddress,
    abi: UPECTokenABI,
    functionName: 'faucetAmount',
  });

  const { data: rawCooldownSeconds } = useReadContract({
    address: tokenAddress,
    abi: UPECTokenABI,
    functionName: 'faucetCooldown',
  });

  const {
    data: rawRemainingCooldown,
    refetch: refetchCooldown,
  } = useReadContract({
    address: tokenAddress,
    abi: UPECTokenABI,
    functionName: 'getRemainingFaucetCooldown',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!tokenAddress,
    },
  });

  // Sincronizar contador de cuenta regresiva local
  useEffect(() => {
    if (rawRemainingCooldown !== undefined && rawRemainingCooldown !== null) {
      setRemainingCooldown(Number(rawRemainingCooldown));
    }
  }, [rawRemainingCooldown]);

  // Decrementar temporizador local cada segundo si hay cooldown
  useEffect(() => {
    if (remainingCooldown <= 0) return;
    const interval = setInterval(() => {
      setRemainingCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          refetchCooldown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingCooldown, refetchCooldown]);

  // Formatear saldos y cantidades
  const balance = rawBalance ? formatUnits(rawBalance, 18) : '0';
  const balanceNumber = Number(balance);
  const faucetAmountFormatted = rawFaucetAmount ? formatUnits(rawFaucetAmount, 18) : '100';

  // Helper para escribir transacciones on-chain
  const executeTokenWrite = async (functionName, args, actionType, description) => {
    setTxError(null);
    setLastTxHash(null);

    if (!isConnected || !address) {
      throw new Error('Por favor conecta tu billetera MetaMask antes de continuar.');
    }

    try {
      let hash;
      const activeAccount = (typeof window !== 'undefined' && window.ethereum?.selectedAddress)
        ? window.ethereum.selectedAddress
        : address;

      if (walletClient) {
        hash = await walletClient.writeContract({
          address: tokenAddress,
          abi: UPECTokenABI,
          functionName,
          args,
          account: activeAccount,
          gas: 1000000n,
        });
      } else if (typeof window !== 'undefined' && window.ethereum) {
        const { createWalletClient, custom } = await import('viem');
        const customClient = createWalletClient({
          chain: { id: chainId || 1337 },
          transport: custom(window.ethereum),
        });
        hash = await customClient.writeContract({
          address: tokenAddress,
          abi: UPECTokenABI,
          functionName,
          args,
          account: activeAccount,
          gas: 1000000n,
        });
      } else {
        throw new Error('No se detectó un proveedor Web3 compatible.');
      }

      setLastTxHash(hash);

      // Esperar confirmación del bloque real
      let receipt = null;
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash });
      }

      // Guardar en el libro de transacciones auditables de la UPEC
      saveDatabaseTransaction({
        hash,
        type: actionType,
        module: 'Moneda UPECT',
        from: activeAccount,
        token: 'UPECT',
        description,
        status: receipt?.status === 'reverted' ? 'Failed' : 'Confirmed',
        blockNumber: receipt?.blockNumber ? Number(receipt.blockNumber) : null,
        gasUsed: receipt?.gasUsed ? Number(receipt.gasUsed) : null,
        timestamp: new Date().toISOString(),
      });

      // Refrescar balance y cooldown on-chain
      await refetchBalance();
      await refetchCooldown();

      return { hash, receipt };
    } catch (err) {
      console.error(`Error en executeTokenWrite (${functionName}):`, err);
      let msg = err.shortMessage || err.message || 'Error en la transacción';
      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        msg = 'La firma de la transacción fue cancelada en MetaMask por el usuario.';
      } else if (msg.includes('Cooldown activo')) {
        msg = 'Aún no ha transcurrido el tiempo de espera del Faucet para esta billetera.';
      } else if (msg.includes('transfer amount exceeds balance')) {
        msg = 'El monto supera el saldo disponible de UPECT en tu billetera.';
      }
      const customErr = new Error(msg);
      setTxError(customErr);
      throw customErr;
    }
  };

  // Reclamar tokens del Faucet académico
  const claimFaucet = async () => {
    setIsClaimingFaucet(true);
    try {
      const res = await executeTokenWrite(
        'requestFaucetTokens',
        [],
        'FAUCET_UPECT',
        `Reclamo de ${faucetAmountFormatted} UPECT desde el Faucet Académico`
      );
      setIsClaimingFaucet(false);
      return res;
    } catch (err) {
      setIsClaimingFaucet(false);
      throw err;
    }
  };

  // Transferir tokens UPECT a otra dirección
  const transferTokens = async (recipientAddress, amountStr) => {
    setIsTransferring(true);
    try {
      // 1. Validaciones previas
      if (!recipientAddress || !isAddress(recipientAddress)) {
        throw new Error('Dirección de destinatario inválida (debe iniciar con 0x y tener 40 caracteres hexadecimales).');
      }

      if (recipientAddress.toLowerCase() === address.toLowerCase()) {
        throw new Error('No puedes transferirte tokens a ti mismo.');
      }

      const numAmount = parseFloat(amountStr);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('El monto a transferir debe ser un número mayor a cero.');
      }

      if (numAmount > balanceNumber) {
        throw new Error(`Saldo insuficiente: Posees ${balanceNumber.toFixed(2)} UPECT e intentas transferir ${numAmount} UPECT.`);
      }

      const amountUnits = parseUnits(amountStr.trim(), 18);

      const res = await executeTokenWrite(
        'transfer',
        [recipientAddress, amountUnits],
        'TRANSFER_UPECT',
        `Transferencia de ${amountStr} UPECT a ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`
      );

      setIsTransferring(false);
      return res;
    } catch (err) {
      setIsTransferring(false);
      throw err;
    }
  };

  // Aprobar gasto de tokens para el contrato PurchaseEscrow
  const approveEscrow = async (escrowContractAddress, amountStr) => {
    const amountUnits = parseUnits(amountStr.trim(), 18);
    return await executeTokenWrite(
      'approve',
      [escrowContractAddress, amountUnits],
      'APPROVE_UPECT',
      `Aprobación de ${amountStr} UPECT para custodia en Contrato Escrow`
    );
  };

  // Agregar UPECT a MetaMask con un solo clic
  const addTokenToMetaMask = async () => {
    setIsAddingToWallet(true);
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask no está disponible en este navegador.');
      }

      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: 'UPECT',
            decimals: 18,
            image: 'https://raw.githubusercontent.com/antigravity-upec/assets/main/upec-token-icon.png',
          },
        },
      });

      setIsAddingToWallet(false);
      return wasAdded;
    } catch (err) {
      setIsAddingToWallet(false);
      throw err;
    }
  };

  // Formato legible para el tiempo de espera
  const formatCooldown = (seconds) => {
    if (seconds <= 0) return 'Disponible ahora';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return {
    tokenAddress,
    balance,
    balanceNumber,
    rawBalance,
    isLoadingBalance,
    refetchBalance,
    faucetAmountFormatted,
    rawCooldownSeconds: Number(rawCooldownSeconds || 86400),
    remainingCooldown,
    isCooldownActive: remainingCooldown > 0,
    formattedCooldown: formatCooldown(remainingCooldown),
    claimFaucet,
    isClaimingFaucet,
    transferTokens,
    isTransferring,
    approveEscrow,
    addTokenToMetaMask,
    isAddingToWallet,
    txError,
    lastTxHash,
  };
}
