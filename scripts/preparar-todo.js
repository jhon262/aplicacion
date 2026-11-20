/**
 * Prepara el entorno local de demostración (red Hardhat, chain ID 1337).
 *
 * Cuentas de Hardhat usadas:
 *   #0 Secretaría (administrador)   #1 Estudiante (autor)
 *   #2, #3, #4 Docentes del tribunal (reciben DOCENTE_ROLE en deploy.js)
 *
 * Crea tres proyectos con datos ficticios:
 *   1. Aprobado por unanimidad, con certificado emitido.
 *   2. Con tribunal asignado y un voto a favor (en evaluación).
 *   3. Registrado, a la espera de que Secretaría asigne el tribunal.
 *
 * Uso: npx hardhat run scripts/preparar-todo.js --network localhost
 * Los datos personales (nombres, cédulas) nunca se escriben en la cadena.
 */
const hre = require("hardhat");
const path = require("path");
const fs = require("fs");

const sha256 = (text) => hre.ethers.sha256(hre.ethers.toUtf8Bytes(text));

async function main() {
  const [secretaria, autor, d1, d2, d3] = await hre.ethers.getSigners();
  const dataPath = path.join(__dirname, "../client/src/contracts/ProjectRegistry.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error("No existe ProjectRegistry.json. Ejecuta primero: npm run deploy:local");
  }
  const { address } = require(dataPath);
  const registry = await hre.ethers.getContractAt("ProjectRegistry", address);
  console.log(`ProjectRegistry: ${address}`);

  const total = Number(await registry.totalProjects());
  if (total > 0) {
    console.log(`Ya hay ${total} proyectos registrados; no se agregan datos de demostración.`);
    return;
  }

  const tribunal = [d1.address, d2.address, d3.address];

  // 1. Proyecto aprobado
  await (await registry.connect(autor).registerProject(
    "Prototipo de registro de títulos con contratos inteligentes",
    "Proyecto de demostración aprobado por el tribunal.",
    "bafkreidemo0000000000000000000000000000000000000000000001",
    sha256("demo-pdf-1")
  )).wait();
  await (await registry.connect(secretaria).assignTribunal(1, tribunal)).wait();
  for (const d of [d1, d2, d3]) await (await registry.connect(d).vote(1, true)).wait();
  console.log("Proyecto 1: aprobado por unanimidad, certificado #1 emitido.");

  // 2. Proyecto en evaluación
  await (await registry.connect(autor).registerProject(
    "Trazabilidad de actas académicas con IPFS",
    "Proyecto de demostración en evaluación.",
    "bafkreidemo0000000000000000000000000000000000000000000002",
    sha256("demo-pdf-2")
  )).wait();
  await (await registry.connect(secretaria).assignTribunal(2, tribunal)).wait();
  await (await registry.connect(d1).vote(2, true)).wait();
  console.log("Proyecto 2: tribunal asignado, 1 de 3 votos.");

  // 3. Proyecto sin tribunal
  await (await registry.connect(autor).registerProject(
    "Verificación pública de certificados mediante código QR",
    "Proyecto de demostración a la espera de tribunal.",
    "bafkreidemo0000000000000000000000000000000000000000000003",
    sha256("demo-pdf-3")
  )).wait();
  console.log("Proyecto 3: registrado, falta asignar tribunal.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
