const hre = require("hardhat");

async function main() {
  console.log("================================================================================");
  console.log("🧪 PRUEBA MULTIUSUARIO ON-CHAIN — CONTRATOS INTELIGENTES UPEC (FASE 5)");
  console.log("================================================================================");

  const signers = await hre.ethers.getSigners();
  const walletA = signers[0]; // Comprador (Deployer / Cuenta A)
  const walletB = signers[1]; // Vendedor (Docente / Cuenta B)
  const walletC = signers[2]; // Tercero observador / Auditor (Cuenta C)

  console.log(`👤 Billetera A (Comprador): ${walletA.address}`);
  console.log(`👤 Billetera B (Vendedor):  ${walletB.address}`);
  console.log(`👤 Billetera C (Auditor):   ${walletC.address}`);
  console.log("--------------------------------------------------------------------------------");

  const fs = require("fs");
  const path = require("path");
  const tokenData = JSON.parse(fs.readFileSync(path.join(__dirname, "../client/src/contracts/UPECToken.json"), "utf8"));
  const escrowData = JSON.parse(fs.readFileSync(path.join(__dirname, "../client/src/contracts/PurchaseEscrow.json"), "utf8"));
  const tokenAddress = tokenData.address;
  const escrowAddress = escrowData.address;

  console.log(`📍 Contrato UPECToken:     ${tokenAddress}`);
  console.log(`📍 Contrato PurchaseEscrow: ${escrowAddress}`);
  console.log("--------------------------------------------------------------------------------");

  const upecToken = await hre.ethers.getContractAt("UPECToken", tokenAddress);
  const purchaseEscrow = await hre.ethers.getContractAt("PurchaseEscrow", escrowAddress);

  // 1. Saldos iniciales
  const initBalA = await upecToken.balanceOf(walletA.address);
  const initBalB = await upecToken.balanceOf(walletB.address);
  console.log(`📊 Saldo inicial UPECT Billetera A: ${hre.ethers.formatUnits(initBalA, 18)} UPECT`);
  console.log(`📊 Saldo inicial UPECT Billetera B: ${hre.ethers.formatUnits(initBalB, 18)} UPECT`);

  // Paso 1: Billetera A solicita UPECT mediante Faucet
  console.log("\n[PASO 1] Billetera A solicita 100 UPECT del Faucet Académico...");
  try {
    const txFaucet = await upecToken.connect(walletA).requestFaucetTokens();
    const rcFaucet = await txFaucet.wait();
    console.log(`  ✅ Faucet dispensado. Tx: ${rcFaucet.hash} (Bloque #${rcFaucet.blockNumber})`);
  } catch (err) {
    console.log(`  ℹ️ Faucet ya reclamado o en cooldown: ${err.message}`);
  }

  const postFaucetBalA = await upecToken.balanceOf(walletA.address);
  console.log(`  💰 Saldo Billetera A tras Faucet: ${hre.ethers.formatUnits(postFaucetBalA, 18)} UPECT`);

  // Paso 2: Billetera A crea un acuerdo de compraventa con Billetera B como vendedor
  console.log("\n[PASO 2] Billetera A crea propuesta de compraventa con Billetera B...");
  const agreementPrice = hre.ethers.parseUnits("35.5", 18); // 35.5 UPECT
  const title = "Adquisición de Licencia Académica de Algoritmo de Tesis";
  const conditionHash = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
  const termsPayload = `${title} :: ${conditionHash}`;
  const deliveryPeriodSeconds = 7 * 24 * 3600; // 7 días

  const txCreate = await purchaseEscrow.connect(walletA).createAgreement(
    walletB.address,
    agreementPrice,
    termsPayload,
    deliveryPeriodSeconds
  );
  const rcCreate = await txCreate.wait();
  const agreementCounter = await purchaseEscrow.getAgreementCount();
  const agreementId = agreementCounter;
  console.log(`  ✅ Acuerdo #${agreementId} creado on-chain. Tx: ${rcCreate.hash} (Bloque #${rcCreate.blockNumber})`);

  // Paso 3: Billetera B acepta el acuerdo
  console.log(`\n[PASO 3] Billetera B (Vendedor) acepta el Acuerdo #${agreementId}...`);
  const txAccept = await purchaseEscrow.connect(walletB).acceptAgreement(agreementId);
  const rcAccept = await txAccept.wait();
  console.log(`  ✅ Acuerdo #${agreementId} aceptado por B. Tx: ${rcAccept.hash}`);

  // Paso 4: Billetera A aprueba tokens y deposita en custodia (Escrow)
  console.log(`\n[PASO 4] Billetera A aprueba y deposita 35.5 UPECT en custodia...`);
  const txApprove = await upecToken.connect(walletA).approve(escrowAddress, agreementPrice);
  await txApprove.wait();
  console.log(`  ✅ Aprobación ERC-20 concedida al contrato Escrow.`);

  const txDeposit = await purchaseEscrow.connect(walletA).depositEscrow(agreementId);
  const rcDeposit = await txDeposit.wait();
  console.log(`  ✅ Fondos bloqueados en Escrow. Tx: ${rcDeposit.hash} (Bloque #${rcDeposit.blockNumber})`);

  const escrowContractBal = await upecToken.balanceOf(escrowAddress);
  console.log(`  🔒 Saldo total retenido en contrato Escrow: ${hre.ethers.formatUnits(escrowContractBal, 18)} UPECT`);

  // Paso 5: Billetera B registra la entrega con evidencia IPFS
  console.log(`\n[PASO 5] Billetera B registra entrega del entregable digital con CID IPFS...`);
  const deliveryEvidenceCID = "bafybeideliveryevidenceproofupec2026research";
  const txDelivery = await purchaseEscrow.connect(walletB).registerDelivery(agreementId, deliveryEvidenceCID);
  const rcDelivery = await txDelivery.wait();
  console.log(`  ✅ Entrega registrada. Plazo de inspección iniciado. Tx: ${rcDelivery.hash}`);

  // Paso 6: Billetera A confirma la recepción y conformidad
  console.log(`\n[PASO 6] Billetera A confirma conformidad del entregable y libera el pago...`);
  const txConfirm = await purchaseEscrow.connect(walletA).confirmReceipt(agreementId);
  const rcConfirm = await txConfirm.wait();
  console.log(`  ✅ Recepción confirmada. Fondos liberados. Tx: ${rcConfirm.hash}`);

  // Paso 7 & 8: Verificación final de saldos y estado por ambas billeteras
  console.log("\n[PASO 7 & 8] Verificación final de saldos y estado on-chain...");
  const finalBalA = await upecToken.balanceOf(walletA.address);
  const finalBalB = await upecToken.balanceOf(walletB.address);
  const finalEscrowContractBal = await upecToken.balanceOf(escrowAddress);

  console.log(`  💰 Saldo final Billetera A (Comprador): ${hre.ethers.formatUnits(finalBalA, 18)} UPECT`);
  console.log(`  💰 Saldo final Billetera B (Vendedor):  ${hre.ethers.formatUnits(finalBalB, 18)} UPECT (+35.5 UPECT recibidos)`);
  console.log(`  🔒 Saldo retenido restante en Escrow:  ${hre.ethers.formatUnits(finalEscrowContractBal, 18)} UPECT`);

  // Verificación por un tercero (Billetera C / Auditor sin localStorage)
  console.log("\n[CONSULTA INDEPENDIENTE ON-CHAIN POR TERCERO]");
  const agData = await purchaseEscrow.connect(walletC).getAgreement(agreementId);
  const [id, buyer, seller, price, termsCID, deliveryProofCID, deliveryDeadline, inspectionDeadline, state] = agData;
  const statesEnum = ["Created", "Accepted", "Funded", "Delivered", "Completed", "Disputed", "Refunded", "Cancelled"];

  console.log(`  🔍 Auditoría Acuerdo #${id} desde cuenta neutral:`);
  console.log(`     • Términos / Título: ${termsCID}`);
  console.log(`     • Comprador:         ${buyer}`);
  console.log(`     • Vendedor:          ${seller}`);
  console.log(`     • Monto:             ${hre.ethers.formatUnits(price, 18)} UPECT`);
  console.log(`     • Estado:            ${statesEnum[Number(state)]} (Código: ${state})`);
  console.log(`     • Evidencia Entrega: ${deliveryProofCID}`);

  if (Number(state) === 4 && finalBalB >= agreementPrice) {
    console.log("\n================================================================================");
    console.log("🎉 RESULTADO: FLUJO MULTIUSUARIO VERIFICADO ON-CHAIN AL 100%");
    console.log("================================================================================");
  } else {
    throw new Error("El estado final no coincide con Completed");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error en prueba multiusuario:", err);
    process.exit(1);
  });
