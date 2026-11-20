// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title UPECToken
 * @author Sistema de Tesis Web3 - Universidad Politécnica Estatal del Carchi (UPEC)
 * @notice Moneda académica ERC-20 para simulación de transacciones, custodia y aranceles en red de investigación.
 * @dev Hereda de ERC20 y AccessControl de OpenZeppelin v5.x.
 *      Exclusivamente con fines académicos y de demostración; no posee valor monetario real.
 */
contract UPECToken is ERC20, AccessControl {

    // =========================================================================
    // ROLES Y CONSTANTES
    // =========================================================================

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Aviso explícito sobre la naturaleza académica y no monetaria del token
    string public constant ACADEMIC_DISCLAIMER = 
        "Token academico de demostracion para investigacion. No posee valor financiero real ni respaldo monetario.";

    // =========================================================================
    // PARÁMETROS DEL FAUCET ACADÉMICO
    // =========================================================================

    /// @notice Cantidad de tokens dispensados por solicitud (por defecto 100 UPECT)
    uint256 public faucetAmount;

    /// @notice Tiempo de espera obligatorio entre solicitudes por billetera (por defecto 24 horas)
    uint256 public faucetCooldown;

    /// @notice Registro de última marca de tiempo de solicitud por usuario
    mapping(address => uint256) public lastFaucetRequest;

    // =========================================================================
    // EVENTOS
    // =========================================================================

    event FaucetDispensed(address indexed recipient, uint256 amount);
    event FaucetConfigUpdated(uint256 newAmount, uint256 newCooldown);

    // =========================================================================
    // ERRORES PERSONALIZADOS
    // =========================================================================

    error FaucetCooldownActive(uint256 timeRemaining);
    error ZeroAddressDetected();
    error InvalidAmount();

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    /**
     * @notice Inicializa el token UPECT con un suministro inicial y asigna roles de administración.
     * @param initialSupply Cantidad inicial de tokens a mintear (en wei, considerando 18 decimales)
     * @param initialAdmin Dirección que recibirá los roles de DEFAULT_ADMIN_ROLE y MINTER_ROLE
     */
    constructor(uint256 initialSupply, address initialAdmin) ERC20("UPEC Token Demo", "UPECT") {
        if (initialAdmin == address(0)) revert ZeroAddressDetected();

        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(MINTER_ROLE, initialAdmin);

        // Configuración inicial del Faucet académico
        faucetAmount = 100 * 10 ** decimals(); // 100 UPECT
        faucetCooldown = 24 hours;             // Espera de 24 horas entre solicitudes

        if (initialSupply > 0) {
            _mint(initialAdmin, initialSupply);
        }
    }

    // =========================================================================
    // EMISIÓN RESTRINGIDA POR ROLES (MINT)
    // =========================================================================

    /**
     * @notice Mintea nuevos tokens UPECT a una dirección específica.
     * @dev Restringido exclusivamente a cuentas con MINTER_ROLE.
     * @param to Dirección de destino
     * @param amount Cantidad de tokens a mintear
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (to == address(0)) revert ZeroAddressDetected();
        if (amount == 0) revert InvalidAmount();
        _mint(to, amount);
    }

    // =========================================================================
    // GRIFO ACADÉMICO (FAUCET) CON LÍMITES Y FRECUENCIA
    // =========================================================================

    /**
     * @notice Permite a cualquier estudiante o investigador solicitar tokens de prueba para experimentación.
     * @dev Controla que se respete el cooldown y no se supere la cuota establecida por solicitud.
     */
    function requestFaucetTokens() external {
        address recipient = msg.sender;
        uint256 lastTime = lastFaucetRequest[recipient];
        uint256 nextAllowedTime = lastTime + faucetCooldown;

        if (block.timestamp < nextAllowedTime) {
            revert FaucetCooldownActive(nextAllowedTime - block.timestamp);
        }

        lastFaucetRequest[recipient] = block.timestamp;
        _mint(recipient, faucetAmount);

        emit FaucetDispensed(recipient, faucetAmount);
    }

    /**
     * @notice Consulta cuánto tiempo resta para que una billetera pueda volver a usar el Faucet.
     * @param user Dirección a consultar
     * @return remaining Segundos restantes (0 si ya puede solicitar tokens)
     */
    function getRemainingFaucetCooldown(address user) external view returns (uint256 remaining) {
        uint256 lastTime = lastFaucetRequest[user];
        uint256 nextAllowedTime = lastTime + faucetCooldown;

        if (block.timestamp >= nextAllowedTime) {
            return 0;
        } else {
            return nextAllowedTime - block.timestamp;
        }
    }

    /**
     * @notice Permite al administrador ajustar la cantidad y la frecuencia del Faucet académico.
     * @param newAmount Nueva cantidad de tokens por solicitud
     * @param newCooldown Nuevo periodo de cooldown en segundos
     */
    function setFaucetConfig(uint256 newAmount, uint256 newCooldown) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newAmount == 0) revert InvalidAmount();
        faucetAmount = newAmount;
        faucetCooldown = newCooldown;
        emit FaucetConfigUpdated(newAmount, newCooldown);
    }
}
