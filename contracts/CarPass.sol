// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {CarPassSeal} from "./core/CarPassSeal.sol";
import {CarPassTransfers} from "./core/CarPassTransfers.sol";

/**
 * @title CarPass
 * @notice ERC-721 vehicular con VIN unico, historial tecnico y sello de calidad.
 * @dev La logica de dominio vive en contratos abstractos bajo contracts/core/.
 */
contract CarPass is ERC721, CarPassSeal, CarPassTransfers {
    constructor() ERC721("CarPass", "CPASS") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRADOR_ROLE, msg.sender);
    }

    function transferFrom(address from, address to, uint256 tokenId) public override {
        _carPassTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override {
        _carPassSafeTransferFrom(from, to, tokenId, data);
    }

    function _carPassOwnerOf(uint256 tokenId)
        internal
        view
        override
        returns (address)
    {
        return _ownerOf(tokenId);
    }

    function _carPassSafeMint(address to, uint256 tokenId) internal override {
        _safeMint(to, tokenId);
    }

    function _carPassTransfer(address from, address to, uint256 tokenId) internal override {
        _transfer(from, to, tokenId);
    }

    function _carPassSafeTransfer(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal override {
        _safeTransfer(from, to, tokenId, data);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
