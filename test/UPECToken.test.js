const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("UPECToken - Moneda Académica ERC-20 UPEC", function () {
  let UPECToken;
  let token;
  let admin;
  let student1;
  let student2;
  let teacher;

  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1,000,000 UPECT
  const FAUCET_AMOUNT = ethers.parseEther("100");       // 100 UPECT
  const ONE_HOUR = 3600;
  const ONE_DAY = 24 * ONE_HOUR; // espera del grifo

  beforeEach(async function () {
    [admin, student1, student2, teacher] = await ethers.getSigners();

    UPECToken = await ethers.getContractFactory("UPECToken");
    token = await UPECToken.deploy(INITIAL_SUPPLY, admin.address);
    await token.waitForDeployment();
  });

  describe("1. Inicialización y Configuración ERC-20", function () {
    it("Debe configurar correctamente el nombre y símbolo del token", async function () {
      expect(await token.name()).to.equal("UPEC Token Demo");
      expect(await token.symbol()).to.equal("UPECT");
      expect(await token.decimals()).to.equal(18);
    });

    it("Debe asignar el suministro inicial al administrador", async function () {
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
      expect(await token.balanceOf(admin.address)).to.equal(INITIAL_SUPPLY);
    });

    it("Debe conceder DEFAULT_ADMIN_ROLE y MINTER_ROLE al administrador inicial", async function () {
      const defaultAdminRole = await token.DEFAULT_ADMIN_ROLE();
      const minterRole = await token.MINTER_ROLE();

      expect(await token.hasRole(defaultAdminRole, admin.address)).to.be.true;
      expect(await token.hasRole(minterRole, admin.address)).to.be.true;
      expect(await token.hasRole(minterRole, student1.address)).to.be.false;
    });

    it("Debe incluir el aviso académico de prototipo sin valor financiero", async function () {
      const disclaimer = await token.ACADEMIC_DISCLAIMER();
      expect(disclaimer).to.include("Token academico de demostracion");
    });
  });

  describe("2. Emisión Restringida por Roles (Mint)", function () {
    it("Debe permitir al minter autorizado emitir tokens a cualquier estudiante", async function () {
      const mintAmount = ethers.parseEther("500");
      await token.connect(admin).mint(student1.address, mintAmount);

      expect(await token.balanceOf(student1.address)).to.equal(mintAmount);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY + mintAmount);
    });

    it("Debe rechazar la emisión si el llamante no posee el MINTER_ROLE", async function () {
      const mintAmount = ethers.parseEther("500");
      const minterRole = await token.MINTER_ROLE();

      await expect(
        token.connect(student1).mint(student2.address, mintAmount)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(student1.address, minterRole);
    });

    it("Debe permitir al admin otorgar y revocar el MINTER_ROLE", async function () {
      const minterRole = await token.MINTER_ROLE();

      // Otorgar rol a teacher
      await token.connect(admin).grantRole(minterRole, teacher.address);
      expect(await token.hasRole(minterRole, teacher.address)).to.be.true;

      // Teacher ahora puede mintear
      await token.connect(teacher).mint(student2.address, ethers.parseEther("250"));
      expect(await token.balanceOf(student2.address)).to.equal(ethers.parseEther("250"));

      // Revocar rol
      await token.connect(admin).revokeRole(minterRole, teacher.address);
      expect(await token.hasRole(minterRole, teacher.address)).to.be.false;

      // Intentar mintear de nuevo debe fallar
      await expect(
        token.connect(teacher).mint(student2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("Debe rechazar la emisión hacia la dirección cero o cantidad cero", async function () {
      await expect(
        token.connect(admin).mint(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "ZeroAddressDetected");

      await expect(
        token.connect(admin).mint(student1.address, 0)
      ).to.be.revertedWithCustomError(token, "InvalidAmount");
    });
  });

  describe("3. Grifo Académico (Faucet) con Límites y Cooldown", function () {
    it("Debe permitir a un estudiante solicitar tokens del Faucet exitosamente", async function () {
      const initialBalance = await token.balanceOf(student1.address);
      expect(initialBalance).to.equal(0);

      const tx = await token.connect(student1).requestFaucetTokens();

      await expect(tx)
        .to.emit(token, "FaucetDispensed")
        .withArgs(student1.address, FAUCET_AMOUNT);

      expect(await token.balanceOf(student1.address)).to.equal(FAUCET_AMOUNT);
    });

    it("Debe impedir solicitudes repetidas antes de que expire el tiempo de espera (cooldown)", async function () {
      // Primera solicitud exitosa
      await token.connect(student1).requestFaucetTokens();

      // Segunda solicitud inmediata debe ser rechazada
      await expect(
        token.connect(student1).requestFaucetTokens()
      ).to.be.revertedWithCustomError(token, "FaucetCooldownActive");
    });

    it("Debe reportar correctamente el tiempo restante de cooldown", async function () {
      await token.connect(student1).requestFaucetTokens();
      const remaining = await token.getRemainingFaucetCooldown(student1.address);
      expect(remaining).to.be.gt(0);
      expect(remaining).to.be.lte(ONE_DAY);
      expect(remaining).to.be.gt(ONE_DAY - 60);

      // Usuario que nunca ha solicitado debe tener 0
      expect(await token.getRemainingFaucetCooldown(student2.address)).to.equal(0);
    });

    it("Debe permitir solicitar nuevamente una vez transcurrido el tiempo de cooldown", async function () {
      await token.connect(student1).requestFaucetTokens();

      // Una hora después todavía debe rechazarse
      await time.increase(ONE_HOUR);
      await expect(token.connect(student1).requestFaucetTokens()).to.be.revertedWithCustomError(token, "FaucetCooldownActive");

      // Avanzar hasta completar 24 horas y 1 segundo
      await time.increase(ONE_DAY - ONE_HOUR + 1);

      // Ahora el cooldown expiró y debe permitir la recarga
      await token.connect(student1).requestFaucetTokens();
      expect(await token.balanceOf(student1.address)).to.equal(FAUCET_AMOUNT * 2n);
    });

    it("Debe permitir al admin reconfigurar los parámetros del Faucet", async function () {
      const newAmount = ethers.parseEther("200");
      const newCooldown = 2 * ONE_HOUR;

      const tx = await token.connect(admin).setFaucetConfig(newAmount, newCooldown);

      await expect(tx)
        .to.emit(token, "FaucetConfigUpdated")
        .withArgs(newAmount, newCooldown);

      expect(await token.faucetAmount()).to.equal(newAmount);
      expect(await token.faucetCooldown()).to.equal(newCooldown);
    });

    it("Debe rechazar la reconfiguración del Faucet por usuarios no autorizados", async function () {
      await expect(
        token.connect(student1).setFaucetConfig(ethers.parseEther("500"), 60)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });

  describe("4. Transferencias y Operaciones Estándar ERC-20", function () {
    beforeEach(async function () {
      // Dotar a student1 de 500 UPECT
      await token.connect(admin).mint(student1.address, ethers.parseEther("500"));
    });

    it("Debe permitir transferencias directas entre usuarios", async function () {
      const transferAmount = ethers.parseEther("150");

      await token.connect(student1).transfer(student2.address, transferAmount);

      expect(await token.balanceOf(student1.address)).to.equal(ethers.parseEther("350"));
      expect(await token.balanceOf(student2.address)).to.equal(transferAmount);
    });

    it("Debe rechazar transferencias que superen el saldo disponible", async function () {
      const excessiveAmount = ethers.parseEther("501");

      await expect(
        token.connect(student1).transfer(student2.address, excessiveAmount)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });

    it("Debe permitir transferencias delegadas (approve y transferFrom)", async function () {
      const approvedAmount = ethers.parseEther("100");

      // student1 aprueba a teacher para gastar 100 UPECT
      await token.connect(student1).approve(teacher.address, approvedAmount);
      expect(await token.allowance(student1.address, teacher.address)).to.equal(approvedAmount);

      // teacher ejecuta transferFrom hacia student2
      await token.connect(teacher).transferFrom(student1.address, student2.address, approvedAmount);

      expect(await token.balanceOf(student1.address)).to.equal(ethers.parseEther("400"));
      expect(await token.balanceOf(student2.address)).to.equal(approvedAmount);
      expect(await token.allowance(student1.address, teacher.address)).to.equal(0);
    });

    it("Debe rechazar transferFrom si supera el allowance aprobado", async function () {
      await token.connect(student1).approve(teacher.address, ethers.parseEther("50"));

      await expect(
        token.connect(teacher).transferFrom(student1.address, student2.address, ethers.parseEther("51"))
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
    });
  });
});
