// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CarPass
 * @notice NFT que representa el historial inmutable de un vehículo, identificado por VIN.
 * @dev EPIC-02 skeleton — firmas definidas, implementación pendiente (EPIC-03+).
 */
contract CarPass is ERC721, AccessControl {

    // -------------------------------------------------------------------------
    // Roles
    // -------------------------------------------------------------------------

    bytes32 public constant REGISTRADOR_ROLE   = keccak256("REGISTRADOR_ROLE");
    bytes32 public constant MECANICO_ROLE      = keccak256("MECANICO_ROLE");
    bytes32 public constant INSPECTOR_VTV_ROLE = keccak256("INSPECTOR_VTV_ROLE");

    // -------------------------------------------------------------------------
    // Enums
    // -------------------------------------------------------------------------

    enum SiniestroGravedad {
        LEVE,
        MODERADO,
        GRAVE
    }

    enum VTVResultado {
        APROBADO,
        APROBADO_CON_OBSERVACIONES,
        RECHAZADO
    }

    enum SelloEstado {
        ACTIVO,
        VENCIDO,
        REVOCADO
    }

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    struct VehiculoInfo {
        string  vin;
        string  marca;
        string  modelo;
        uint16  anio;
        string  color;
        address propietario;
    }

    struct RegistroService {
        uint256 timestamp;
        string  tipoServicio;
        uint32  kilometraje;
        address taller;      // msg.sender al momento de la carga (MECANICO_ROLE)
        string  descripcion;
    }

    struct RegistroSiniestro {
        uint256           timestamp;
        SiniestroGravedad gravedad;
        string            descripcion;
        bool              reparado;
        uint256           costoEstimado;
    }

    struct RegistroVTV {
        uint256      timestamp;
        VTVResultado resultado;
        uint256      vencimiento;
        address      planta;      // msg.sender al momento de la carga (INSPECTOR_VTV_ROLE)
    }

    // -------------------------------------------------------------------------
    // Estado
    // -------------------------------------------------------------------------

    mapping(uint256 => VehiculoInfo)        private _vehiculos;
    mapping(uint256 => RegistroService[])   private _services;
    mapping(uint256 => RegistroSiniestro[]) private _siniestros;
    mapping(uint256 => RegistroVTV[])       private _vtv;
    mapping(uint256 => SelloEstado)         private _sellos;

    // -------------------------------------------------------------------------
    // Eventos
    // -------------------------------------------------------------------------

    event VehiculoRegistrado(
        uint256 indexed tokenId,
        string          vin,
        address indexed propietario
    );

    event ServiceAgregado(
        uint256 indexed tokenId,
        uint256         timestamp,
        string          tipoServicio
    );

    event SiniestroAgregado(
        uint256           indexed tokenId,
        uint256                   timestamp,
        SiniestroGravedad         gravedad
    );

    event VTVAgregada(
        uint256      indexed tokenId,
        uint256              timestamp,
        VTVResultado         resultado
    );

    event SelloActualizado(
        uint256     indexed tokenId,
        SelloEstado         nuevoEstado
    );

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() ERC721("CarPass", "CPASS") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRADOR_ROLE,   msg.sender);
    }

    // -------------------------------------------------------------------------
    // Alta de vehículo
    // -------------------------------------------------------------------------

    /**
     * @notice Registra un vehículo nuevo y acuña su NFT.
     * @dev tokenId = uint256(keccak256(abi.encodePacked(vin))). Revierte si ya existe.
     */
    function registrarVehiculo(VehiculoInfo calldata info)
        external
        onlyRole(REGISTRADOR_ROLE)
        returns (uint256 tokenId)
    {
        revert("not implemented");
    }

    // -------------------------------------------------------------------------
    // Carga de hitos
    // -------------------------------------------------------------------------

    /**
     * @notice Agrega un registro de service al historial del vehículo.
     */
    function agregarService(uint256 tokenId, RegistroService calldata registro)
        external
        onlyRole(MECANICO_ROLE)
    {
        revert("not implemented");
    }

    /**
     * @notice Agrega un siniestro al historial del vehículo.
     */
    function agregarSiniestro(uint256 tokenId, RegistroSiniestro calldata registro)
        external
        onlyRole(REGISTRADOR_ROLE)
    {
        revert("not implemented");
    }

    /**
     * @notice Agrega un resultado de inspección VTV.
     */
    function agregarVTV(uint256 tokenId, RegistroVTV calldata registro)
        external
        onlyRole(INSPECTOR_VTV_ROLE)
    {
        revert("not implemented");
    }

    // -------------------------------------------------------------------------
    // Consultas de historial
    // -------------------------------------------------------------------------

    function getVehiculoInfo(uint256 tokenId)
        external
        view
        returns (VehiculoInfo memory)
    {
        revert("not implemented");
    }

    function getHistorialService(uint256 tokenId)
        external
        view
        returns (RegistroService[] memory)
    {
        revert("not implemented");
    }

    function getHistorialSiniestros(uint256 tokenId)
        external
        view
        returns (RegistroSiniestro[] memory)
    {
        revert("not implemented");
    }

    function getHistorialVTV(uint256 tokenId)
        external
        view
        returns (RegistroVTV[] memory)
    {
        revert("not implemented");
    }

    // -------------------------------------------------------------------------
    // Sello de reputación
    // -------------------------------------------------------------------------

    /**
     * @notice Devuelve el estado actual del sello del vehículo.
     */
    function getSelloEstado(uint256 tokenId)
        external
        view
        returns (SelloEstado)
    {
        revert("not implemented");
    }

    /**
     * @notice Recalcula el sello según reglas de negocio y emite SelloActualizado si cambió.
     * @dev Reglas: REVOCADO si siniestro GRAVE o VTV RECHAZADA; VENCIDO si VTV expirada o sin VTV; ACTIVO si no.
     */
    function calcularSello(uint256 tokenId) external {
        revert("not implemented");
    }

    // -------------------------------------------------------------------------
    // Utilidad
    // -------------------------------------------------------------------------

    /**
     * @notice Convierte un VIN en su tokenId correspondiente (determinístico, sin estado).
     */
    function vinToTokenId(string calldata vin) external pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(vin)));
    }

    // -------------------------------------------------------------------------
    // Override requerido por Solidity (ERC721 + AccessControl comparten supportsInterface)
    // -------------------------------------------------------------------------

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
