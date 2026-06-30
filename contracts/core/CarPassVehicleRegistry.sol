// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CarPassRoles} from "./CarPassRoles.sol";

abstract contract CarPassVehicleRegistry is CarPassRoles {
    event VehicleMinted(
        uint256 indexed tokenId,
        string vin,
        address indexed owner,
        address indexed registrar
    );

    function registrarVehiculo(VehiculoInfo calldata info, address propietarioInicial)
        external
        onlyRole(REGISTRADOR_ROLE)
        returns (uint256 tokenId)
    {
        _requireVinValido(info.vin);

        tokenId = _tokenIdFromVin(info.vin);
        if (_carPassOwnerOf(tokenId) != address(0)) {
            revert VehiculoYaRegistrado(info.vin);
        }

        _carPassSafeMint(propietarioInicial, tokenId);
        _vehiculos[tokenId] = info;

        emit VehicleMinted(tokenId, info.vin, propietarioInicial, msg.sender);
    }

    function getVehiculoInfo(uint256 tokenId)
        external
        view
        returns (VehiculoInfo memory)
    {
        return _vehiculos[tokenId];
    }

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
}
