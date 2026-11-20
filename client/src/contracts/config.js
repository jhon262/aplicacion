// Archivo generado automáticamente por scripts/deploy.js
import ProjectRegistryABI from './ProjectRegistryABI.json';
import ProjectRegistryData from './ProjectRegistry.json';
import UPECTokenABI from './UPECTokenABI.json';
import UPECTokenData from './UPECToken.json';
import PurchaseEscrowABI from './PurchaseEscrowABI.json';
import PurchaseEscrowData from './PurchaseEscrow.json';

// Direcciones compatibles con Wagmi useReadContract para ProjectRegistry
export const CONTRACT_ADDRESSES = {
  1337: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  31337: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  11155111: '0x0000000000000000000000000000000000000000',
};

// Direcciones para la moneda académica UPECT
export const UPEC_TOKEN_ADDRESSES = {
  1337: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  31337: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  11155111: '0x0000000000000000000000000000000000000000',
};

// Direcciones para el contrato de custodia PurchaseEscrow
export const ESCROW_ADDRESSES = {
  1337: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  31337: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  11155111: '0x0000000000000000000000000000000000000000',
};

// Mapa consolidado de todos los contratos desplegados
export const ALL_CONTRACTS = {
  1337: {
    registry: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    upectToken: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    escrow: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  },
  11155111: {
    registry: '0x0000000000000000000000000000000000000000',
    upectToken: '0x0000000000000000000000000000000000000000',
    escrow: '0x0000000000000000000000000000000000000000',
  },
};

export const DEFAULT_CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
export const DEFAULT_UPEC_TOKEN_ADDRESS = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
export const DEFAULT_ESCROW_ADDRESS = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';

export {
  ProjectRegistryABI,
  ProjectRegistryData,
  UPECTokenABI,
  UPECTokenData,
  PurchaseEscrowABI,
  PurchaseEscrowData,
};
