const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const accounts = [
    { label: "Admin #0 (Secretaría)", address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
    { label: "Postulante #1 (Estudiante)", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
    { label: "Docente #1", address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" },
    { label: "Docente #2", address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" },
    { label: "Docente #3", address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" },
  ];

  const deployed = require("../client/src/contracts/ProjectRegistry.json");
  const ProjectRegistry = new ethers.Contract(
    deployed.address,
    deployed.abi,
    provider
  );
  const total = await ProjectRegistry.totalProjects();
  console.log("\nTotal proyectos on-chain:", total.toString());
  for (let i = 1; i <= Number(total); i++) {
    const p = await ProjectRegistry.projects(i);
    console.log(`\nProyecto #${i}: "${p.title}"`);
    console.log(`  Submitter: ${p.submitter}`);
    console.log(`  Status: ${p.status} (0:Pending, 1:Approved, 2:Rejected)`);
    console.log(`  VotesFor: ${p.votesFor}, VotesAgainst: ${p.votesAgainst}`);
    for (const acc of accounts) {
      const voted = await ProjectRegistry.hasVoted(i, acc.address);
      if (voted) {
        console.log(`  -> ${acc.label} (${acc.address}) YA VOTÓ`);
      }
    }
  }
}

main().catch(console.error);
