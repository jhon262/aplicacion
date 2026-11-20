import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { sepolia, polygonAmoy, hardhat } from 'wagmi/chains';
import { defineChain } from 'viem';

const localRpcUrl = import.meta.env.VITE_RPC_URL || (
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1' &&
  !window.location.hostname.includes('trycloudflare.com')
    ? `http://${window.location.hostname}:8545`
    : 'http://127.0.0.1:8545');

// Red local Hardhat con chainId 1337
export const hardhat1337 = defineChain({
  id: 1337,
  name: 'Hardhat UPEC (1337)',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [localRpcUrl, 'http://127.0.0.1:8545'] },
  },
  testnet: true,
});

// Configuración única compartida para toda la aplicación
export const config = getDefaultConfig({
  appName: 'UPEC Web3 System',
  projectId: 'c4f79cc821944d9680842e34466bfbd',
  chains: [hardhat1337, hardhat, sepolia, polygonAmoy],
  transports: {
    [hardhat1337.id]: http(localRpcUrl),
    [hardhat.id]: http(localRpcUrl),
    [sepolia.id]: http(),
    [polygonAmoy.id]: http(),
  },
  ssr: false,
});
