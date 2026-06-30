// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CarPassRoles} from "./CarPassRoles.sol";

abstract contract CarPassTransfers is CarPassRoles {
    function _carPassTransferFrom(address from, address to, uint256 tokenId) internal {
        _requireOwnerTransfer(from, tokenId);
        _carPassTransfer(from, to, tokenId);
    }

    function _carPassSafeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal {
        _requireOwnerTransfer(from, tokenId);
        _carPassSafeTransfer(from, to, tokenId, data);
    }

    function _requireOwnerTransfer(address from, uint256 tokenId) internal view {
        if (msg.sender != from) {
            revert TransferenciaSoloPropietario(msg.sender, tokenId);
        }
    }
}
