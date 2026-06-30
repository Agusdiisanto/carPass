// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CarPassHistory} from "./CarPassHistory.sol";

abstract contract CarPassSeal is CarPassHistory {
    event SelloActualizado(
        uint256 indexed tokenId,
        SelloEstado nuevoEstado
    );

    function getSelloEstado(uint256 tokenId)
        external
        view
        returns (SelloEstado)
    {
        return _calcularSello(tokenId).estado;
    }

    function calcularSello(uint256 tokenId) external {
        SelloEstado nuevoEstado = _calcularSello(tokenId).estado;
        if (_sellos[tokenId] != nuevoEstado) {
            _sellos[tokenId] = nuevoEstado;
            emit SelloActualizado(tokenId, nuevoEstado);
        }
    }

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
        if (_carPassOwnerOf(tokenId) == address(0)) {
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
}
