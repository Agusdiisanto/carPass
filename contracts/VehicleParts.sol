// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

interface ICarPass {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function ownerOf(uint256 tokenId) external view returns (address);
    function vehiculoExiste(uint256 tokenId) external view returns (bool);
}

/**
 * @title VehicleParts
 * @notice NFT que representa cada autoparte grabada de un vehiculo CarPass.
 * @dev EPIC-18: roles delegados a CarPass via hasRole, sin AccessControl propio.
 */
contract VehicleParts is ERC721 {

    // -------------------------------------------------------------------------
    // Roles (deben coincidir con los definidos en CarPass)
    // -------------------------------------------------------------------------

    bytes32 public constant REGISTRADOR_ROLE = keccak256("REGISTRADOR_ROLE");
    bytes32 public constant MECANICO_ROLE    = keccak256("MECANICO_ROLE");

    // -------------------------------------------------------------------------
    // Enums
    // -------------------------------------------------------------------------

    enum TipoParte {
        MOTOR,
        CAJA_CAMBIOS,
        PUERTA_DELANTERA_IZQUIERDA,
        PUERTA_DELANTERA_DERECHA,
        CAPOT,
        BAUL
    }

    uint8 private constant TOTAL_TIPOS_PARTE = 6;

    // -------------------------------------------------------------------------
    // Errores
    // -------------------------------------------------------------------------

    error VehiculoInexistente(uint256 vehicleTokenId);
    error PartesYaRegistradas(uint256 vehicleTokenId);
    error PartesNoRegistradas(uint256 vehicleTokenId);
    error NumeroGrabadoInvalido();
    error RolInsuficiente(address caller, bytes32 role);
    error TransferenciaNoPermitida();

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    struct Parte {
        uint256   vehicleTokenId;
        TipoParte tipo;
        string    numeroGrabado;
        uint256   timestamp;
        address   instalador;
        bool      reemplazada;
    }

    // -------------------------------------------------------------------------
    // Estado
    // -------------------------------------------------------------------------

    ICarPass public immutable carPass;

    mapping(uint256 => bool) private _partesRegistradas;
    mapping(uint256 => mapping(TipoParte => uint256)) private _parteActualTokenId;
    mapping(uint256 => Parte) private _partes;
    mapping(uint256 => mapping(TipoParte => uint256[])) private _historialPartes;

    // -------------------------------------------------------------------------
    // Eventos
    // -------------------------------------------------------------------------

    event PartesRegistradas(
        uint256 indexed vehicleTokenId,
        address indexed registrador,
        uint256         timestamp
    );

    event ParteReemplazada(
        uint256   indexed vehicleTokenId,
        TipoParte indexed tipo,
        uint256           parteAnteriorTokenId,
        uint256           nuevoPartTokenId,
        address           taller,
        uint256           timestamp
    );

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address carPass_) ERC721("CarPass Autopartes", "CPART") {
        carPass = ICarPass(carPass_);
    }

    // -------------------------------------------------------------------------
    // Modificadores de rol (delegados a CarPass)
    // -------------------------------------------------------------------------

    modifier onlyCarPassRole(bytes32 role) {
        if (!carPass.hasRole(role, msg.sender)) {
            revert RolInsuficiente(msg.sender, role);
        }
        _;
    }

    // -------------------------------------------------------------------------
    // Alta de partes
    // -------------------------------------------------------------------------

    /**
     * @notice Mintea las 6 autopartes grabadas iniciales de un vehiculo.
     * @dev Indice del array sigue el orden del enum TipoParte.
     */
    function registrarPartes(uint256 vehicleTokenId, string[TOTAL_TIPOS_PARTE] calldata numerosGrabado)
        external
        onlyCarPassRole(REGISTRADOR_ROLE)
        returns (uint256[TOTAL_TIPOS_PARTE] memory partTokenIds)
    {
        if (!carPass.vehiculoExiste(vehicleTokenId)) {
            revert VehiculoInexistente(vehicleTokenId);
        }
        if (_partesRegistradas[vehicleTokenId]) {
            revert PartesYaRegistradas(vehicleTokenId);
        }

        address vehicleOwner = carPass.ownerOf(vehicleTokenId);

        for (uint8 i = 0; i < TOTAL_TIPOS_PARTE; i++) {
            TipoParte tipo = TipoParte(i);
            partTokenIds[i] = _instalarParte(vehicleTokenId, tipo, numerosGrabado[i], vehicleOwner);
        }

        _partesRegistradas[vehicleTokenId] = true;

        emit PartesRegistradas(vehicleTokenId, msg.sender, block.timestamp);
    }

    /**
     * @notice Reemplaza la autoparte activa de un tipo dado (ej. cambio de motor).
     * @dev La parte anterior queda marcada reemplazada=true, nunca se quema ni se pisa.
     */
    function reemplazarParte(uint256 vehicleTokenId, TipoParte tipo, string calldata nuevoNumeroGrabado)
        external
        onlyCarPassRole(MECANICO_ROLE)
        returns (uint256 nuevoPartTokenId)
    {
        if (!_partesRegistradas[vehicleTokenId]) {
            revert PartesNoRegistradas(vehicleTokenId);
        }

        uint256 parteAnteriorTokenId = _parteActualTokenId[vehicleTokenId][tipo];
        _partes[parteAnteriorTokenId].reemplazada = true;

        address vehicleOwner = carPass.ownerOf(vehicleTokenId);
        nuevoPartTokenId = _instalarParte(vehicleTokenId, tipo, nuevoNumeroGrabado, vehicleOwner);

        emit ParteReemplazada(
            vehicleTokenId,
            tipo,
            parteAnteriorTokenId,
            nuevoPartTokenId,
            msg.sender,
            block.timestamp
        );
    }

    function _instalarParte(
        uint256 vehicleTokenId,
        TipoParte tipo,
        string calldata numeroGrabado,
        address vehicleOwner
    ) private returns (uint256 partTokenId) {
        if (bytes(numeroGrabado).length == 0) {
            revert NumeroGrabadoInvalido();
        }

        partTokenId = uint256(keccak256(abi.encodePacked(vehicleTokenId, tipo, numeroGrabado)));

        _safeMint(vehicleOwner, partTokenId);

        _partes[partTokenId] = Parte({
            vehicleTokenId: vehicleTokenId,
            tipo: tipo,
            numeroGrabado: numeroGrabado,
            timestamp: block.timestamp,
            instalador: msg.sender,
            reemplazada: false
        });

        _parteActualTokenId[vehicleTokenId][tipo] = partTokenId;
        _historialPartes[vehicleTokenId][tipo].push(partTokenId);
    }

    // -------------------------------------------------------------------------
    // Consultas
    // -------------------------------------------------------------------------

    function getParteActual(uint256 vehicleTokenId, TipoParte tipo)
        external
        view
        returns (Parte memory)
    {
        return _partes[_parteActualTokenId[vehicleTokenId][tipo]];
    }

    function getPartesVehiculo(uint256 vehicleTokenId)
        external
        view
        returns (Parte[TOTAL_TIPOS_PARTE] memory partes)
    {
        for (uint8 i = 0; i < TOTAL_TIPOS_PARTE; i++) {
            TipoParte tipo = TipoParte(i);
            partes[i] = _partes[_parteActualTokenId[vehicleTokenId][tipo]];
        }
    }

    function getHistorialParte(uint256 vehicleTokenId, TipoParte tipo)
        external
        view
        returns (Parte[] memory historial)
    {
        uint256[] storage tokenIds = _historialPartes[vehicleTokenId][tipo];
        historial = new Parte[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            historial[i] = _partes[tokenIds[i]];
        }
    }

    // -------------------------------------------------------------------------
    // Transferencias deshabilitadas — el token de parte no es un activo comerciable
    // -------------------------------------------------------------------------

    function transferFrom(address, address, uint256) public pure override {
        revert TransferenciaNoPermitida();
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert TransferenciaNoPermitida();
    }
}
