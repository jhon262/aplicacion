// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PurchaseEscrow
 * @author Sistema de Tesis Web3 - Universidad Politécnica Estatal del Carchi (UPEC)
 * @notice Contrato inteligente para la gestión de acuerdos de compraventa con custodia en garantía (Escrow)
 *         utilizando la moneda académica UPECT.
 * @dev Incorpora AccessControl para roles de mediación, ReentrancyGuard para prevención de reentradas,
 *      SafeERC20 para transferencias seguras y máquina de estados estricta.
 *
 * REGLAS DE SEGURIDAD ACADÉMICA:
 * - Los fondos depositados pertenecen estrictamente a los acuerdos y sus partes (comprador y vendedor).
 * - El administrador NO posee funciones para retirar o drenar arbitrariamente los fondos en custodia.
 * - Prevención estricta contra pagos duplicados y reentradas.
 */
contract PurchaseEscrow is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =========================================================================
    // ROLES Y CONSTANTES
    // =========================================================================

    bytes32 public constant MEDIATOR_ROLE = keccak256("MEDIATOR_ROLE");

    /// @notice Periodo estándar de inspección tras la entrega (3 días)
    uint256 public constant DEFAULT_INSPECTION_PERIOD = 3 days;

    /// @notice Contrato de la moneda académica UPECT utilizada como medio de pago y custodia
    IERC20 public immutable upectToken;

    // =========================================================================
    // ENUMS Y ESTRUCTURAS DE DATOS
    // =========================================================================

    enum AgreementState {
        Created,    // 0: Propuesta creada, a la espera de aceptación
        Accepted,   // 1: Aceptada por el vendedor, lista para depósito
        Funded,     // 2: Fondos en custodia en el contrato
        Delivered,  // 3: Vendedor registró la entrega digital o física
        Completed,  // 4: Comprador confirmó recepción, fondos liberados al vendedor
        Disputed,   // 5: En proceso de disputa y mediación
        Refunded,   // 6: Fondos reembolsados al comprador
        Cancelled   // 7: Cancelado antes de depositar fondos
    }

    struct Agreement {
        uint256 id;
        address buyer;
        address seller;
        uint256 price;              // Monto en tokens UPECT (18 decimales)
        string termsCID;            // Hash IPFS con las cláusulas o descripción del acuerdo
        string deliveryProofCID;    // Hash IPFS del comprobante de entrega
        uint256 deliveryDeadline;   // Fecha límite para que el vendedor registre entrega
        uint256 inspectionDeadline; // Fecha límite para que el comprador inspeccione
        AgreementState state;
        uint256 deliveryPeriod;     // Duración establecida para entrega (segundos)
        uint256 createdAt;
        uint256 completedAt;
    }

    // =========================================================================
    // VARIABLES DE ESTADO
    // =========================================================================

    uint256 private _agreementCount;
    mapping(uint256 => Agreement) public agreements;
    mapping(address => uint256[]) private _userAgreements;

    // =========================================================================
    // EVENTOS
    // =========================================================================

    event AgreementCreated(uint256 indexed agreementId, address indexed buyer, address indexed seller, uint256 price, string termsCID);
    event AgreementAccepted(uint256 indexed agreementId, address indexed seller);
    event EscrowFunded(uint256 indexed agreementId, address indexed buyer, uint256 price, uint256 deliveryDeadline);
    event DeliveryRegistered(uint256 indexed agreementId, address indexed seller, string deliveryProofCID, uint256 inspectionDeadline);
    event ReceiptConfirmed(uint256 indexed agreementId, address indexed buyer, address indexed seller, uint256 price);
    event PaymentReleased(uint256 indexed agreementId, address indexed recipient, uint256 amount);
    event AgreementCancelled(uint256 indexed agreementId, address indexed initiator);
    event AgreementRefunded(uint256 indexed agreementId, address indexed buyer, uint256 amount);
    event DisputeRaised(uint256 indexed agreementId, address indexed initiator, string reason);
    event DisputeResolved(uint256 indexed agreementId, address indexed mediator, uint8 resolution, uint256 buyerRefund, uint256 sellerPayment);

    // =========================================================================
    // ERRORES PERSONALIZADOS
    // =========================================================================

    error ZeroAddressDetected();
    error InvalidPrice();
    error InvalidTerms();
    error InvalidTimePeriod();
    error InvalidParties();
    error AgreementNotFound();
    error InvalidState(AgreementState current, AgreementState expected);
    error UnauthorizedCaller();
    error DeliveryDeadlineNotPassed();
    error InspectionDeadlineActive();
    error InvalidDisputeSplit();

    // =========================================================================
    // MODIFICADORES
    // =========================================================================

    modifier onlyBuyer(uint256 agreementId) {
        if (agreements[agreementId].buyer != msg.sender) revert UnauthorizedCaller();
        _;
    }

    modifier onlySeller(uint256 agreementId) {
        if (agreements[agreementId].seller != msg.sender) revert UnauthorizedCaller();
        _;
    }

    modifier onlyParty(uint256 agreementId) {
        address buyer = agreements[agreementId].buyer;
        address seller = agreements[agreementId].seller;
        if (msg.sender != buyer && msg.sender != seller) revert UnauthorizedCaller();
        _;
    }

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    /**
     * @notice Inicializa el contrato de custodia vinculándolo a la moneda académica UPECT.
     * @param _upectToken Dirección del contrato ERC-20 UPECToken
     * @param initialAdmin Dirección que recibirá el rol DEFAULT_ADMIN_ROLE y MEDIATOR_ROLE
     */
    constructor(address _upectToken, address initialAdmin) {
        if (_upectToken == address(0) || initialAdmin == address(0)) revert ZeroAddressDetected();

        upectToken = IERC20(_upectToken);

        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(MEDIATOR_ROLE, initialAdmin);
    }

    // =========================================================================
    // CREACIÓN Y ACEPTACIÓN DEL ACUERDO
    // =========================================================================

    /**
     * @notice Crea una propuesta de compraventa indicando vendedor, precio y hash de condiciones en IPFS.
     * @param seller Dirección de la parte vendedora
     * @param price Cantidad de tokens UPECT acordados
     * @param termsCID Hash IPFS que contiene el detalle y cláusulas del acuerdo
     * @param deliveryPeriodSeconds Tiempo concedido al vendedor para realizar la entrega tras el depósito
     * @return agreementId Identificador único del acuerdo generado
     */
    function createAgreement(
        address seller,
        uint256 price,
        string calldata termsCID,
        uint256 deliveryPeriodSeconds
    ) external returns (uint256 agreementId) {
        if (seller == address(0)) revert ZeroAddressDetected();
        if (seller == msg.sender) revert InvalidParties();
        if (price == 0) revert InvalidPrice();
        if (bytes(termsCID).length == 0) revert InvalidTerms();
        if (deliveryPeriodSeconds < 1 hours) revert InvalidTimePeriod();

        _agreementCount++;
        agreementId = _agreementCount;

        Agreement storage ag = agreements[agreementId];
        ag.id = agreementId;
        ag.buyer = msg.sender;
        ag.seller = seller;
        ag.price = price;
        ag.termsCID = termsCID;
        ag.state = AgreementState.Created;
        ag.deliveryPeriod = deliveryPeriodSeconds;
        ag.createdAt = block.timestamp;

        _userAgreements[msg.sender].push(agreementId);
        _userAgreements[seller].push(agreementId);

        emit AgreementCreated(agreementId, msg.sender, seller, price, termsCID);
    }

    /**
     * @notice El vendedor acepta formalmente los términos del acuerdo de compraventa.
     * @param agreementId Identificador del acuerdo
     */
    function acceptAgreement(uint256 agreementId) external onlySeller(agreementId) {
        Agreement storage ag = agreements[agreementId];
        if (ag.state != AgreementState.Created) revert InvalidState(ag.state, AgreementState.Created);

        ag.state = AgreementState.Accepted;
        emit AgreementAccepted(agreementId, msg.sender);
    }

    // =========================================================================
    // DEPÓSITO EN GARANTÍA (ESCROW)
    // =========================================================================

    /**
     * @notice El comprador deposita los tokens UPECT en el contrato de custodia.
     * @dev Requiere que el comprador haya aprobado previamente el gasto mediante upectToken.approve.
     * @param agreementId Identificador del acuerdo
     */
    function depositEscrow(uint256 agreementId) external onlyBuyer(agreementId) nonReentrant {
        Agreement storage ag = agreements[agreementId];
        if (ag.state != AgreementState.Accepted) revert InvalidState(ag.state, AgreementState.Accepted);

        ag.state = AgreementState.Funded;
        ag.deliveryDeadline = block.timestamp + ag.deliveryPeriod;

        upectToken.safeTransferFrom(msg.sender, address(this), ag.price);

        emit EscrowFunded(agreementId, msg.sender, ag.price, ag.deliveryDeadline);
    }

    // =========================================================================
    // REGISTRO DE ENTREGA Y CONFIRMACIÓN DE RECEPCIÓN
    // =========================================================================

    /**
     * @notice El vendedor registra formalmente la entrega del bien o servicio académico con su comprobante en IPFS.
     * @param agreementId Identificador del acuerdo
     * @param deliveryProofCID Hash IPFS del comprobante o archivo entregado
     */
    function registerDelivery(uint256 agreementId, string calldata deliveryProofCID) external onlySeller(agreementId) {
        Agreement storage ag = agreements[agreementId];
        if (ag.state != AgreementState.Funded) revert InvalidState(ag.state, AgreementState.Funded);
        if (bytes(deliveryProofCID).length == 0) revert InvalidTerms();

        ag.state = AgreementState.Delivered;
        ag.deliveryProofCID = deliveryProofCID;
        ag.inspectionDeadline = block.timestamp + DEFAULT_INSPECTION_PERIOD;

        emit DeliveryRegistered(agreementId, msg.sender, deliveryProofCID, ag.inspectionDeadline);
    }

    /**
     * @notice El comprador confirma la recepción conforme del bien o servicio, liberando el pago al vendedor.
     * @param agreementId Identificador del acuerdo
     */
    function confirmReceipt(uint256 agreementId) external onlyBuyer(agreementId) nonReentrant {
        Agreement storage ag = agreements[agreementId];
        if (ag.state != AgreementState.Delivered) revert InvalidState(ag.state, AgreementState.Delivered);

        ag.state = AgreementState.Completed;
        ag.completedAt = block.timestamp;

        upectToken.safeTransfer(ag.seller, ag.price);

        emit ReceiptConfirmed(agreementId, ag.buyer, ag.seller, ag.price);
        emit PaymentReleased(agreementId, ag.seller, ag.price);
    }

    /**
     * @notice Si el comprador no confirma ni inicia disputa y transcurre el plazo de inspección,
     *         el vendedor puede solicitar la liberación del pago.
     * @param agreementId Identificador del acuerdo
     */
    function releasePaymentTimeout(uint256 agreementId) external onlySeller(agreementId) nonReentrant {
        Agreement storage ag = agreements[agreementId];
        if (ag.state != AgreementState.Delivered) revert InvalidState(ag.state, AgreementState.Delivered);
        if (block.timestamp <= ag.inspectionDeadline) revert InspectionDeadlineActive();

        ag.state = AgreementState.Completed;
        ag.completedAt = block.timestamp;

        upectToken.safeTransfer(ag.seller, ag.price);

        emit PaymentReleased(agreementId, ag.seller, ag.price);
    }

    // =========================================================================
    // CANCELACIÓN Y REEMBOLSO
    // =========================================================================

    /**
     * @notice Cancela el acuerdo y gestiona reembolsos si corresponde:
     *         1. Si no ha sido fondeado (Created o Accepted), cualquiera de las partes puede cancelar.
     *         2. Si está fondeado y vence el plazo de entrega sin que el vendedor entregue, el comprador cancela y recupera el 100%.
     *         3. El vendedor puede voluntariamente cancelar y reembolsar al comprador en cualquier momento previo a completarse.
     * @param agreementId Identificador del acuerdo
     */
    function cancelAndRefund(uint256 agreementId) external onlyParty(agreementId) nonReentrant {
        Agreement storage ag = agreements[agreementId];

        if (ag.state == AgreementState.Created || ag.state == AgreementState.Accepted) {
            ag.state = AgreementState.Cancelled;
            emit AgreementCancelled(agreementId, msg.sender);
            return;
        }

        if (ag.state == AgreementState.Funded) {
            if (msg.sender == ag.buyer) {
                if (block.timestamp <= ag.deliveryDeadline) revert DeliveryDeadlineNotPassed();
            }

            ag.state = AgreementState.Refunded;
            upectToken.safeTransfer(ag.buyer, ag.price);

            emit AgreementRefunded(agreementId, ag.buyer, ag.price);
            return;
        }

        revert InvalidState(ag.state, AgreementState.Funded);
    }

    // =========================================================================
    // GESTIÓN DE DISPUTAS Y RESOLUCIÓN MEDIADA
    // =========================================================================

    /**
     * @notice Permite al comprador o al vendedor abrir una disputa formal durante el proceso de custodia o entrega.
     * @param agreementId Identificador del acuerdo
     * @param reason Motivo o justificación de la inconformidad
     */
    function raiseDispute(uint256 agreementId, string calldata reason) external onlyParty(agreementId) {
        Agreement storage ag = agreements[agreementId];
        if (ag.state != AgreementState.Funded && ag.state != AgreementState.Delivered) {
            revert InvalidState(ag.state, AgreementState.Funded);
        }

        ag.state = AgreementState.Disputed;
        emit DisputeRaised(agreementId, msg.sender, reason);
    }

    /**
     * @notice Resuelve una disputa abierta mediante un mediador autorizado (Tribunal Académico / Secretaría).
     * @dev Tipos de resolución:
     *      1: Reembolso 100% al comprador (buyerRefund = price, sellerPayment = 0)
     *      2: Liberación 100% al vendedor (sellerPayment = price, buyerRefund = 0)
     *      3: Distribución parcial acordada (buyerRefund + sellerPayment == price)
     * @param agreementId Identificador del acuerdo
     * @param resolution Código numérico del dictamen (1 = Comprador, 2 = Vendedor, 3 = Parcial)
     * @param buyerRefund Monto asignado al comprador
     * @param sellerPayment Monto asignado al vendedor
     */
    function resolveDispute(
        uint256 agreementId,
        uint8 resolution,
        uint256 buyerRefund,
        uint256 sellerPayment
    ) external onlyRole(MEDIATOR_ROLE) nonReentrant {
        Agreement storage ag = agreements[agreementId];
        if (ag.state != AgreementState.Disputed) revert InvalidState(ag.state, AgreementState.Disputed);

        // Validación estricta: la suma debe coincidir exactamente con el precio depositado
        if (buyerRefund + sellerPayment != ag.price) revert InvalidDisputeSplit();

        if (resolution == 1) {
            ag.state = AgreementState.Refunded;
        } else {
            ag.state = AgreementState.Completed;
        }

        ag.completedAt = block.timestamp;

        if (buyerRefund > 0) {
            upectToken.safeTransfer(ag.buyer, buyerRefund);
        }
        if (sellerPayment > 0) {
            upectToken.safeTransfer(ag.seller, sellerPayment);
        }

        emit DisputeResolved(agreementId, msg.sender, resolution, buyerRefund, sellerPayment);
    }

    // =========================================================================
    // CONSULTAS Y GETTERS
    // =========================================================================

    /**
     * @notice Retorna el número total de acuerdos creados en el sistema.
     */
    function getAgreementCount() external view returns (uint256) {
        return _agreementCount;
    }

    /**
     * @notice Obtiene los identificadores de todos los acuerdos en los que participa una dirección.
     * @param user Dirección del comprador o vendedor
     */
    function getUserAgreements(address user) external view returns (uint256[] memory) {
        return _userAgreements[user];
    }

    /**
     * @notice Obtiene los detalles esenciales de un acuerdo por su ID.
     */
    function getAgreement(uint256 agreementId) external view returns (
        uint256 id,
        address buyer,
        address seller,
        uint256 price,
        string memory termsCID,
        string memory deliveryProofCID,
        uint256 deliveryDeadline,
        uint256 inspectionDeadline,
        AgreementState state
    ) {
        if (agreementId == 0 || agreementId > _agreementCount) revert AgreementNotFound();
        Agreement storage ag = agreements[agreementId];
        return (
            ag.id,
            ag.buyer,
            ag.seller,
            ag.price,
            ag.termsCID,
            ag.deliveryProofCID,
            ag.deliveryDeadline,
            ag.inspectionDeadline,
            ag.state
        );
    }
}
