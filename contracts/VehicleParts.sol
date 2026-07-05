// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICarPass {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title VehicleParts
 * @notice NFT que representa cada autoparte grabada de un vehiculo CarPass.
 * @dev EPIC-18: roles delegados a CarPass via hasRole, sin AccessControl propio.
 */
contract VehicleParts is ERC721, ReentrancyGuard {

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

    struct ParteStorage {
        string    numeroGrabado;
        address   instalador;
        uint64    timestamp;
        TipoParte tipo;
        bool      reemplazada;
    }

    // -------------------------------------------------------------------------
    // Estado
    // -------------------------------------------------------------------------

    ICarPass public immutable carPass;

    mapping(uint256 => bool) private _partesRegistradas;
    mapping(uint256 => mapping(TipoParte => uint256)) private _parteActualTokenId;
    mapping(uint256 => ParteStorage) private _partes;
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

    function _ownerVehiculo(uint256 vehicleTokenId) private view returns (address owner) {
        try carPass.ownerOf(vehicleTokenId) returns (address resolvedOwner) {
            return resolvedOwner;
        } catch {
            revert VehiculoInexistente(vehicleTokenId);
        }
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
        nonReentrant
        onlyCarPassRole(REGISTRADOR_ROLE)
        returns (uint256[TOTAL_TIPOS_PARTE] memory partTokenIds)
    {
        if (_partesRegistradas[vehicleTokenId]) {
            revert PartesYaRegistradas(vehicleTokenId);
        }

        address vehicleOwner = _ownerVehiculo(vehicleTokenId);

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
        nonReentrant
        onlyCarPassRole(MECANICO_ROLE)
        returns (uint256 nuevoPartTokenId)
    {
        if (!_partesRegistradas[vehicleTokenId]) {
            revert PartesNoRegistradas(vehicleTokenId);
        }

        uint256 parteAnteriorTokenId = _parteActualTokenId[vehicleTokenId][tipo];
        _partes[parteAnteriorTokenId].reemplazada = true;

        address vehicleOwner = _ownerVehiculo(vehicleTokenId);
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

        _partes[partTokenId] = ParteStorage({
            numeroGrabado: numeroGrabado,
            instalador: msg.sender,
            timestamp: uint64(block.timestamp),
            tipo: tipo,
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
        return _partePublica(vehicleTokenId, _parteActualTokenId[vehicleTokenId][tipo]);
    }

    function getPartesVehiculo(uint256 vehicleTokenId)
        external
        view
        returns (Parte[TOTAL_TIPOS_PARTE] memory partes)
    {
        for (uint8 i = 0; i < TOTAL_TIPOS_PARTE; i++) {
            TipoParte tipo = TipoParte(i);
            partes[i] = _partePublica(vehicleTokenId, _parteActualTokenId[vehicleTokenId][tipo]);
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
            historial[i] = _partePublica(vehicleTokenId, tokenIds[i]);
        }
    }

    function _partePublica(uint256 vehicleTokenId, uint256 partTokenId)
        private
        view
        returns (Parte memory)
    {
        if (partTokenId == 0) {
            return Parte({
                vehicleTokenId: 0,
                tipo: TipoParte.MOTOR,
                numeroGrabado: "",
                timestamp: 0,
                instalador: address(0),
                reemplazada: false
            });
        }

        ParteStorage storage parte = _partes[partTokenId];
        return Parte({
            vehicleTokenId: vehicleTokenId,
            tipo: parte.tipo,
            numeroGrabado: parte.numeroGrabado,
            timestamp: parte.timestamp,
            instalador: parte.instalador,
            reemplazada: parte.reemplazada
        });
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
