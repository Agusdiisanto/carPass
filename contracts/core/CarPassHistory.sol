// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CarPassVehicleRegistry} from "./CarPassVehicleRegistry.sol";

abstract contract CarPassHistory is CarPassVehicleRegistry {
    event ServiceAgregado(
        uint256 indexed tokenId,
        uint256 timestamp,
        string tipoServicio
    );

    event SiniestroAgregado(
        uint256 indexed tokenId,
        uint256 timestamp,
        SiniestroGravedad gravedad
    );

    event VTVAgregada(
        uint256 indexed tokenId,
        uint256 timestamp,
        VTVResultado resultado
    );

    function agregarService(uint256 tokenId, RegistroService calldata registro)
        external
        onlyRole(MECANICO_ROLE)
    {
        if (_carPassOwnerOf(tokenId) == address(0)) {
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

    function agregarSiniestro(uint256 tokenId, RegistroSiniestro calldata registro)
        external
        onlyRole(ASEGURADORA_ROLE)
    {
        if (_carPassOwnerOf(tokenId) == address(0)) {
            revert VehiculoNoEncontrado(tokenId);
        }

        RegistroSiniestro memory nuevoRegistro = registro;
        nuevoRegistro.timestamp = block.timestamp;
        nuevoRegistro.declarante = msg.sender;

        _siniestros[tokenId].push(nuevoRegistro);

        emit SiniestroAgregado(tokenId, nuevoRegistro.timestamp, nuevoRegistro.gravedad);
    }

    function agregarVTV(uint256 tokenId, RegistroVTV calldata registro)
        external
        onlyRole(INSPECTOR_VTV_ROLE)
    {
        if (_carPassOwnerOf(tokenId) == address(0)) {
            revert VehiculoNoEncontrado(tokenId);
        }

        RegistroVTV memory nuevoRegistro = registro;
        nuevoRegistro.timestamp = block.timestamp;
        nuevoRegistro.planta = msg.sender;

        _vtv[tokenId].push(nuevoRegistro);

        emit VTVAgregada(tokenId, nuevoRegistro.timestamp, nuevoRegistro.resultado);
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
}
