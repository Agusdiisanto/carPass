// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CarPassErrors} from "./CarPassErrors.sol";
import {CarPassTypes} from "./CarPassTypes.sol";

abstract contract CarPassStorage is CarPassTypes, CarPassErrors {
    mapping(uint256 => VehiculoInfo) internal _vehiculos;
    mapping(uint256 => RegistroService[]) internal _services;
    mapping(uint256 => RegistroSiniestro[]) internal _siniestros;
    mapping(uint256 => RegistroVTV[]) internal _vtv;

    // 0 = nunca revocada. No se resetea si el rol es re-otorgado.
    mapping(address => uint256) public revocadoEn;

    // 0 = sin services registrados.
    mapping(uint256 => uint32) public ultimoKilometrajeRegistrado;

    function _carPassOwnerOf(uint256 tokenId) internal view virtual returns (address);

    function _carPassSafeMint(address to, uint256 tokenId) internal virtual;

    function _carPassTransfer(address from, address to, uint256 tokenId) internal virtual;

    function _carPassSafeTransfer(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal virtual;
}
