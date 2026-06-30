// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

abstract contract CarPassErrors {
    error VehiculoYaRegistrado(string vin);
    error VehiculoNoEncontrado(uint256 tokenId);
    error VinInvalido();
    error KilometrajeNoMonotonico(uint32 recibido, uint32 ultimo);
    error TransferenciaSoloPropietario(address caller, uint256 tokenId);
}
