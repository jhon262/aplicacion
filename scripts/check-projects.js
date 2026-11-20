// Muestra el estado on-chain de todos los proyectos, su tribunal y los votos.
// Uso: npx hardhat run scripts/check-projects.js --network localhost
const hre = require("hardhat");
const { address } = require("../client/src/contracts/ProjectRegistry.json");
const ESTADOS = ["Pendiente", "Aprobado", "Rechazado"];

async function main() {
  const reg = await hre.ethers.getContractAt("ProjectRegistry", address);
  const total = Number(await reg.totalProjects());
  for (let id = 1; id <= total; id++) {
    const p = await reg.projects(id);
    const tribunal = await reg.getTribunal(id);
    console.log(`#${id} ${p.title}`);
    console.log(`   estado: ${ESTADOS[Number(p.status)]} | a favor: ${p.votesFor} | en contra: ${p.votesAgainst} | certificado: ${p.certificateId}`);
    for (const d of tribunal) {
      if (d !== hre.ethers.ZeroAddress) console.log(`   tribunal ${d} votó: ${await reg.hasVoted(id, d)}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
