const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PurchaseEscrow - Contratos de Compraventa con Custodia UPEC", function () {
  let UPECToken;
  let PurchaseEscrow;
  let token;
  let escrow;

  let admin;
  let buyer;
  let seller;
  let mediator;
  let unauthorized;

  const PRICE = ethers.parseEther("100"); // 100 UPECT
  const INITIAL_MINT = ethers.parseEther("1000");
  const TERMS_CID = "bafybeicr6v23p4o34w76k5y74qlnvsqdln4efx3h677v2f3c7k8k5e4g5a";
  const PROOF_CID = "bafybeigx7v23p4o34w76k5y74qlnvsqdln4efx3h677v2f3c7k8k5e4g5b";
  const DELIVERY_PERIOD = 24 * 3600; // 24 horas (en segundos)
  const THREE_DAYS = 3 * 24 * 3600;

  beforeEach(async function () {
    [admin, buyer, seller, mediator, unauthorized] = await ethers.getSigners();

    // 1. Desplegar Token UPECT
    UPECToken = await ethers.getContractFactory("UPECToken");
    token = await UPECToken.deploy(ethers.parseEther("1000000"), admin.address);
    await token.waitForDeployment();

    // 2. Desplegar PurchaseEscrow vinculado al Token UPECT
    PurchaseEscrow = await ethers.getContractFactory("PurchaseEscrow");
    escrow = await PurchaseEscrow.deploy(await token.getAddress(), admin.address);
    await escrow.waitForDeployment();

    // 3. Asignar rol MEDIATOR_ROLE a la cuenta del mediador
    const mediatorRole = await escrow.MEDIATOR_ROLE();
    await escrow.connect(admin).grantRole(mediatorRole, mediator.address);

    // 4. Dotar al comprador de tokens UPECT
    await token.connect(admin).mint(buyer.address, INITIAL_MINT);
  });

  describe("1. Inicialización y Configuración de Custodia", function () {
    it("Debe vincular correctamente el contrato de la moneda UPECT", async function () {
      expect(await escrow.upectToken()).to.equal(await token.getAddress());
    });

    it("Debe configurar adecuadamente los roles de administración y mediación", async function () {
      const defaultAdminRole = await escrow.DEFAULT_ADMIN_ROLE();
      const mediatorRole = await escrow.MEDIATOR_ROLE();

      expect(await escrow.hasRole(defaultAdminRole, admin.address)).to.be.true;
      expect(await escrow.hasRole(mediatorRole, mediator.address)).to.be.true;
      expect(await escrow.hasRole(mediatorRole, unauthorized.address)).to.be.false;
    });

    it("Debe iniciar con 0 acuerdos registrados", async function () {
      expect(await escrow.getAgreementCount()).to.equal(0);
    });
  });

  describe("2. Ciclo Completo Exitoso de Compraventa (Happy Path)", function () {
    it("Debe ejecutar el flujo completo: Crear -> Aceptar -> Depositar -> Entregar -> Confirmar -> Liberar", async function () {
      // A. Comprador crea el acuerdo
      const createTx = await escrow.connect(buyer).createAgreement(
        seller.address,
        PRICE,
        TERMS_CID,
        DELIVERY_PERIOD
      );

      await expect(createTx)
        .to.emit(escrow, "AgreementCreated")
        .withArgs(1, buyer.address, seller.address, PRICE, TERMS_CID);

      expect(await escrow.getAgreementCount()).to.equal(1);

      // B. Vendedor acepta el acuerdo
      const acceptTx = await escrow.connect(seller).acceptAgreement(1);
      await expect(acceptTx)
        .to.emit(escrow, "AgreementAccepted")
        .withArgs(1, seller.address);

      // C. Comprador aprueba tokens y deposita en custodia (Escrow)
      await token.connect(buyer).approve(await escrow.getAddress(), PRICE);
      const depositTx = await escrow.connect(buyer).depositEscrow(1);

      await expect(depositTx)
        .to.emit(escrow, "EscrowFunded");

      expect(await token.balanceOf(await escrow.getAddress())).to.equal(PRICE);
      expect(await token.balanceOf(buyer.address)).to.equal(INITIAL_MINT - PRICE);

      // D. Vendedor registra entrega del producto o informe
      const deliverTx = await escrow.connect(seller).registerDelivery(1, PROOF_CID);
      await expect(deliverTx)
        .to.emit(escrow, "DeliveryRegistered");

      // E. Comprador confirma recepción satisfactoria
      const initialSellerBalance = await token.balanceOf(seller.address);
      const confirmTx = await escrow.connect(buyer).confirmReceipt(1);

      await expect(confirmTx)
        .to.emit(escrow, "ReceiptConfirmed")
        .withArgs(1, buyer.address, seller.address, PRICE);

      await expect(confirmTx)
        .to.emit(escrow, "PaymentReleased")
        .withArgs(1, seller.address, PRICE);

      // F. Comprobaciones de saldos y estado final
      expect(await token.balanceOf(seller.address)).to.equal(initialSellerBalance + PRICE);
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(0);

      const ag = await escrow.getAgreement(1);
      expect(ag.state).to.equal(4); // AgreementState.Completed
    });
  });

  describe("3. Cancelaciones y Reembolsos", function () {
    it("Debe permitir cancelar el acuerdo antes del depósito sin movimiento de fondos", async function () {
      await escrow.connect(buyer).createAgreement(seller.address, PRICE, TERMS_CID, DELIVERY_PERIOD);

      // Comprador cancela antes de aceptar
      await expect(escrow.connect(buyer).cancelAndRefund(1))
        .to.emit(escrow, "AgreementCancelled")
        .withArgs(1, buyer.address);

      const ag = await escrow.getAgreement(1);
      expect(ag.state).to.equal(7); // AgreementState.Cancelled
    });

    it("Debe permitir al comprador cancelar con 100% de reembolso si el vendedor no entrega en el plazo", async function () {
      // Crear, aceptar y fondear
      await escrow.connect(buyer).createAgreement(seller.address, PRICE, TERMS_CID, DELIVERY_PERIOD);
      await escrow.connect(seller).acceptAgreement(1);
      await token.connect(buyer).approve(await escrow.getAddress(), PRICE);
      await escrow.connect(buyer).depositEscrow(1);

      // Intentar cancelar antes de que venza el plazo debe fallar
      await expect(
        escrow.connect(buyer).cancelAndRefund(1)
      ).to.be.revertedWithCustomError(escrow, "DeliveryDeadlineNotPassed");

      // Avanzar el tiempo más allá del plazo de entrega (24h + 1s)
      await time.increase(DELIVERY_PERIOD + 1);

      // Ahora el comprador puede cancelar y recibir su reembolso íntegro
      const initialBuyerBalance = await token.balanceOf(buyer.address);
      const refundTx = await escrow.connect(buyer).cancelAndRefund(1);

      await expect(refundTx)
        .to.emit(escrow, "AgreementRefunded")
        .withArgs(1, buyer.address, PRICE);

      expect(await token.balanceOf(buyer.address)).to.equal(initialBuyerBalance + PRICE);
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(0);

      const ag = await escrow.getAgreement(1);
      expect(ag.state).to.equal(6); // AgreementState.Refunded
    });

    it("Debe permitir al vendedor cancelar y reembolsar voluntariamente al comprador", async function () {
      await escrow.connect(buyer).createAgreement(seller.address, PRICE, TERMS_CID, DELIVERY_PERIOD);
      await escrow.connect(seller).acceptAgreement(1);
      await token.connect(buyer).approve(await escrow.getAddress(), PRICE);
      await escrow.connect(buyer).depositEscrow(1);

      // Vendedor cancela voluntariamente
      const initialBuyerBalance = await token.balanceOf(buyer.address);
      await escrow.connect(seller).cancelAndRefund(1);

      expect(await token.balanceOf(buyer.address)).to.equal(initialBuyerBalance + PRICE);
      const ag = await escrow.getAgreement(1);
      expect(ag.state).to.equal(6); // AgreementState.Refunded
    });

    it("Debe rechazar intentos de cancelación por parte de terceros no autorizados", async function () {
      await escrow.connect(buyer).createAgreement(seller.address, PRICE, TERMS_CID, DELIVERY_PERIOD);

      await expect(
        escrow.connect(unauthorized).cancelAndRefund(1)
      ).to.be.revertedWithCustomError(escrow, "UnauthorizedCaller");
    });
  });

  describe("4. Gestión de Disputas y Arbitraje Académico", function () {
    beforeEach(async function () {
      // Preparar acuerdo en estado Funded
      await escrow.connect(buyer).createAgreement(seller.address, PRICE, TERMS_CID, DELIVERY_PERIOD);
      await escrow.connect(seller).acceptAgreement(1);
      await token.connect(buyer).approve(await escrow.getAddress(), PRICE);
      await escrow.connect(buyer).depositEscrow(1);
    });

    it("Debe permitir al comprador o al vendedor abrir una disputa formal", async function () {
      const disputeTx = await escrow.connect(buyer).raiseDispute(1, "El entregable no cumple las especificaciones acordadas");

      await expect(disputeTx)
        .to.emit(escrow, "DisputeRaised")
        .withArgs(1, buyer.address, "El entregable no cumple las especificaciones acordadas");

      const ag = await escrow.getAgreement(1);
      expect(ag.state).to.equal(5); // AgreementState.Disputed
    });

    it("Debe rechazar la resolución de disputas por personas sin MEDIATOR_ROLE", async function () {
      await escrow.connect(buyer).raiseDispute(1, "Disputa");

      await expect(
        escrow.connect(unauthorized).resolveDispute(1, 1, PRICE, 0)
      ).to.be.revertedWithCustomError(escrow, "AccessControlUnauthorizedAccount");
    });

    it("Debe resolver a favor del comprador con reembolso íntegro (Resolución 1)", async function () {
      await escrow.connect(buyer).raiseDispute(1, "Falta de entrega");

      const initialBuyerBalance = await token.balanceOf(buyer.address);
      const resolveTx = await escrow.connect(mediator).resolveDispute(1, 1, PRICE, 0);

      await expect(resolveTx)
        .to.emit(escrow, "DisputeResolved")
        .withArgs(1, mediator.address, 1, PRICE, 0);

      expect(await token.balanceOf(buyer.address)).to.equal(initialBuyerBalance + PRICE);
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(0);

      const ag = await escrow.getAgreement(1);
      expect(ag.state).to.equal(6); // AgreementState.Refunded
    });

    it("Debe resolver a favor del vendedor con pago íntegro (Resolución 2)", async function () {
      await escrow.connect(seller).raiseDispute(1, "Comprador no valida la entrega confirmada");

      const initialSellerBalance = await token.balanceOf(seller.address);
      const resolveTx = await escrow.connect(mediator).resolveDispute(1, 2, 0, PRICE);

      await expect(resolveTx)
        .to.emit(escrow, "DisputeResolved")
        .withArgs(1, mediator.address, 2, 0, PRICE);

      expect(await token.balanceOf(seller.address)).to.equal(initialSellerBalance + PRICE);
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(0);

      const ag = await escrow.getAgreement(1);
      expect(ag.state).to.equal(4); // AgreementState.Completed
    });

    it("Debe permitir un acuerdo de compensación parcial dividido (Resolución 3: e.g. 60/40)", async function () {
      await escrow.connect(buyer).raiseDispute(1, "Entrega parcial incompleta");

      const buyerRefund = ethers.parseEther("60");
      const sellerPayment = ethers.parseEther("40");

      const initialBuyerBalance = await token.balanceOf(buyer.address);
      const initialSellerBalance = await token.balanceOf(seller.address);

      await escrow.connect(mediator).resolveDispute(1, 3, buyerRefund, sellerPayment);

      expect(await token.balanceOf(buyer.address)).to.equal(initialBuyerBalance + buyerRefund);
      expect(await token.balanceOf(seller.address)).to.equal(initialSellerBalance + sellerPayment);
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(0);
    });

    it("Debe rechazar dictámenes donde la suma no iguale exactamente el monto depositado", async function () {
      await escrow.connect(buyer).raiseDispute(1, "Error de cálculo");

      const buyerRefund = ethers.parseEther("60");
      const sellerPayment = ethers.parseEther("50"); // Suma 110 (supera 100)

      await expect(
        escrow.connect(mediator).resolveDispute(1, 3, buyerRefund, sellerPayment)
      ).to.be.revertedWithCustomError(escrow, "InvalidDisputeSplit");
    });
  });

  describe("5. Liberación por Vencimiento de Inspección (Timeout)", function () {
    beforeEach(async function () {
      // Crear, aceptar, fondear y registrar entrega
      await escrow.connect(buyer).createAgreement(seller.address, PRICE, TERMS_CID, DELIVERY_PERIOD);
      await escrow.connect(seller).acceptAgreement(1);
      await token.connect(buyer).approve(await escrow.getAddress(), PRICE);
      await escrow.connect(buyer).depositEscrow(1);
      await escrow.connect(seller).registerDelivery(1, PROOF_CID);
    });

    it("Debe rechazar la liberación si el plazo de inspección aún está vigente", async function () {
      await expect(
        escrow.connect(seller).releasePaymentTimeout(1)
      ).to.be.revertedWithCustomError(escrow, "InspectionDeadlineActive");
    });

    it("Debe permitir al vendedor cobrar si el comprador no confirma ni disputa tras 3 días", async function () {
      // Avanzar el tiempo 3 días y 1 segundo
      await time.increase(THREE_DAYS + 1);

      const initialSellerBalance = await token.balanceOf(seller.address);
      await escrow.connect(seller).releasePaymentTimeout(1);

      expect(await token.balanceOf(seller.address)).to.equal(initialSellerBalance + PRICE);
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(0);
    });
  });

  describe("6. Seguridad, Validaciones y Ausencia de Retiro Arbitrario por Admin", function () {
    it("Debe rechazar la creación si el comprador y vendedor son la misma dirección", async function () {
      await expect(
        escrow.connect(buyer).createAgreement(buyer.address, PRICE, TERMS_CID, DELIVERY_PERIOD)
      ).to.be.revertedWithCustomError(escrow, "InvalidParties");
    });

    it("Debe rechazar acuerdos con precio cero o términos vacíos", async function () {
      await expect(
        escrow.connect(buyer).createAgreement(seller.address, 0, TERMS_CID, DELIVERY_PERIOD)
      ).to.be.revertedWithCustomError(escrow, "InvalidPrice");

      await expect(
        escrow.connect(buyer).createAgreement(seller.address, PRICE, "", DELIVERY_PERIOD)
      ).to.be.revertedWithCustomError(escrow, "InvalidTerms");
    });

    it("Debe impedir confirmaciones dobles de pago", async function () {
      // Flujo completo
      await escrow.connect(buyer).createAgreement(seller.address, PRICE, TERMS_CID, DELIVERY_PERIOD);
      await escrow.connect(seller).acceptAgreement(1);
      await token.connect(buyer).approve(await escrow.getAddress(), PRICE);
      await escrow.connect(buyer).depositEscrow(1);
      await escrow.connect(seller).registerDelivery(1, PROOF_CID);

      await escrow.connect(buyer).confirmReceipt(1);

      // Segundo intento de confirmación debe ser rechazado
      await expect(
        escrow.connect(buyer).confirmReceipt(1)
      ).to.be.revertedWithCustomError(escrow, "InvalidState");
    });

    it("Garantía de custodia: El administrador NO puede retirar los fondos depositados por los usuarios", async function () {
      // Fondeamos un acuerdo
      await escrow.connect(buyer).createAgreement(seller.address, PRICE, TERMS_CID, DELIVERY_PERIOD);
      await escrow.connect(seller).acceptAgreement(1);
      await token.connect(buyer).approve(await escrow.getAddress(), PRICE);
      await escrow.connect(buyer).depositEscrow(1);

      // Verificamos que no existe ninguna función withdraw o emergencyWithdraw para el admin
      expect(escrow.emergencyWithdraw).to.be.undefined;
      expect(escrow.adminWithdraw).to.be.undefined;
      expect(escrow.withdraw).to.be.undefined;
    });

    it("Debe registrar y listar adecuadamente los acuerdos de cada usuario", async function () {
      await escrow.connect(buyer).createAgreement(seller.address, PRICE, TERMS_CID, DELIVERY_PERIOD);
      await escrow.connect(buyer).createAgreement(seller.address, PRICE, TERMS_CID, DELIVERY_PERIOD);

      const buyerAgreements = await escrow.getUserAgreements(buyer.address);
      const sellerAgreements = await escrow.getUserAgreements(seller.address);

      expect(buyerAgreements.length).to.equal(2);
      expect(sellerAgreements.length).to.equal(2);
      expect(buyerAgreements[0]).to.equal(1);
      expect(buyerAgreements[1]).to.equal(2);
    });
  });
});
