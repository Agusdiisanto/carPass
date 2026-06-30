// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {CarPassStorage} from "./CarPassStorage.sol";

abstract contract CarPassRoles is AccessControl, CarPassStorage {
    bytes32 public constant REGISTRADOR_ROLE = keccak256("REGISTRADOR_ROLE");
    bytes32 public constant MECANICO_ROLE = keccak256("MECANICO_ROLE");
    bytes32 public constant INSPECTOR_VTV_ROLE = keccak256("INSPECTOR_VTV_ROLE");
    bytes32 public constant ASEGURADORA_ROLE = keccak256("ASEGURADORA_ROLE");

    event WalletRevocada(
        address indexed wallet,
        bytes32 indexed rol,
        uint256 timestamp
    );

    function revokeRole(bytes32 role, address account) public virtual override {
        bool hadRole = hasRole(role, account);
        super.revokeRole(role, account);
        if (hadRole) {
            revocadoEn[account] = block.timestamp;
            emit WalletRevocada(account, role, block.timestamp);
        }
    }

    function estaRevocado(address wallet) external view returns (bool) {
        return revocadoEn[wallet] != 0;
    }
}
