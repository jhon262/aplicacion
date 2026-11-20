const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ProjectRegistry - Sistema Web3 UPEC", function () {
  let registry;
  let secretaria, autor, d1, d2, d3, d4, externo;
  let DOCENTE_ROLE;

  const TITLE = "Arquitecturas Descentralizadas Web3 para la UPEC";
  const DESC = "Registro, evaluación y certificación de trabajos de titulación.";
  const CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
  const HASH = ethers.sha256(ethers.toUtf8Bytes("contenido del PDF de la tesis"));
  const HASH2 = ethers.sha256(ethers.toUtf8Bytes("otro PDF"));
  const SEVEN_DAYS = 7 * 24 * 60 * 60;
  const Status = { Pending: 0, Approved: 1, Rejected: 2 };

  async function registrar(from = autor, hash = HASH) {
    await registry.connect(from).registerProject(TITLE, DESC, CID, hash);
    return await registry.totalProjects();
  }
  async function asignar(id = 1n) {
    await registry.connect(secretaria).assignTribunal(id, [d1.address, d2.address, d3.address]);
  }

  beforeEach(async function () {
    [secretaria, autor, d1, d2, d3, d4, externo] = await ethers.getSigners();
    const F = await ethers.getContractFactory("ProjectRegistry");
    registry = await F.deploy(secretaria.address);
    await registry.waitForDeployment();
    DOCENTE_ROLE = await registry.DOCENTE_ROLE();
    for (const d of [d1, d2, d3, d4]) {
      await registry.connect(secretaria).grantRole(DOCENTE_ROLE, d.address);
    }
  });

  describe("1. Inicialización y roles", function () {
    it("Debe configurar el nombre y el símbolo del certificado ERC-721", async function () {
      expect(await registry.name()).to.equal("Certificado Academico UPEC (Prototipo)");
      expect(await registry.symbol()).to.equal("UPEC-CERT");
    });

    it("Debe asignar el rol de administración a Secretaría", async function () {
      expect(await registry.hasRole(await registry.DEFAULT_ADMIN_ROLE(), secretaria.address)).to.equal(true);
    });

    it("Debe iniciar con 0 proyectos y un tribunal de 3 integrantes", async function () {
      expect(await registry.totalProjects()).to.equal(0);
      expect(await registry.TRIBUNAL_SIZE()).to.equal(3);
    });

    it("Debe impedir que alguien sin rol de administración otorgue el rol docente", async function () {
      await expect(registry.connect(externo).grantRole(DOCENTE_ROLE, externo.address))
        .to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });
  });

  describe("2. Registro, integridad del PDF y edición", function () {
    it("Debe registrar un proyecto con su CID y el hash del PDF, y emitir el evento", async function () {
      await expect(registry.connect(autor).registerProject(TITLE, DESC, CID, HASH))
        .to.emit(registry, "ProjectRegistered")
        .withArgs(1, autor.address, TITLE, CID, HASH);
      const p = await registry.projects(1);
      expect(p.documentHash).to.equal(HASH);
      expect(p.submitter).to.equal(autor.address);
      expect(p.status).to.equal(Status.Pending);
      expect(p.votingDeadline).to.equal(0);
    });

    it("Debe rechazar el registro sin título, sin CID o sin hash", async function () {
      await expect(registry.connect(autor).registerProject("", DESC, CID, HASH))
        .to.be.revertedWithCustomError(registry, "EmptyTitle");
      await expect(registry.connect(autor).registerProject(TITLE, DESC, "", HASH))
        .to.be.revertedWithCustomError(registry, "EmptyCID");
      await expect(registry.connect(autor).registerProject(TITLE, DESC, CID, ethers.ZeroHash))
        .to.be.revertedWithCustomError(registry, "EmptyDocumentHash");
    });

    it("Debe rechazar el registro de un PDF ya registrado (RF-11)", async function () {
      await registrar();
      await expect(registry.connect(externo).registerProject("Otro título", DESC, CID, HASH))
        .to.be.revertedWithCustomError(registry, "DuplicateDocument").withArgs(1);
    });

    it("Debe verificar un PDF por su hash", async function () {
      await registrar();
      const r = await registry.verifyDocument(HASH);
      expect(r.registered).to.equal(true);
      expect(r.projectId).to.equal(1);
      const r2 = await registry.verifyDocument(HASH2);
      expect(r2.registered).to.equal(false);
    });

    it("Debe listar todos los proyectos registrados", async function () {
      await registrar();
      await registrar(externo, HASH2);
      const all = await registry.getAllProjects();
      expect(all.length).to.equal(2);
      expect(all[1].submitter).to.equal(externo.address);
    });

    it("Debe declarar soporte de las interfaces ERC-721 y AccessControl", async function () {
      expect(await registry.supportsInterface("0x80ac58cd")).to.equal(true);
      expect(await registry.supportsInterface("0x7965db0b")).to.equal(true);
    });

    it("Debe permitir al autor editar título y descripción antes del primer voto (RF-12)", async function () {
      await registrar();
      await expect(registry.connect(autor).updateProject(1, "Título corregido", "Nueva descripción"))
        .to.emit(registry, "ProjectUpdated");
      expect((await registry.projects(1)).title).to.equal("Título corregido");
    });

    it("Debe impedir la edición por terceros o después del primer voto", async function () {
      await registrar();
      await expect(registry.connect(externo).updateProject(1, "X", "Y"))
        .to.be.revertedWithCustomError(registry, "NotSubmitter");
      await asignar();
      await registry.connect(d1).vote(1, true);
      await expect(registry.connect(autor).updateProject(1, "X", "Y"))
        .to.be.revertedWithCustomError(registry, "VotingAlreadyStarted");
    });
  });

  describe("3. Asignación del tribunal", function () {
    it("Debe permitir a Secretaría asignar tres docentes e iniciar el plazo de votación", async function () {
      await registrar();
      await expect(registry.connect(secretaria).assignTribunal(1, [d1.address, d2.address, d3.address]))
        .to.emit(registry, "TribunalAssigned");
      expect(await registry.getTribunal(1)).to.deep.equal([d1.address, d2.address, d3.address]);
      expect((await registry.projects(1)).votingDeadline).to.equal((await time.latest()) + SEVEN_DAYS);
    });

    it("Debe impedir que alguien sin rol de administración asigne el tribunal", async function () {
      await registrar();
      await expect(registry.connect(d1).assignTribunal(1, [d1.address, d2.address, d3.address]))
        .to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("Debe rechazar integrantes sin rol docente, repetidos o que sean el autor", async function () {
      await registrar();
      await expect(registry.connect(secretaria).assignTribunal(1, [d1.address, d2.address, externo.address]))
        .to.be.revertedWithCustomError(registry, "InvalidTribunalMember").withArgs(externo.address);
      await expect(registry.connect(secretaria).assignTribunal(1, [d1.address, d1.address, d2.address]))
        .to.be.revertedWithCustomError(registry, "InvalidTribunalMember").withArgs(d1.address);
      await registry.connect(secretaria).grantRole(DOCENTE_ROLE, autor.address);
      await expect(registry.connect(secretaria).assignTribunal(1, [autor.address, d1.address, d2.address]))
        .to.be.revertedWithCustomError(registry, "InvalidTribunalMember").withArgs(autor.address);
    });

    it("Debe impedir asignar el tribunal dos veces", async function () {
      await registrar();
      await asignar();
      await expect(registry.connect(secretaria).assignTribunal(1, [d2.address, d3.address, d4.address]))
        .to.be.revertedWithCustomError(registry, "TribunalAlreadyAssigned");
    });
  });

  describe("4. Votación del tribunal", function () {
    beforeEach(async function () {
      await registrar();
    });

    it("Debe rechazar votos antes de asignar el tribunal", async function () {
      await expect(registry.connect(d1).vote(1, true))
        .to.be.revertedWithCustomError(registry, "TribunalNotAssigned");
    });

    it("Debe permitir votar a cada integrante y emitir VoteCast", async function () {
      await asignar();
      await expect(registry.connect(d1).vote(1, true))
        .to.emit(registry, "VoteCast").withArgs(1, d1.address, true, 1, 0);
    });

    it("Debe rechazar el voto de un docente que no integra el tribunal", async function () {
      await asignar();
      await expect(registry.connect(d4).vote(1, true))
        .to.be.revertedWithCustomError(registry, "NotTribunalMember");
    });

    it("Debe rechazar el voto de cuentas externas y del autor", async function () {
      await asignar();
      await expect(registry.connect(externo).vote(1, true))
        .to.be.revertedWithCustomError(registry, "NotTribunalMember");
      await expect(registry.connect(autor).vote(1, true))
        .to.be.revertedWithCustomError(registry, "NotTribunalMember");
    });

    it("Debe impedir que un docente vote dos veces", async function () {
      await asignar();
      await registry.connect(d1).vote(1, true);
      await expect(registry.connect(d1).vote(1, true))
        .to.be.revertedWithCustomError(registry, "AlreadyVoted");
    });

    it("Debe rechazar votos después del plazo", async function () {
      await asignar();
      await time.increase(SEVEN_DAYS + 1);
      await expect(registry.connect(d1).vote(1, true))
        .to.be.revertedWithCustomError(registry, "VotingClosed");
    });
  });

  describe("5. Aprobación unánime y certificado", function () {
    beforeEach(async function () {
      await registrar();
      await asignar();
    });

    it("Debe aprobar con los tres votos favorables y emitir el certificado al autor", async function () {
      await registry.connect(d1).vote(1, true);
      await registry.connect(d2).vote(1, true);
      expect((await registry.projects(1)).status).to.equal(Status.Pending);
      await expect(registry.connect(d3).vote(1, true))
        .to.emit(registry, "CertificateIssued").withArgs(1, 1, autor.address, `ipfs://${CID}`);
      const p = await registry.projects(1);
      expect(p.status).to.equal(Status.Approved);
      expect(p.certificateId).to.equal(1);
      expect(await registry.ownerOf(1)).to.equal(autor.address);
      expect(await registry.projectByCertificate(1)).to.equal(1);
    });

    it("Debe rechazar el proyecto con un solo voto en contra", async function () {
      await registry.connect(d1).vote(1, true);
      await registry.connect(d2).vote(1, true);
      await expect(registry.connect(d3).vote(1, false))
        .to.emit(registry, "ProjectFinalized").withArgs(1, Status.Rejected, 0);
      expect((await registry.projects(1)).status).to.equal(Status.Rejected);
      await expect(registry.ownerOf(1)).to.be.revertedWithCustomError(registry, "ERC721NonexistentToken");
    });

    it("Debe impedir votar en un proyecto ya rechazado", async function () {
      await registry.connect(d1).vote(1, false);
      await expect(registry.connect(d2).vote(1, true))
        .to.be.revertedWithCustomError(registry, "NotPending");
    });

    it("Debe rechazar por vencimiento si faltan votos y el plazo terminó", async function () {
      await registry.connect(d1).vote(1, true);
      await expect(registry.finalizeProject(1)).to.be.revertedWithCustomError(registry, "VotingStillOpen");
      await time.increase(SEVEN_DAYS + 1);
      await registry.connect(externo).finalizeProject(1);
      expect((await registry.projects(1)).status).to.equal(Status.Rejected);
    });

    it("Debe impedir finalizar un proyecto ya procesado", async function () {
      await registry.connect(d1).vote(1, false);
      await time.increase(SEVEN_DAYS + 1);
      await expect(registry.finalizeProject(1)).to.be.revertedWithCustomError(registry, "NotPending");
    });
  });

  describe("6. Certificado intransferible (soulbound)", function () {
    beforeEach(async function () {
      await registrar();
      await asignar();
      for (const d of [d1, d2, d3]) await registry.connect(d).vote(1, true);
    });

    it("Debe impedir transferir el certificado", async function () {
      await expect(registry.connect(autor).transferFrom(autor.address, externo.address, 1))
        .to.be.revertedWithCustomError(registry, "SoulboundCertificate");
      await expect(
        registry.connect(autor)["safeTransferFrom(address,address,uint256)"](autor.address, externo.address, 1)
      ).to.be.revertedWithCustomError(registry, "SoulboundCertificate");
    });

    it("Debe impedir aprobaciones sobre el certificado", async function () {
      await expect(registry.connect(autor).approve(externo.address, 1))
        .to.be.revertedWithCustomError(registry, "SoulboundCertificate");
      await expect(registry.connect(autor).setApprovalForAll(externo.address, true))
        .to.be.revertedWithCustomError(registry, "SoulboundCertificate");
    });

    it("Debe exponer el URI del certificado con el CID de IPFS", async function () {
      expect(await registry.tokenURI(1)).to.equal(`ipfs://${CID}`);
    });
  });
});
