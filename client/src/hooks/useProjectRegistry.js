import { useState, useEffect, useCallback } from 'react';
import { keccak256, toBytes, parseEventLogs, zeroAddress } from 'viem';
import {
  useReadContract,
  useAccount,
  useChainId,
  useBalance,
  useWalletClient,
  usePublicClient,
} from 'wagmi';
import ProjectRegistryABI from '../contracts/ProjectRegistryABI.json';
import { CONTRACT_ADDRESSES, DEFAULT_CONTRACT_ADDRESS } from '../contracts/config.js';

export function useProjectRegistry() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balanceData, refetch: refetchBalance } = useBalance({ address });
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [txHash, setTxHash] = useState(null);
  const [isWritePending, setIsWritePending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [writeError, setWriteError] = useState(null);
  const [isFauceting, setIsFauceting] = useState(false);

  // Solicitar fondos de prueba automáticos en red local Hardhat (100 ETH)
  const requestFaucetFunds = async (target = address) => {
    setIsFauceting(true);
    try {
      const hundredEthHex = '0x56BC75E2D63100000'; // 100 ETH
      const rpcUrl = 'http://127.0.0.1:8545';
      const deployerAddr = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

      const addressesToFund = new Set();
      if (target) addressesToFund.add(target.toLowerCase());
      if (address) addressesToFund.add(address.toLowerCase());

      if (typeof window !== 'undefined' && window.ethereum) {
        if (window.ethereum.selectedAddress) {
          addressesToFund.add(window.ethereum.selectedAddress.toLowerCase());
        }
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          (accounts || []).forEach((acc) => addressesToFund.add(acc.toLowerCase()));
        } catch (e) {
          // ignore
        }
      }

      for (const addr of addressesToFund) {
        // 1. Establecer saldo a 100 ETH
        await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'hardhat_setBalance',
            params: [addr, hundredEthHex],
            id: Date.now(),
          }),
        });

        // 2. Enviar 1 ETH on-chain para que MetaMask reciba el evento y refresque la UI
        try {
          await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_sendTransaction',
              params: [{
                from: deployerAddr,
                to: addr,
                value: '0xde0b6b3a7640000', // 1 ETH
              }],
              id: Date.now() + 1,
            }),
          });
        } catch (txErr) {
          // ignore
        }
      }

      // 3. Minar un bloque para forzar sincronización de MetaMask
      await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'evm_mine',
          params: [],
          id: Date.now() + 2,
        }),
      });

      if (refetchBalance) await refetchBalance();
      setIsFauceting(false);
      return true;
    } catch (err) {
      console.error('Error al fondear cuentas con faucet:', err);
      setIsFauceting(false);
      throw err;
    }
  };

  // Resolver dirección según la cadena activa o fallback
  const rawAddr = CONTRACT_ADDRESSES[chainId] || DEFAULT_CONTRACT_ADDRESS;
  const contractAddress = (typeof rawAddr === 'object' && rawAddr?.registry) ? rawAddr.registry : rawAddr;

  // 1. Lectura de todos los proyectos registrados
  const {
    data: rawProjects,
    isLoading: isLoadingProjects,
    refetch: refetchProjects,
    error: readError,
  } = useReadContract({
    address: contractAddress,
    abi: ProjectRegistryABI,
    functionName: 'getAllProjects',
  });

  // 2. Lectura del contador total de proyectos
  const { data: totalProjectsCount } = useReadContract({
    address: contractAddress,
    abi: ProjectRegistryABI,
    functionName: 'totalProjects',
  });

  // Mapeo amigable de la estructura de proyectos
  const projects = (rawProjects || []).map((p) => ({
    id: Number(p.id),
    title: p.title,
    description: p.description,
    ipfsMetadataCID: p.ipfsMetadataCID,
    submitter: p.submitter,
    votesFor: Number(p.votesFor),
    votesAgainst: Number(p.votesAgainst),
    votingDeadline: Number(p.votingDeadline),
    status: Number(p.status), // 0: Pending, 1: Approved, 2: Rejected
    certificateId: Number(p.certificateId),
    documentHash: p.documentHash,
    tribunalAssigned: Number(p.votingDeadline) > 0,
  }));

  // Roles de la cuenta conectada (se leen del contrato, no de la base de datos)
  const DOCENTE_ROLE = keccak256(toBytes('DOCENTE_ROLE'));
  const ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const { data: isDocenteOnChain } = useReadContract({
    address: contractAddress,
    abi: ProjectRegistryABI,
    functionName: 'hasRole',
    args: [DOCENTE_ROLE, address || zeroAddress],
    query: { enabled: Boolean(address) },
  });
  const { data: isAdminOnChain } = useReadContract({
    address: contractAddress,
    abi: ProjectRegistryABI,
    functionName: 'hasRole',
    args: [ADMIN_ROLE, address || zeroAddress],
    query: { enabled: Boolean(address) },
  });

  // Tribunal y votos de la cuenta conectada, por proyecto
  const [tribunals, setTribunals] = useState({});
  const loadTribunals = useCallback(async () => {
    if (!publicClient || !rawProjects?.length) return;
    const next = {};
    for (const p of rawProjects) {
      const id = Number(p.id);
      if (Number(p.votingDeadline) === 0) {
        next[id] = { members: [], votedByMe: false };
        continue;
      }
      try {
        const members = await publicClient.readContract({
          address: contractAddress, abi: ProjectRegistryABI, functionName: 'getTribunal', args: [BigInt(id)],
        });
        const voted = await Promise.all(members.map((m) => publicClient.readContract({
          address: contractAddress, abi: ProjectRegistryABI, functionName: 'hasVoted', args: [BigInt(id), m],
        })));
        next[id] = {
          members: members.map((m, i) => ({ address: m, hasVoted: voted[i] })),
          votedByMe: Boolean(address && members.some((m, i) => m.toLowerCase() === address.toLowerCase() && voted[i])),
        };
      } catch (e) {
        next[id] = { members: [], votedByMe: false };
      }
    }
    setTribunals(next);
  }, [publicClient, rawProjects, contractAddress, address]);

  useEffect(() => {
    loadTribunals();
  }, [loadTribunals]);

  const myProjects = projects.filter(
    (p) => address && p.submitter.toLowerCase() === address.toLowerCase()
  );

  const myNFTs = myProjects.filter((p) => p.status === 1 && p.certificateId > 0);

  // Ejecutor resiliente de transacciones: usa walletClient directo de Viem para evitar el bug de conectores en Wagmi
  const executeContractWrite = async (functionName, args) => {
    setIsWritePending(true);
    setIsConfirming(false);
    setIsConfirmed(false);
    setWriteError(null);
    setTxHash(null);

    try {
      // Garantizar que la cuenta activa y la seleccionada en MetaMask tengan saldo antes de solicitar firma
      try {
        await requestFaucetFunds();
      } catch (fErr) {
        console.warn('Faucet pre-chequeo omitido:', fErr);
      }

      let hash;
      const activeAccount = (typeof window !== 'undefined' && window.ethereum?.selectedAddress)
        ? window.ethereum.selectedAddress
        : address;

      if (walletClient) {
        hash = await walletClient.writeContract({
          address: contractAddress,
          abi: ProjectRegistryABI,
          functionName,
          args,
          account: activeAccount,
          gas: 2000000n,
        });
      } else if (typeof window !== 'undefined' && window.ethereum) {
        const { createWalletClient, custom } = await import('viem');
        const customClient = createWalletClient({
          chain: { id: chainId || 1337 },
          transport: custom(window.ethereum),
        });
        hash = await customClient.writeContract({
          address: contractAddress,
          abi: ProjectRegistryABI,
          functionName,
          args,
          account: activeAccount,
          gas: 2000000n,
        });
      } else {
        throw new Error('Por favor conecta tu billetera Web3 (MetaMask/Rainbow) antes de enviar.');
      }

      setTxHash(hash);
      setIsWritePending(false);
      setIsConfirming(true);

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setIsConfirming(false);
      setIsConfirmed(true);
      await refetchProjects();
      return hash;
    } catch (err) {
      setIsWritePending(false);
      setIsConfirming(false);

      let msg = err.shortMessage || err.message || 'Error en la transacción';
      if (msg.includes('getChainId is not a function')) {
        msg = 'La sesión de MetaMask se desincronizó. Por favor desconecta y reconecta tu billetera en el botón superior.';
      }
      const customErr = new Error(msg);
      setWriteError(customErr);
      throw customErr;
    }
  };

  /** Registra el proyecto y devuelve { hash, projectId } leyendo el evento ProjectRegistered. */
  const registerProject = async ({ title, description, ipfsCID, documentHash }) => {
    const hash = await executeContractWrite('registerProject', [title, description, ipfsCID, documentHash]);
    let projectId = null;
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      const logs = parseEventLogs({ abi: ProjectRegistryABI, logs: receipt.logs, eventName: 'ProjectRegistered' });
      if (logs[0]) projectId = Number(logs[0].args.projectId);
    } catch (e) {
      console.warn('No se pudo leer el ID del proyecto:', e);
    }
    return { hash, projectId };
  };

  const assignTribunal = async (projectId, members) => {
    const hash = await executeContractWrite('assignTribunal', [BigInt(projectId), members]);
    await loadTribunals();
    return hash;
  };

  const updateProject = async (projectId, title, description) => {
    return await executeContractWrite('updateProject', [BigInt(projectId), title, description]);
  };

  /** Verificación pública por hash del PDF (no requiere billetera). */
  const verifyDocument = async (documentHash) => {
    const r = await publicClient.readContract({
      address: contractAddress, abi: ProjectRegistryABI, functionName: 'verifyDocument', args: [documentHash],
    });
    return { registered: r[0], projectId: Number(r[1]), status: Number(r[2]), certificateId: Number(r[3]), submitter: r[4] };
  };

  const vote = async (projectId, support) => {
    const hash = await executeContractWrite('vote', [BigInt(projectId), support]);
    await loadTribunals();
    return hash;
  };

  const finalizeProject = async (projectId) => {
    return await executeContractWrite('finalizeProject', [BigInt(projectId)]);
  };

  return {
    contractAddress,
    chainId,
    isConnected,
    userAddress: address,
    projects,
    myProjects,
    myNFTs,
    totalProjectsCount: totalProjectsCount ? Number(totalProjectsCount) : 0,
    isLoadingProjects,
    refetchProjects,
    readError,
    // Saldo y Faucet Local
    balanceData,
    refetchBalance,
    requestFaucetFunds,
    isFauceting,
    // Estado de transacciones
    registerProject,
    vote,
    finalizeProject,
    assignTribunal,
    updateProject,
    verifyDocument,
    tribunals,
    isDocenteOnChain: Boolean(isDocenteOnChain),
    isAdminOnChain: Boolean(isAdminOnChain),
    isWritePending,
    isConfirming,
    isConfirmed,
    txHash,
    writeError,
    resetWrite: () => {
      setTxHash(null);
      setWriteError(null);
      setIsConfirmed(false);
    },
  };
}
