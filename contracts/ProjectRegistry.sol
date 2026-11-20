// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title ProjectRegistry
 * @author Sistema de Tesis Web3 - Universidad Politécnica Estatal del Carchi (UPEC)
 * @notice Registro de trabajos de titulación, votación del tribunal docente y emisión
 *         del certificado académico como token ERC-721 intransferible.
 * @dev Flujo:
 *      1. El estudiante registra su trabajo con el CID de IPFS y el hash SHA-256 del PDF.
 *      2. Secretaría (ADMIN) asigna un tribunal de tres docentes con DOCENTE_ROLE.
 *      3. Cada docente del tribunal vota una sola vez. La aprobación exige el voto
 *         favorable de los tres (unanimidad). Un voto en contra rechaza el trabajo.
 *      4. Con el tercer voto favorable el contrato emite el certificado al autor.
 *      5. Si vence el plazo sin los tres votos favorables, cualquiera puede finalizar
 *         y el trabajo queda rechazado.
 *      Los datos personales (nombre, cédula) no se guardan en la cadena.
 */
contract ProjectRegistry is ERC721URIStorage, AccessControl {
    // =========================================================================
    // ROLES Y CONSTANTES
    // =========================================================================

    /// @notice Rol de los docentes habilitados para integrar tribunales.
    bytes32 public constant DOCENTE_ROLE = keccak256("DOCENTE_ROLE");

    /// @notice Número de integrantes del tribunal y votos favorables exigidos.
    uint256 public constant TRIBUNAL_SIZE = 3;

    /// @notice Plazo de votación que corre desde la asignación del tribunal.
    uint256 public constant DEFAULT_VOTING_DURATION = 7 days;

    // =========================================================================
    // TIPOS
    // =========================================================================

    enum ProjectStatus {
        Pending,  // Registrado; espera tribunal o votación
        Approved, // Aprobado por unanimidad y certificado emitido
        Rejected  // Rechazado por un voto en contra o por vencimiento del plazo
    }

    struct Project {
        uint256 id;
        string title;
        string description;
        string ipfsMetadataCID; // CID del PDF en IPFS
        bytes32 documentHash;   // SHA-256 del PDF, para verificar su integridad
        address submitter;      // Billetera del autor
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votingDeadline; // 0 mientras no se asigna el tribunal
        ProjectStatus status;
        uint256 certificateId;  // 0 si no hay certificado
    }

    // =========================================================================
    // ESTADO
    // =========================================================================

    uint256 private _projectCount;
    uint256 private _tokenCount;

    mapping(uint256 => Project) public projects;
    mapping(uint256 => address[TRIBUNAL_SIZE]) private _tribunal;
    mapping(uint256 => mapping(address => bool)) public isTribunalMember;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @notice Hash del PDF => ID del proyecto (evita registrar dos veces el mismo documento).
    mapping(bytes32 => uint256) public projectByDocumentHash;

    /// @notice ID del certificado => ID del proyecto.
    mapping(uint256 => uint256) public projectByCertificate;

    // =========================================================================
    // EVENTOS
    // =========================================================================

    event ProjectRegistered(
        uint256 indexed projectId,
        address indexed submitter,
        string title,
        string ipfsMetadataCID,
        bytes32 documentHash
    );
    event ProjectUpdated(uint256 indexed projectId, string title, string description);
    event TribunalAssigned(uint256 indexed projectId, address[TRIBUNAL_SIZE] members, uint256 votingDeadline);
    event VoteCast(
        uint256 indexed projectId,
        address indexed voter,
        bool support,
        uint256 currentVotesFor,
        uint256 currentVotesAgainst
    );
    event ProjectFinalized(uint256 indexed projectId, ProjectStatus indexed status, uint256 certificateId);
    event CertificateIssued(uint256 indexed projectId, uint256 indexed tokenId, address indexed recipient, string tokenURI);

    // =========================================================================
    // ERRORES
    // =========================================================================

    error EmptyTitle();
    error EmptyCID();
    error EmptyDocumentHash();
    error DuplicateDocument(uint256 existingProjectId);
    error ProjectNotFound();
    error NotPending();
    error NotSubmitter();
    error VotingAlreadyStarted();
    error TribunalAlreadyAssigned();
    error TribunalNotAssigned();
    error InvalidTribunalMember(address member);
    error NotTribunalMember();
    error AlreadyVoted();
    error VotingClosed();
    error VotingStillOpen();
    error SoulboundCertificate();

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    /**
     * @param initialAdmin Cuenta de Secretaría General: administra roles y asigna tribunales.
     */
    constructor(address initialAdmin) ERC721("Certificado Academico UPEC (Prototipo)", "UPEC-CERT") {
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
    }

    // =========================================================================
    // REGISTRO Y EDICIÓN
    // =========================================================================

    /**
     * @notice Registra un trabajo de titulación.
     * @param title Título del trabajo.
     * @param description Resumen del trabajo (sin datos personales).
     * @param ipfsMetadataCID CID del PDF en IPFS.
     * @param documentHash SHA-256 del PDF.
     */
    function registerProject(
        string calldata title,
        string calldata description,
        string calldata ipfsMetadataCID,
        bytes32 documentHash
    ) external returns (uint256 projectId) {
        if (bytes(title).length == 0) revert EmptyTitle();
        if (bytes(ipfsMetadataCID).length == 0) revert EmptyCID();
        if (documentHash == bytes32(0)) revert EmptyDocumentHash();
        uint256 existing = projectByDocumentHash[documentHash];
        if (existing != 0) revert DuplicateDocument(existing);

        projectId = ++_projectCount;
        Project storage p = projects[projectId];
        p.id = projectId;
        p.title = title;
        p.description = description;
        p.ipfsMetadataCID = ipfsMetadataCID;
        p.documentHash = documentHash;
        p.submitter = msg.sender;
        p.status = ProjectStatus.Pending;
        projectByDocumentHash[documentHash] = projectId;

        emit ProjectRegistered(projectId, msg.sender, title, ipfsMetadataCID, documentHash);
    }

    /**
     * @notice El autor corrige título o descripción mientras ningún docente haya votado.
     */
    function updateProject(uint256 projectId, string calldata title, string calldata description) external {
        Project storage p = _existing(projectId);
        if (p.submitter != msg.sender) revert NotSubmitter();
        if (p.status != ProjectStatus.Pending) revert NotPending();
        if (p.votesFor + p.votesAgainst > 0) revert VotingAlreadyStarted();
        if (bytes(title).length == 0) revert EmptyTitle();
        p.title = title;
        p.description = description;
        emit ProjectUpdated(projectId, title, description);
    }

    // =========================================================================
    // TRIBUNAL Y VOTACIÓN
    // =========================================================================

    /**
     * @notice Secretaría asigna los tres docentes del tribunal. Desde ese momento corre el plazo.
     */
    function assignTribunal(uint256 projectId, address[TRIBUNAL_SIZE] calldata members)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        Project storage p = _existing(projectId);
        if (p.status != ProjectStatus.Pending) revert NotPending();
        if (p.votingDeadline != 0) revert TribunalAlreadyAssigned();

        for (uint256 i = 0; i < TRIBUNAL_SIZE; i++) {
            address m = members[i];
            if (m == address(0) || m == p.submitter || !hasRole(DOCENTE_ROLE, m) || isTribunalMember[projectId][m]) {
                revert InvalidTribunalMember(m);
            }
            isTribunalMember[projectId][m] = true;
            _tribunal[projectId][i] = m;
        }
        p.votingDeadline = block.timestamp + DEFAULT_VOTING_DURATION;
        emit TribunalAssigned(projectId, members, p.votingDeadline);
    }

    /**
     * @notice Voto de un integrante del tribunal. Un voto en contra rechaza el trabajo;
     *         el tercer voto a favor lo aprueba y emite el certificado.
     */
    function vote(uint256 projectId, bool support) external {
        Project storage p = _existing(projectId);
        if (p.status != ProjectStatus.Pending) revert NotPending();
        if (p.votingDeadline == 0) revert TribunalNotAssigned();
        if (block.timestamp > p.votingDeadline) revert VotingClosed();
        if (!isTribunalMember[projectId][msg.sender]) revert NotTribunalMember();
        if (hasVoted[projectId][msg.sender]) revert AlreadyVoted();

        hasVoted[projectId][msg.sender] = true;
        if (support) {
            p.votesFor++;
        } else {
            p.votesAgainst++;
        }
        emit VoteCast(projectId, msg.sender, support, p.votesFor, p.votesAgainst);

        if (!support) {
            p.status = ProjectStatus.Rejected;
            emit ProjectFinalized(projectId, ProjectStatus.Rejected, 0);
        } else if (p.votesFor == TRIBUNAL_SIZE) {
            _approve(projectId, p);
        }
    }

    /**
     * @notice Cierra un trabajo cuyo plazo venció sin la aprobación unánime.
     */
    function finalizeProject(uint256 projectId) external {
        Project storage p = _existing(projectId);
        if (p.status != ProjectStatus.Pending) revert NotPending();
        if (p.votingDeadline == 0) revert TribunalNotAssigned();
        if (block.timestamp <= p.votingDeadline) revert VotingStillOpen();
        p.status = ProjectStatus.Rejected;
        emit ProjectFinalized(projectId, ProjectStatus.Rejected, 0);
    }

    // =========================================================================
    // CONSULTAS
    // =========================================================================

    function totalProjects() external view returns (uint256) {
        return _projectCount;
    }

    function getTribunal(uint256 projectId) external view returns (address[TRIBUNAL_SIZE] memory) {
        return _tribunal[projectId];
    }

    function getAllProjects() external view returns (Project[] memory all) {
        all = new Project[](_projectCount);
        for (uint256 i = 1; i <= _projectCount; i++) {
            all[i - 1] = projects[i];
        }
    }

    /**
     * @notice Verificación pública: dado el hash del PDF devuelve el proyecto y su estado.
     */
    function verifyDocument(bytes32 documentHash)
        external
        view
        returns (bool registered, uint256 projectId, ProjectStatus status, uint256 certificateId, address submitter)
    {
        projectId = projectByDocumentHash[documentHash];
        if (projectId == 0) return (false, 0, ProjectStatus.Pending, 0, address(0));
        Project storage p = projects[projectId];
        return (true, projectId, p.status, p.certificateId, p.submitter);
    }

    // =========================================================================
    // INTERNAS
    // =========================================================================

    function _existing(uint256 projectId) private view returns (Project storage p) {
        p = projects[projectId];
        if (p.id == 0) revert ProjectNotFound();
    }

    function _approve(uint256 projectId, Project storage p) private {
        p.status = ProjectStatus.Approved;
        uint256 tokenId = ++_tokenCount;
        p.certificateId = tokenId;
        projectByCertificate[tokenId] = projectId;

        // _mint (sin callback) evita llamadas externas: el certificado va a la billetera del autor.
        _mint(p.submitter, tokenId);
        string memory uri = string.concat("ipfs://", p.ipfsMetadataCID);
        _setTokenURI(tokenId, uri);

        emit CertificateIssued(projectId, tokenId, p.submitter, uri);
        emit ProjectFinalized(projectId, ProjectStatus.Approved, tokenId);
    }

    /**
     * @dev Certificado intransferible: solo se permite la emisión (from == 0).
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0)) revert SoulboundCertificate();
        return super._update(to, tokenId, auth);
    }

    /// @dev Las aprobaciones no tienen sentido en un certificado intransferible.
    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert SoulboundCertificate();
    }

    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert SoulboundCertificate();
    }

    // =========================================================================
    // OVERRIDES REQUERIDOS
    // =========================================================================

    function tokenURI(uint256 tokenId) public view override(ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
