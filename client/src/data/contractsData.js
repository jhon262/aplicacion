// Catálogo Académico de Smart Contracts para Demostración e Investigación (UPEC)

export const CONTRACTS_CATALOG = {
  projectRegistry: {
    id: 'project-registry',
    name: 'ProjectRegistry.sol',
    title: 'Contrato Maestro de Titulación, DAO y Certificación NFT',
    standard: 'ERC-721 URIStorage + Ownable',
    compiler: 'Solidity ^0.8.28',
    network: 'Hardhat Localhost (EVM 1337 / 31337)',
    description:
      'Contrato descentralizado principal que gestiona el registro de tesis de grado, la votación con quórum mínimo de 3 docentes evaluadores y la acuñación automática del Certificado de Demostración en Token NFT ERC-721.',
    functions: [
      {
        name: 'registerProject(string title, string description, string ipfsCID)',
        visibility: 'external',
        description: 'Registra un nuevo trabajo de titulación vinculando su hash inmutable de IPFS e iniciando el plazo de 7 días de votación DAO.',
        gas: '~145,000 gas',
      },
      {
        name: 'vote(uint256 projectId, bool support)',
        visibility: 'external',
        description: 'Emite el voto criptográfico del docente (a favor o en contra) verificando que no haya votado previamente y que el plazo esté vigente.',
        gas: '~68,000 gas',
      },
      {
        name: 'finalizeProject(uint256 projectId)',
        visibility: 'external',
        description: 'Cierra la votación. Si se alcanzó el quórum de 3 votos a favor, mintea automáticamente el Token NFT ERC-721 (UPEC-CERT) a nombre del autor.',
        gas: '~210,000 gas',
      },
      {
        name: 'getAllProjects()',
        visibility: 'external view returns (Project[])',
        description: 'Devuelve la lista completa de todas las tesis y proyectos registrados en la universidad.',
        gas: '0 gas (View)',
      },
      {
        name: 'tokenURI(uint256 tokenId)',
        visibility: 'public view returns (string)',
        description: 'Devuelve la URI de IPFS con los metadatos inmutables del certificado de demostración NFT.',
        gas: '0 gas (View)',
      },
    ],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ProjectRegistry
 * @author Sistema de Tesis Web3 - Universidad Politécnica Estatal del Carchi (UPEC)
 * @notice Contrato inteligente para la validación, trazabilidad, votación DAO y certificación NFT de proyectos digitales.
 * @dev Hereda de ERC721URIStorage (OpenZeppelin 5.x) y Ownable.
 */
contract ProjectRegistry is ERC721URIStorage, Ownable {

    enum ProjectStatus {
        Pending,   // En proceso de votación
        Approved,  // Aprobado por la DAO y certificado con NFT
        Rejected   // Rechazado (por mayoría de votos en contra o falta de quórum)
    }

    struct Project {
        uint256 id;
        string title;
        string description;
        string ipfsMetadataCID; // Hash IPFS con la metadata completa del documento
        address submitter;      // Autor o estudiante responsable del proyecto
        uint256 votesFor;       // Votos a favor del Tribunal
        uint256 votesAgainst;   // Votos en contra
        uint256 votingDeadline; // Marca de tiempo (timestamp) de finalización
        ProjectStatus status;   // Estado actual del proyecto
        uint256 certificateId;  // ID del token NFT emitido (0 si no está aprobado)
    }

    uint256 public constant MIN_QUORUM = 3;
    uint256 public constant DEFAULT_VOTING_DURATION = 7 days;

    uint256 private _projectCount;
    uint256 private _tokenCount;

    mapping(uint256 => Project) public projects;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProjectRegistered(uint256 indexed projectId, address indexed submitter, string title, string ipfsMetadataCID, uint256 votingDeadline);
    event VoteCast(uint256 indexed projectId, address indexed voter, bool support, uint256 currentVotesFor, uint256 currentVotesAgainst);
    event ProjectFinalized(uint256 indexed projectId, ProjectStatus indexed status, uint256 certificateId);
    event CertificateIssued(uint256 indexed projectId, uint256 indexed tokenId, address indexed recipient, string tokenURI);

    constructor(address initialOwner)
        ERC721("Certificado de Grado UPEC Web3", "UPEC-CERT")
        Ownable(initialOwner)
    {}

    function registerProject(string calldata title, string calldata description, string calldata ipfsMetadataCID) external returns (uint256) {
        require(bytes(title).length > 0, "Titulo no puede estar vacio");
        require(bytes(ipfsMetadataCID).length > 0, "CID de IPFS requerido");

        _projectCount++;
        uint256 newId = _projectCount;

        projects[newId] = Project({
            id: newId,
            title: title,
            description: description,
            ipfsMetadataCID: ipfsMetadataCID,
            submitter: msg.sender,
            votesFor: 0,
            votesAgainst: 0,
            votingDeadline: block.timestamp + DEFAULT_VOTING_DURATION,
            status: ProjectStatus.Pending,
            certificateId: 0
        });

        emit ProjectRegistered(newId, msg.sender, title, ipfsMetadataCID, block.timestamp + DEFAULT_VOTING_DURATION);
        return newId;
    }

    function vote(uint256 projectId, bool support) external {
        Project storage p = projects[projectId];
        require(p.id != 0, "Proyecto no existe");
        require(p.status == ProjectStatus.Pending, "Proyecto no esta en votacion");
        require(!hasVoted[projectId][msg.sender], "Ya has votado en este proyecto");

        hasVoted[projectId][msg.sender] = true;

        if (support) {
            p.votesFor++;
        } else {
            p.votesAgainst++;
        }

        emit VoteCast(projectId, msg.sender, support, p.votesFor, p.votesAgainst);

        if (p.votesFor + p.votesAgainst >= MIN_QUORUM) {
            _finalize(projectId);
        }
    }

    function _finalize(uint256 projectId) internal {
        Project storage p = projects[projectId];
        if (p.votesFor > p.votesAgainst && (p.votesFor + p.votesAgainst) >= MIN_QUORUM) {
            p.status = ProjectStatus.Approved;
            _tokenCount++;
            uint256 newTokenId = _tokenCount;
            p.certificateId = newTokenId;

            _safeMint(p.submitter, newTokenId);
            _setTokenURI(newTokenId, string(abi.encodePacked("ipfs://", p.ipfsMetadataCID)));

            emit CertificateIssued(projectId, newTokenId, p.submitter, string(abi.encodePacked("ipfs://", p.ipfsMetadataCID)));
            emit ProjectFinalized(projectId, ProjectStatus.Approved, newTokenId);
        } else {
            p.status = ProjectStatus.Rejected;
            emit ProjectFinalized(projectId, ProjectStatus.Rejected, 0);
        }
    }
}`,
  },

  upecToken: {
    id: 'upec-token',
    name: 'UPECToken.sol',
    title: 'Moneda Académica UPEC Token Demo (UPECT)',
    standard: 'ERC-20 + AccessControl (OpenZeppelin 5.x)',
    compiler: 'Solidity ^0.8.28',
    network: 'Hardhat Localhost (EVM 1337 / 31337)',
    description:
      'Token fungible académico de investigación con 18 decimales. Incluye mecanismo de Grifo (Faucet) con límites de tiempo y cantidad por billetera, además de transferencias directas sin valor financiero real.',
    functions: [
      {
        name: 'requestTokens()',
        visibility: 'external',
        description: 'Reclama 100 UPECT de demostración del faucet académico respetando el tiempo de enfriamiento.',
        gas: '~62,000 gas',
      },
      {
        name: 'transfer(address to, uint256 amount)',
        visibility: 'external returns (bool)',
        description: 'Transfiere tokens UPECT entre billeteras de estudiantes, docentes o servicios universitarios.',
        gas: '~51,000 gas',
      },
      {
        name: 'approve(address spender, uint256 amount)',
        visibility: 'external returns (bool)',
        description: 'Autoriza al contrato PurchaseEscrow a custodiar tokens en acuerdos de compraventa.',
        gas: '~46,000 gas',
      },
      {
        name: 'balanceOf(address account)',
        visibility: 'external view returns (uint256)',
        description: 'Consulta el saldo disponible de tokens UPECT de una dirección.',
        gas: '0 gas (View)',
      },
      {
        name: 'getRemainingFaucetCooldown(address account)',
        visibility: 'external view returns (uint256)',
        description: 'Devuelve los segundos restantes para que una billetera pueda volver a solicitar tokens del faucet.',
        gas: '0 gas (View)',
      },
    ],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract UPECToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    string public constant ACADEMIC_DISCLAIMER = "Token academico de demostracion. Sin valor financiero real.";

    uint256 public faucetAmount;
    uint256 public faucetCooldown;
    mapping(address => uint256) public lastFaucetRequest;

    event FaucetDispensed(address indexed recipient, uint256 amount);

    constructor(uint256 initialSupply, address admin) ERC20("UPEC Token Demo", "UPECT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        faucetAmount = 100 * 10**decimals();
        faucetCooldown = 1 days;
        if (initialSupply > 0) {
            _mint(admin, initialSupply);
        }
    }

    function requestTokens() external {
        require(block.timestamp >= lastFaucetRequest[msg.sender] + faucetCooldown, "Cooldown activo");
        lastFaucetRequest[msg.sender] = block.timestamp;
        _mint(msg.sender, faucetAmount);
        emit FaucetDispensed(msg.sender, faucetAmount);
    }
}`,
  },

  purchaseEscrow: {
    id: 'purchase-escrow',
    name: 'PurchaseEscrow.sol',
    title: 'Contrato de Custodia Descentralizada (PurchaseEscrow)',
    standard: 'Escrow + SafeERC20 + ReentrancyGuard',
    compiler: 'Solidity ^0.8.28',
    network: 'Hardhat Localhost (EVM 1337 / 31337)',
    description:
      'Smart Contract de custodia bilateral para acuerdos de compraventa académica. Gestiona propuestas, depósitos en UPECT, confirmación de entregas, reembolsos y mediación académica de demostración con plazo de inspección de 3 días.',
    functions: [
      {
        name: 'createAgreement(address seller, uint256 amount, string title, string conditionHash)',
        visibility: 'external returns (uint256)',
        description: 'Crea una nueva propuesta de compraventa indicando el vendedor, el precio en UPECT y los términos.',
        gas: '~180,000 gas',
      },
      {
        name: 'acceptAgreement(uint256 agreementId)',
        visibility: 'external',
        description: 'Formaliza la aceptación del acuerdo bilateral entre comprador y vendedor.',
        gas: '~48,000 gas',
      },
      {
        name: 'depositEscrow(uint256 agreementId)',
        visibility: 'external nonReentrant',
        description: 'Transfiere los tokens UPECT del comprador a la custodia del contrato inteligente.',
        gas: '~95,000 gas',
      },
      {
        name: 'registerDelivery(uint256 agreementId, string evidenceCID)',
        visibility: 'external nonReentrant',
        description: 'El vendedor registra el identificador de entrega e inicia el plazo de inspección de 3 días.',
        gas: '~72,000 gas',
      },
      {
        name: 'confirmReceipt(uint256 agreementId)',
        visibility: 'external nonReentrant',
        description: 'El comprador manifiesta conformidad y libera los fondos retenidos al vendedor.',
        gas: '~68,000 gas',
      },
      {
        name: 'resolveDispute(uint256 agreementId, uint256 buyerPercent, uint256 sellerPercent)',
        visibility: 'external onlyRole(MEDIATOR_ROLE)',
        description: 'El Mediador Académico resuelve una controversia distribuyendo los fondos proporcionalmente.',
        gas: '~85,000 gas',
      },
    ],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract PurchaseEscrow is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    enum AgreementState { Created, Accepted, Funded, Delivered, Completed, Disputed, Refunded, Cancelled }
    bytes32 public constant MEDIATOR_ROLE = keccak256("MEDIATOR_ROLE");
    uint256 public constant DEFAULT_INSPECTION_PERIOD = 3 days;
    IERC20 public immutable paymentToken;

    struct Agreement {
        uint256 id;
        string title;
        address buyer;
        address seller;
        uint256 amount;
        AgreementState state;
        uint256 deliveredAt;
    }

    mapping(uint256 => Agreement) public agreements;
    uint256 public agreementCounter;
}`,
  },

  actas: {
    id: 'actas-upec',
    name: 'ActasDeGradoUPEC.sol',
    title: 'Actas de Demostración de Examen Complexivo y Sustentación Oral',
    standard: 'ERC-721 / UPEC-ACTAS',
    compiler: 'Solidity ^0.8.28',
    network: 'Hardhat Localhost (EVM 1337 / 31337)',
    description:
      'Smart Contract especializado en la digitalización, calificación cuantitativa y firma digital del Tribunal Evaluador para actas de grado en pregrado.',
    functions: [
      {
        name: 'emitirActa(string estudiante, uint256 notaOral, uint256 notaEscrita, string ipfsCID)',
        visibility: 'external onlyOwner returns (uint256)',
        description: 'Registra el acta final con las calificaciones del jurado y acuña el NFT conmemorativo.',
        gas: '~185,000 gas',
      },
      {
        name: 'firmarTribunal(uint256 actaId, bytes ecdsaSignature)',
        visibility: 'external',
        description: 'Registra la firma criptográfica asimétrica de cada docente miembro del tribunal.',
        gas: '~54,000 gas',
      },
      {
        name: 'consultarActa(uint256 actaId)',
        visibility: 'external view returns (Acta)',
        description: 'Retorna los datos del acta de demostración para verificación pública.',
        gas: '0 gas (View)',
      },
    ],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ActasDeGradoUPEC
 * @notice Contrato inteligente para la emisión inmutable de Actas de Examen Oral y Grado.
 * @dev Universidad Politécnica Estatal del Carchi - FIACA.
 */
contract ActasDeGradoUPEC is ERC721URIStorage, Ownable {

    struct ActaGrado {
        uint256 actaId;
        string estudiante;
        string cedula;
        string carrera;
        uint256 calificacionOral;    // Escala sobre 10 puntos (ej. 985 para 9.85/10)
        uint256 calificacionEscrita; // Escala sobre 10 puntos (ej. 970 para 9.70/10)
        string ipfsActaFirmada;
        address presidenteTribunal;
        address directorTesis;
        address vocalCalificador;
        uint256 timestamp;
    }

    mapping(uint256 => ActaGrado) public actas;
    uint256 public totalActas;

    event ActaEmitida(uint256 indexed actaId, string estudiante, address indexed presidente);

    constructor() ERC721("Acta de Grado Demo UPEC", "UPEC-ACTA") Ownable(msg.sender) {}

    function emitirActa(
        string memory estudiante,
        string memory cedula,
        string memory carrera,
        uint256 notaOral,
        uint256 notaEscrita,
        string memory ipfsCID,
        address presidente,
        address director,
        address vocal
    ) external onlyOwner returns (uint256) {
        totalActas++;
        uint256 newId = totalActas;
        actas[newId] = ActaGrado({
            actaId: newId,
            estudiante: estudiante,
            cedula: cedula,
            carrera: carrera,
            calificacionOral: notaOral,
            calificacionEscrita: notaEscrita,
            ipfsActaFirmada: ipfsCID,
            presidenteTribunal: presidente,
            directorTesis: director,
            vocalCalificador: vocal,
            timestamp: block.timestamp
        });

        _mint(msg.sender, newId);
        _setTokenURI(newId, string(abi.encodePacked("ipfs://", ipfsCID)));

        emit ActaEmitida(newId, estudiante, presidente);
        return newId;
    }
}`,
  },

  posgrado: {
    id: 'posgrado-upec',
    name: 'PosgradoMasterUPEC.sol',
    title: 'Títulos y Diplomas de Maestría & Posgrado',
    standard: 'ERC-721 / UPEC-MASTER',
    compiler: 'Solidity ^0.8.28',
    network: 'Hardhat Localhost (EVM 31337)',
    description:
      'Smart Contract de la Dirección de Posgrado para la emisión de títulos de Magíster, Especialista y Doctorado con enlace de registro a SENESCYT.',
    functions: [
      {
        name: 'otorgarTitulo(address recipient, string magister, string programa, string mencion, string ipfsCID)',
        visibility: 'external onlyOwner returns (uint256)',
        description: 'Emite el título de cuarto nivel en la blockchain de la UPEC.',
        gas: '~198,000 gas',
      },
      {
        name: 'verificarTitulo(uint256 tokenId)',
        visibility: 'external view returns (bool, string memory)',
        description: 'Permite a empleadores y universidades extranjeras verificar la autenticidad del título.',
        gas: '0 gas (View)',
      },
    ],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PosgradoMasterUPEC
 * @notice Acreditación y Titulación de Posgrados, Maestrías y Doctorados UPEC.
 */
contract PosgradoMasterUPEC is ERC721URIStorage, Ownable {

    struct TituloPosgrado {
        uint256 id;
        string magister;
        string programaMaestria;
        string mencion;
        string registroSenescyt;
        string ipfsMetadata;
        uint256 fechaGraduacion;
    }

    mapping(uint256 => TituloPosgrado) public titulos;
    uint256 public totalTitulos;

    constructor() ERC721("Titulo Demo de Posgrado UPEC", "UPEC-MASTER") Ownable(msg.sender) {}

    function otorgarTitulo(
        address recipient,
        string memory magister,
        string memory programa,
        string memory mencion,
        string memory senescyt,
        string memory ipfsCID
    ) external onlyOwner returns (uint256) {
        totalTitulos++;
        titulos[totalTitulos] = TituloPosgrado({
            id: totalTitulos,
            magister: magister,
            programaMaestria: programa,
            mencion: mencion,
            registroSenescyt: senescyt,
            ipfsMetadata: ipfsCID,
            fechaGraduacion: block.timestamp
        });

        _mint(recipient, totalTitulos);
        _setTokenURI(totalTitulos, string(abi.encodePacked("ipfs://", ipfsCID)));
        return totalTitulos;
    }
}`,
  },

  pasantias: {
    id: 'pasantias-upec',
    name: 'PasantiasComunitariasUPEC.sol',
    title: 'Certificación de Pasantías y Vinculación con la Sociedad',
    standard: 'ERC-721 / UPEC-VINCULA',
    compiler: 'Solidity ^0.8.28',
    network: 'Hardhat Localhost (EVM 31337)',
    description:
      'Smart Contract para certificar el cumplimiento de horas de vinculación comunitaria y prácticas pre-profesionales requeridas para la graduación.',
    functions: [
      {
        name: 'registrarHoras(address estudiante, uint256 horas, string entidad)',
        visibility: 'external onlyOwner',
        description: 'Acredita las horas de prácticas validadas por el tutor institucional.',
        gas: '~92,000 gas',
      },
    ],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PasantiasComunitariasUPEC is ERC721URIStorage, Ownable {
    struct Practica {
        uint256 id;
        address estudiante;
        string institucion;
        uint256 horasCumplidas;
        uint256 fechaAprobacion;
    }

    mapping(uint256 => Practica) public practicas;
    uint256 public totalPracticas;

    constructor() ERC721("Certificado de Practicas Pre-Profesionales UPEC", "UPEC-VINCULA") Ownable(msg.sender) {}

    function certificarPracticas(
        address estudiante,
        string memory institucion,
        uint256 horas,
        string memory ipfsCID
    ) external onlyOwner returns (uint256) {
        totalPracticas++;
        practicas[totalPracticas] = Practica({
            id: totalPracticas,
            estudiante: estudiante,
            institucion: institucion,
            horasCumplidas: horas,
            fechaAprobacion: block.timestamp
        });
        _mint(estudiante, totalPracticas);
        _setTokenURI(totalPracticas, ipfsCID);
        return totalPracticas;
    }
}`,
  },

  merito: {
    id: 'merito-upec',
    name: 'MeritoAcademicoUPEC.sol',
    title: 'Reconocimiento al Mérito Académico y Mejor Egresado',
    standard: 'ERC-721 / UPEC-MERIT',
    compiler: 'Solidity ^0.8.28',
    network: 'Hardhat Localhost (EVM 31337)',
    description:
      'Smart Contract de distinción magna para la condecoración de los mejores graduados, promedios de excelencia y medallas al mérito científico.',
    functions: [
      {
        name: 'otorgarMerito(address graduado, string nombre, uint256 promedioEscala1000, string distincion, string resolucion)',
        visibility: 'external onlyOwner returns (uint256)',
        description: 'Acuña la medalla digital NFT y diploma de honor por excelencia académica.',
        gas: '~175,000 gas',
      },
      {
        name: 'consultarMerito(uint256 tokenId)',
        visibility: 'external view returns (MeritoAcademico)',
        description: 'Retorna los datos de honor y condecoración de demostración.',
        gas: '0 gas (View)',
      },
    ],
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MeritoAcademicoUPEC
 * @notice Distinción al Mérito Académico y Condecoración Mejor Egresado.
 * @dev Universidad Politécnica Estatal del Carchi.
 */
contract MeritoAcademicoUPEC is ERC721URIStorage, Ownable {

    struct MeritoAcademico {
        uint256 id;
        address graduado;
        string nombreGraduado;
        string cedula;
        string carrera;
        uint256 promedioAcumulado; // Multiplicado por 100 (ej. 985 para 9.85/10)
        string condecoracion;      // ej. "Medalla Sol Pasto de Oro"
        string resolucionConsejo;  // ej. "RES-CU-UPEC-2026-088"
        uint256 fechaOtorgamiento;
    }

    mapping(uint256 => MeritoAcademico) public meritos;
    uint256 public totalMeritos;

    event MeritoOtorgado(uint256 indexed id, address indexed graduado, string nombre, string condecoracion);

    constructor() ERC721("Condecoracion Merito Academico UPEC", "UPEC-MERIT") Ownable(msg.sender) {}

    function otorgarMerito(
        address graduado,
        string memory nombre,
        string memory cedula,
        string memory carrera,
        uint256 promedio,
        string memory condecoracion,
        string memory resolucion,
        string memory ipfsCID
    ) external onlyOwner returns (uint256) {
        totalMeritos++;
        meritos[totalMeritos] = MeritoAcademico({
            id: totalMeritos,
            graduado: graduado,
            nombreGraduado: nombre,
            cedula: cedula,
            carrera: carrera,
            promedioAcumulado: promedio,
            condecoracion: condecoracion,
            resolucionConsejo: resolucion,
            fechaOtorgamiento: block.timestamp
        });

        _mint(graduado, totalMeritos);
        _setTokenURI(totalMeritos, string(abi.encodePacked("ipfs://", ipfsCID)));

        emit MeritoOtorgado(totalMeritos, graduado, nombre, condecoracion);
        return totalMeritos;
    }
}`,
  },
};

// Catálogo Completo de Facultades de la Universidad Politécnica Estatal del Carchi (UPEC)
export const UPEC_FACULTIES = [
  {
    id: 'fiaca',
    code: 'FIACA',
    name: 'Facultad de Industrias Agropecuarias y Ciencias Ambientales',
    shortName: 'FIACA • Ciencias Ambientales & Agropecuarias',
    careers: [
      'Ingeniería en Computación',
      'Ingeniería Agropecuaria',
      'Ingeniería en Alimentos',
      'Ingeniería Ambiental',
    ],
  },
  {
    id: 'fciiaee',
    code: 'FCIIAEE',
    name: 'Facultad de Comercio Internacional, Integración, Administración y Economía Empresarial',
    shortName: 'FCIIAEE • Comercio & Administración',
    careers: [
      'Comercio Exterior y Negociación Internacional',
      'Administración de Empresas',
      'Logística y Transporte',
      'Turismo',
    ],
  },
  {
    id: 'fcs',
    code: 'FCS',
    name: 'Facultad de Ciencias de la Salud',
    shortName: 'FCS • Ciencias de la Salud',
    careers: [
      'Enfermería',
      'Fisioterapia',
      'Laboratorio Clínico',
    ],
  },
  {
    id: 'fedush',
    code: 'FEDUSH',
    name: 'Facultad de Educación, Ciencias Sociales y Humanidades',
    shortName: 'FEDUSH • Educación & Derecho',
    careers: [
      'Educación Básica',
      'Educación Inicial',
      'Derecho',
    ],
  },
  {
    id: 'posgrado',
    code: 'DIP',
    name: 'Dirección de Posgrado y Formación Continua',
    shortName: 'Dirección de Posgrado (Maestrías)',
    careers: [
      'Maestría en Computación mención Inteligencia Artificial y Ciberseguridad',
      'Maestría en Comercio Exterior y Negocios Internacionales',
      'Maestría en Administración y Dirección de Empresas (MBA)',
      'Maestría en Salud Pública y Gestión Hospitalaria',
    ],
  },
  {
    id: 'vinculacion',
    code: 'DVP',
    name: 'Dirección de Vinculación y Prácticas Pre-Profesionales',
    shortName: 'Dirección de Vinculación con la Sociedad',
    careers: [
      'Acreditación de Prácticas Pre-Profesionales',
      'Certificación de Vinculación Comunitaria',
    ],
  },
];

// Configuración de Tipos de Contrato y sus Campos Dinámicos
export const CONTRACT_TYPES_CONFIG = {
  actas: {
    id: 'actas',
    name: 'ActasDeGradoUPEC',
    title: 'Actas de Grado y Examen Oral (Pregrado)',
    standard: 'ERC-721 / UPEC-ACTAS',
    defaultStudent: 'Benítez Ruales María José',
    defaultCedula: '0400000002',
    defaultScore: '9.85',
    defaultScoreLabel: 'Calificación de Grado (0-10)',
    defaultMention: 'Aprobado con Mención de Honor (Magna Cum Laude)',
    degreePrefix: 'Ingeniero / Licenciado',
    facultyDefault: 'FIACA • Computación / Agropecuaria',
  },
  posgrado: {
    id: 'posgrado',
    name: 'PosgradoMasterUPEC',
    title: 'Títulos de Maestría y Posgrado (Cuarto Nivel)',
    standard: 'ERC-721 / UPEC-MASTER',
    defaultStudent: 'Ing. Carla Sofía Montenegro Vela, M.Sc.',
    defaultCedula: '0400000003',
    defaultScore: '9.90',
    defaultScoreLabel: 'Calificación de Tesis de Maestría (0-10)',
    defaultSenescyt: 'SENESCYT-1024-2026-98214',
    defaultMention: 'Mención de Excelencia en Investigación Científica',
    degreePrefix: 'Magíster / Master of Science',
    facultyDefault: 'Dirección de Posgrado (Maestrías)',
  },
  pasantias: {
    id: 'pasantias',
    name: 'PasantiasComunitariasUPEC',
    title: 'Certificación de Pasantías y Vinculación',
    standard: 'ERC-721 / UPEC-VINCULA',
    defaultStudent: 'Diego Alejandro Paredes Lima',
    defaultCedula: '0400000004',
    defaultHours: '240 Horas Reglamentarias',
    defaultEntity: 'GAD Provincial del Carchi • Tulcán',
    defaultScore: '10.00 / 10.00 (Sobresaliente)',
    degreePrefix: 'Acreditación de Prácticas',
    facultyDefault: 'Dirección de Vinculación con la Sociedad',
  },
  merito: {
    id: 'merito',
    name: 'MeritoAcademicoUPEC',
    title: 'Reconocimiento al Mérito Académico & Mejor Egresado',
    standard: 'ERC-721 / UPEC-MERIT',
    defaultStudent: 'Ing. Mayra Alejandra Pantoja Bolaños',
    defaultCedula: '0400000005',
    defaultScore: '9.94 / 10.00',
    defaultScoreLabel: 'Promedio Ponderado Acumulado (0-10)',
    defaultMention: 'Medalla Sol Pasto de Oro • Mejor Egresada de la Promoción',
    degreePrefix: 'Condecoración de Honor',
    facultyDefault: 'FIACA • Computación / Agropecuaria',
  },
  projectRegistry: {
    id: 'projectRegistry',
    name: 'ProjectRegistry',
    title: 'Contrato Maestro de Titulación DAO & Certificación NFT',
    standard: 'ERC-721 URIStorage',
    defaultStudent: 'Benítez Ruales María José',
    defaultCedula: '0400000002',
    defaultScore: '9.80 / 10.00',
    degreePrefix: 'Título de Grado',
    facultyDefault: 'FIACA • Computación / Agropecuaria',
  },
};
