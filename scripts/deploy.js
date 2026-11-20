const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("============================================================");
  console.log("🚀 DESPLIEGUE DEL SISTEMA WEB3 UPEC - SMART CONTRACTS (FASE 3)");
  console.log("============================================================");
  console.log(`Desplegando con la cuenta: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Saldo de la cuenta:       ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`Red objetivo:             ${network.name} (Chain ID: ${network.chainId})`);
  console.log("------------------------------------------------------------");

  // 1. Desplegar ProjectRegistry (Registro de Tesis y Certificados NFT ERC-721)
  console.log("1/3 Compilando y desplegando 'ProjectRegistry'...");
  const ProjectRegistry = await hre.ethers.getContractFactory("ProjectRegistry");
  const projectRegistry = await ProjectRegistry.deploy(deployer.address);
  await projectRegistry.waitForDeployment();
  const registryAddress = await projectRegistry.getAddress();
  console.log(`✅ ProjectRegistry desplegado en: ${registryAddress}`);

  // Rol docente: en la red local se habilitan las cuentas 2, 3 y 4 de Hardhat (docentes de prueba).
  // En otras redes se leen de DOCENTE_WALLETS (direcciones separadas por comas) en el archivo .env.
  const DOCENTE_ROLE = await projectRegistry.DOCENTE_ROLE();
  let docentes = (process.env.DOCENTE_WALLETS || "").split(",").map((a) => a.trim()).filter(Boolean);
  if (docentes.length === 0 && Number(network.chainId) === 1337) {
    const signers = await hre.ethers.getSigners();
    docentes = [signers[2].address, signers[3].address, signers[4].address];
  }
  for (const d of docentes) {
    await (await projectRegistry.grantRole(DOCENTE_ROLE, d)).wait();
    console.log(`   Rol DOCENTE otorgado a ${d}`);
  }

  // 2. Desplegar UPECToken (Moneda Académica ERC-20 con Faucet y Roles)
  console.log("\n2/3 Compilando y desplegando 'UPECToken'...");
  const initialSupply = hre.ethers.parseEther("1000000"); // 1,000,000 UPECT inicial
  const UPECToken = await hre.ethers.getContractFactory("UPECToken");
  const upectToken = await UPECToken.deploy(initialSupply, deployer.address);
  await upectToken.waitForDeployment();
  const upectAddress = await upectToken.getAddress();
  console.log(`✅ UPECToken (UPECT) desplegado en: ${upectAddress}`);

  // 3. Desplegar PurchaseEscrow (Contratos de Compraventa con Custodia en UPECT)
  console.log("\n3/3 Compilando y desplegando 'PurchaseEscrow'...");
  const PurchaseEscrow = await hre.ethers.getContractFactory("PurchaseEscrow");
  const purchaseEscrow = await PurchaseEscrow.deploy(upectAddress, deployer.address);
  await purchaseEscrow.waitForDeployment();
  const escrowAddress = await purchaseEscrow.getAddress();
  console.log(`✅ PurchaseEscrow desplegado en: ${escrowAddress}`);

  console.log("------------------------------------------------------------");

  // 4. Exportar ABIs y Direcciones para el cliente React / Vite
  const contractsDir = path.join(__dirname, "..", "client", "src", "contracts");
  try {
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true });
    }
    
    // Leer artefactos compilados
    const registryArtifact = await hre.artifacts.readArtifact("ProjectRegistry");
    const upectArtifact = await hre.artifacts.readArtifact("UPECToken");
    const escrowArtifact = await hre.artifacts.readArtifact("PurchaseEscrow");

    // Guardar artefactos individuales
    const deployedTimestamp = new Date().toISOString();
    const chainIdNum = Number(network.chainId);

    fs.writeFileSync(
      path.join(contractsDir, "ProjectRegistry.json"),
      JSON.stringify({
        address: registryAddress,
        network: network.name,
        chainId: chainIdNum,
        abi: registryArtifact.abi,
        deployedAt: deployedTimestamp,
      }, null, 2)
    );
    fs.writeFileSync(
      path.join(contractsDir, "ProjectRegistryABI.json"),
      JSON.stringify(registryArtifact.abi, null, 2)
    );

    fs.writeFileSync(
      path.join(contractsDir, "UPECToken.json"),
      JSON.stringify({
        address: upectAddress,
        network: network.name,
        chainId: chainIdNum,
        abi: upectArtifact.abi,
        deployedAt: deployedTimestamp,
      }, null, 2)
    );
    fs.writeFileSync(
      path.join(contractsDir, "UPECTokenABI.json"),
      JSON.stringify(upectArtifact.abi, null, 2)
    );

    fs.writeFileSync(
      path.join(contractsDir, "PurchaseEscrow.json"),
      JSON.stringify({
        address: escrowAddress,
        network: network.name,
        chainId: chainIdNum,
        abi: escrowArtifact.abi,
        deployedAt: deployedTimestamp,
      }, null, 2)
    );
    fs.writeFileSync(
      path.join(contractsDir, "PurchaseEscrowABI.json"),
      JSON.stringify(escrowArtifact.abi, null, 2)
    );

    // Leer direcciones previas si existen en config.js para no sobreescribir la otra red
    let reg1337 = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
    let upect1337 = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';
    let escrow1337 = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
    let regSepolia = '0x0000000000000000000000000000000000000000';
    let upectSepolia = '0x0000000000000000000000000000000000000000';
    let escrowSepolia = '0x0000000000000000000000000000000000000000';

    try {
      const currentConfigPath = path.join(contractsDir, "config.js");
      if (fs.existsSync(currentConfigPath)) {
        const fileStr = fs.readFileSync(currentConfigPath, "utf8");
        const mRegSep = fileStr.match(/11155111:\s*['"](0x[a-fA-F0-9]{40})['"]/);
        if (mRegSep) regSepolia = mRegSep[1];
        const mUpSep = fileStr.match(/UPEC_TOKEN_ADDRESSES[\s\S]*?11155111:\s*['"](0x[a-fA-F0-9]{40})['"]/);
        if (mUpSep) upectSepolia = mUpSep[1];
        const mEscSep = fileStr.match(/ESCROW_ADDRESSES[\s\S]*?11155111:\s*['"](0x[a-fA-F0-9]{40})['"]/);
        if (mEscSep) escrowSepolia = mEscSep[1];

        const mRegLoc = fileStr.match(/1337:\s*['"](0x[a-fA-F0-9]{40})['"]/);
        if (mRegLoc) reg1337 = mRegLoc[1];
        const mUpLoc = fileStr.match(/UPEC_TOKEN_ADDRESSES[\s\S]*?1337:\s*['"](0x[a-fA-F0-9]{40})['"]/);
        if (mUpLoc) upect1337 = mUpLoc[1];
        const mEscLoc = fileStr.match(/ESCROW_ADDRESSES[\s\S]*?1337:\s*['"](0x[a-fA-F0-9]{40})['"]/);
        if (mEscLoc) escrow1337 = mEscLoc[1];
      }
    } catch (e) {
      // fallback a defaults
    }

    if (chainIdNum === 11155111) {
      regSepolia = registryAddress;
      upectSepolia = upectAddress;
      escrowSepolia = escrowAddress;
    } else {
      reg1337 = registryAddress;
      upect1337 = upectAddress;
      escrow1337 = escrowAddress;
    }

    // Archivo de configuración consolidada para frontend
    const configContent = `// Archivo generado automáticamente por scripts/deploy.js
import ProjectRegistryABI from './ProjectRegistryABI.json';
import ProjectRegistryData from './ProjectRegistry.json';
import UPECTokenABI from './UPECTokenABI.json';
import UPECTokenData from './UPECToken.json';
import PurchaseEscrowABI from './PurchaseEscrowABI.json';
import PurchaseEscrowData from './PurchaseEscrow.json';

// Direcciones compatibles con Wagmi useReadContract para ProjectRegistry
export const CONTRACT_ADDRESSES = {
  1337: '${reg1337}',
  31337: '${reg1337}',
  11155111: '${regSepolia}',
};

// Direcciones para la moneda académica UPECT
export const UPEC_TOKEN_ADDRESSES = {
  1337: '${upect1337}',
  31337: '${upect1337}',
  11155111: '${upectSepolia}',
};

// Direcciones para el contrato de custodia PurchaseEscrow
export const ESCROW_ADDRESSES = {
  1337: '${escrow1337}',
  31337: '${escrow1337}',
  11155111: '${escrowSepolia}',
};

// Mapa consolidado de todos los contratos desplegados
export const ALL_CONTRACTS = {
  1337: {
    registry: '${reg1337}',
    upectToken: '${upect1337}',
    escrow: '${escrow1337}',
  },
  11155111: {
    registry: '${regSepolia}',
    upectToken: '${upectSepolia}',
    escrow: '${escrowSepolia}',
  },
};

export const DEFAULT_CONTRACT_ADDRESS = '${chainIdNum === 11155111 ? regSepolia : reg1337}';
export const DEFAULT_UPEC_TOKEN_ADDRESS = '${chainIdNum === 11155111 ? upectSepolia : upect1337}';
export const DEFAULT_ESCROW_ADDRESS = '${chainIdNum === 11155111 ? escrowSepolia : escrow1337}';

export {
  ProjectRegistryABI,
  ProjectRegistryData,
  UPECTokenABI,
  UPECTokenData,
  PurchaseEscrowABI,
  PurchaseEscrowData,
};
`;

    fs.writeFileSync(path.join(contractsDir, "config.js"), configContent);

    console.log("📁 Todos los ABIs y direcciones fueron exportados exitosamente a: client/src/contracts/");
  } catch (err) {
    console.error("⚠️ Error al exportar archivos al cliente:", err);
  }

  console.log("============================================================");
  console.log("✨ RESUMEN DE CONTRATOS DESPLEGADOS:");
  console.log(`- ProjectRegistry (NFT ERC-721): ${registryAddress}`);
  console.log(`- UPECToken (Moneda ERC-20):     ${upectAddress}`);
  console.log(`- PurchaseEscrow (Custodia):     ${escrowAddress}`);
  console.log("============================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error en el despliegue:", error);
    process.exit(1);
  });
