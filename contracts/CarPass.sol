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
    bytes32 public constant ASEGURADORA_ROLE   = keccak256("ASEGURADORA_ROLE");

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
    // Errores
    // -------------------------------------------------------------------------

    error VehiculoYaRegistrado(string vin);
    error VehiculoNoEncontrado(uint256 tokenId);
    error VinInvalido();
    error KilometrajeNoMonotonico(uint32 recibido, uint32 ultimo);
    error TransferenciaSoloPropietario(address caller, uint256 tokenId);

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    struct VehiculoInfo {
        string vin;
        string marca;
        string modelo;
        uint16 anio;
        string color;
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
        address           declarante;    // msg.sender al momento de la carga (ASEGURADORA_ROLE)
    }

    struct RegistroVTV {
        uint256      timestamp;
        VTVResultado resultado;
        uint256      vencimiento;
        address      planta;      // msg.sender al momento de la carga (INSPECTOR_VTV_ROLE)
    }

    struct SelloCalidad {
        SelloEstado estado;
        string      motivo;
    }

    // -------------------------------------------------------------------------
    // Estado
    // -------------------------------------------------------------------------

    mapping(uint256 => VehiculoInfo)        private _vehiculos;
    mapping(uint256 => RegistroService[])   private _services;
    mapping(uint256 => RegistroSiniestro[]) private _siniestros;
    mapping(uint256 => RegistroVTV[])       private _vtv;
    mapping(uint256 => SelloEstado)         private _sellos;

    // Timestamp de la última revocación de cualquier rol (0 = nunca revocada).
    // No se resetea si el rol es re-otorgado — marca histórica permanente.
    mapping(address => uint256) public revocadoEn;

    // Ultimo kilometraje aceptado por vehiculo. 0 = sin services registrados.
    mapping(uint256 => uint32) public ultimoKilometrajeRegistrado;

    // -------------------------------------------------------------------------
    // Eventos
    // -------------------------------------------------------------------------

    event VehicleMinted(
        uint256 indexed tokenId,
        string vin,
        address indexed owner,
        address indexed registrar
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

    // Emitido cuando se revoca un rol de una wallet.
    // Complementa RoleRevoked de OZ agregando block.timestamp para trazabilidad on-chain.
    event WalletRevocada(
        address indexed wallet,
        bytes32 indexed rol,
        uint256         timestamp
    );

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() ERC721("CarPass", "CPASS") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRADOR_ROLE,   msg.sender);
    }

    // -------------------------------------------------------------------------
    // Control de acceso — revocación con trazabilidad
    // -------------------------------------------------------------------------

    /**
     * @notice Revoca `role` de `account` y registra la revocación on-chain.
     * @dev Extiende OZ revokeRole: setea revocadoEn y emite WalletRevocada.
     *      El historial de registros escritos por `account` queda inmutable.
     */
    function revokeRole(bytes32 role, address account) public override {
        bool hadRole = hasRole(role, account);
        super.revokeRole(role, account);
        if (hadRole) {
            revocadoEn[account] = block.timestamp;
            emit WalletRevocada(account, role, block.timestamp);
        }
    }

    /**
     * @notice Devuelve true si la wallet tuvo al menos un rol revocado alguna vez.
     * @dev Usar en el frontend para mostrar advertencia sobre registros del actor.
     */
    function estaRevocado(address wallet) external view returns (bool) {
        return revocadoEn[wallet] != 0;
    }

    // -------------------------------------------------------------------------
    // Alta de vehículo
    // -------------------------------------------------------------------------

    /**
     * @notice Registra un vehículo nuevo y acuña su NFT.
     * @dev tokenId = uint256(keccak256(abi.encodePacked(vin))). Revierte si ya existe.
     *      El kilometraje inicial queda en 0 hasta el primer service.
     */
    function registrarVehiculo(VehiculoInfo calldata info, address propietarioInicial)
        external
        onlyRole(REGISTRADOR_ROLE)
        returns (uint256 tokenId)
    {
        _requireVinValido(info.vin);

        tokenId = _tokenIdFromVin(info.vin);
        if (_ownerOf(tokenId) != address(0)) {
            revert VehiculoYaRegistrado(info.vin);
        }

        _safeMint(propietarioInicial, tokenId);
        _vehiculos[tokenId] = info;

        emit VehicleMinted(tokenId, info.vin, propietarioInicial, msg.sender);
    }

    // -------------------------------------------------------------------------
    // Transferencias
    // -------------------------------------------------------------------------

    /**
     * @notice Transfiere el pasaporte digital. Solo puede iniciarla el propietario.
     * @dev Mantiene el evento ERC-721 Transfer y bloquea transferencias por aprobados.
     */
    function transferFrom(address from, address to, uint256 tokenId) public override {
        _requireOwnerTransfer(from, tokenId);
        _transfer(from, to, tokenId);
    }

    /**
     * @notice Variante segura de transferencia. Solo puede iniciarla el propietario.
     * @dev El overload de 3 parametros de ERC-721 delega en esta funcion.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override {
        _requireOwnerTransfer(from, tokenId);
        _safeTransfer(from, to, tokenId, data);
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
        if (_ownerOf(tokenId) == address(0)) {
            revert VehiculoNoEncontrado(tokenId);
        }

        uint32 ultimoKilometraje = ultimoKilometrajeRegistrado[tokenId];
        if (registro.kilometraje <= ultimoKilometraje) {
            revert KilometrajeNoMonotonico(registro.kilometraje, ultimoKilometraje);
        }

        RegistroService memory nuevoRegistro = registro;
        nuevoRegistro.timestamp = block.timestamp;
        nuevoRegistro.taller = msg.sender;

        _services[tokenId].push(nuevoRegistro);
        ultimoKilometrajeRegistrado[tokenId] = nuevoRegistro.kilometraje;

        emit ServiceAgregado(tokenId, nuevoRegistro.timestamp, nuevoRegistro.tipoServicio);
    }

    /**
     * @notice Agrega un siniestro al historial del vehículo.
     */
    function agregarSiniestro(uint256 tokenId, RegistroSiniestro calldata registro)
        external
        onlyRole(ASEGURADORA_ROLE)
    {
        if (_ownerOf(tokenId) == address(0)) {
            revert VehiculoNoEncontrado(tokenId);
        }

        RegistroSiniestro memory nuevoRegistro = registro;
        nuevoRegistro.timestamp = block.timestamp;
        nuevoRegistro.declarante = msg.sender;

        _siniestros[tokenId].push(nuevoRegistro);

        emit SiniestroAgregado(tokenId, nuevoRegistro.timestamp, nuevoRegistro.gravedad);
    }

    /**
     * @notice Agrega un resultado de inspección VTV.
     */
    function agregarVTV(uint256 tokenId, RegistroVTV calldata registro)
        external
        onlyRole(INSPECTOR_VTV_ROLE)
    {
        if (_ownerOf(tokenId) == address(0)) {
            revert VehiculoNoEncontrado(tokenId);
        }

        RegistroVTV memory nuevoRegistro = registro;
        nuevoRegistro.timestamp = block.timestamp;
        nuevoRegistro.planta = msg.sender;

        _vtv[tokenId].push(nuevoRegistro);

        emit VTVAgregada(tokenId, nuevoRegistro.timestamp, nuevoRegistro.resultado);
    }

    // -------------------------------------------------------------------------
    // Consultas de historial
    // -------------------------------------------------------------------------

    function getVehiculoInfo(uint256 tokenId)
        external
        view
        returns (VehiculoInfo memory)
    {
        return _vehiculos[tokenId];
    }

    function getHistorialService(uint256 tokenId)
        external
        view
        returns (RegistroService[] memory)
    {
        return _services[tokenId];
    }

    function getHistorialSiniestros(uint256 tokenId)
        external
        view
        returns (RegistroSiniestro[] memory)
    {
        return _siniestros[tokenId];
    }

    function getHistorialVTV(uint256 tokenId)
        external
        view
        returns (RegistroVTV[] memory)
    {
        return _vtv[tokenId];
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
        return _calcularSello(tokenId).estado;
    }

    /**
     * @notice Recalcula el sello según reglas de negocio y emite SelloActualizado si cambió.
     * @dev Reglas: REVOCADO si siniestro GRAVE o VTV RECHAZADA; VENCIDO si VTV expirada o sin VTV; ACTIVO si no.
     */
    function calcularSello(uint256 tokenId) external {
        SelloEstado nuevoEstado = _calcularSello(tokenId).estado;
        if (_sellos[tokenId] != nuevoEstado) {
            _sellos[tokenId] = nuevoEstado;
            emit SelloActualizado(tokenId, nuevoEstado);
        }
    }

    /**
     * @notice Devuelve el estado calculado y el motivo del sello del vehiculo.
     */
    function getSelloCalidad(uint256 tokenId)
        external
        view
        returns (SelloEstado estado, string memory motivo)
    {
        SelloCalidad memory sello = _calcularSello(tokenId);
        return (sello.estado, sello.motivo);
    }

    function _calcularSello(uint256 tokenId)
        internal
        view
        returns (SelloCalidad memory)
    {
        if (_ownerOf(tokenId) == address(0)) {
            revert VehiculoNoEncontrado(tokenId);
        }

        RegistroService[] storage services = _services[tokenId];
        uint32 kilometrajeAnterior = 0;
        for (uint256 i = 0; i < services.length; i++) {
            if (services[i].kilometraje <= kilometrajeAnterior) {
                return SelloCalidad(
                    SelloEstado.REVOCADO,
                    "Historial con kilometraje no monotonico"
                );
            }
            kilometrajeAnterior = services[i].kilometraje;
        }

        RegistroVTV[] storage vtvs = _vtv[tokenId];
        uint256 ultimaVTVIndex = 0;
        bool tieneVTV = false;
        for (uint256 i = 0; i < vtvs.length; i++) {
            if (vtvs[i].resultado == VTVResultado.RECHAZADO) {
                return SelloCalidad(
                    SelloEstado.REVOCADO,
                    "VTV rechazada"
                );
            }

            if (!tieneVTV || vtvs[i].timestamp > vtvs[ultimaVTVIndex].timestamp) {
                ultimaVTVIndex = i;
                tieneVTV = true;
            }
        }

        RegistroSiniestro[] storage siniestros = _siniestros[tokenId];
        for (uint256 i = 0; i < siniestros.length; i++) {
            if (
                siniestros[i].gravedad == SiniestroGravedad.GRAVE &&
                !siniestros[i].reparado
            ) {
                return SelloCalidad(
                    SelloEstado.REVOCADO,
                    "Siniestro grave sin reparacion registrada"
                );
            }
        }

        if (!tieneVTV) {
            return SelloCalidad(
                SelloEstado.VENCIDO,
                "Sin VTV registrada"
            );
        }

        if (vtvs[ultimaVTVIndex].vencimiento < block.timestamp) {
            return SelloCalidad(
                SelloEstado.VENCIDO,
                "VTV vencida"
            );
        }

        if (vtvs[ultimaVTVIndex].resultado == VTVResultado.APROBADO_CON_OBSERVACIONES) {
            return SelloCalidad(
                SelloEstado.VENCIDO,
                "VTV aprobada con observaciones"
            );
        }

        if (services.length == 0) {
            return SelloCalidad(
                SelloEstado.VENCIDO,
                "Sin service registrado"
            );
        }

        if (services[services.length - 1].timestamp + 365 days < block.timestamp) {
            return SelloCalidad(
                SelloEstado.VENCIDO,
                "Mantenimiento vencido"
            );
        }

        return SelloCalidad(
            SelloEstado.ACTIVO,
            "Sello valido"
        );
    }

    // -------------------------------------------------------------------------
    // Utilidad
    // -------------------------------------------------------------------------

    /**
     * @notice Convierte un VIN en su tokenId correspondiente (determinístico, sin estado).
     */
    function vinToTokenId(string calldata vin) external pure returns (uint256) {
        return _tokenIdFromVin(vin);
    }

    function _tokenIdFromVin(string memory vin) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(vin)));
    }

    function _requireVinValido(string memory vin) internal pure {
        if (bytes(vin).length != 17) {
            revert VinInvalido();
        }
    }

    function _requireOwnerTransfer(address from, uint256 tokenId) internal view {
        if (msg.sender != from) {
            revert TransferenciaSoloPropietario(msg.sender, tokenId);
        }
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
