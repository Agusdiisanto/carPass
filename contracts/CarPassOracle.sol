// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Hashes} from "@openzeppelin/contracts/utils/cryptography/Hashes.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

interface ICarPassOracleTarget {
    function vehiculoExiste(uint256 tokenId) external view returns (bool);
}

/**
 * @title CarPassOracle
 * @notice Atestaciones externas firmadas o roleadas para enriquecer el pasaporte vehicular.
 * @dev Guarda hashes de evidencia, no documentos ni datos privados completos.
 */
contract CarPassOracle is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    bytes32 private constant ATTESTATION_TYPEHASH = keccak256(
        "OracleAttestation(uint256 vehicleTokenId,uint8 kind,bytes32 externalIdHash,bytes32 payloadHash,uint64 validUntil,address oracle,uint256 nonce,uint256 deadline)"
    );

    enum AttestationKind {
        VTV,
        SERVICE,
        SINIESTRO,
        KILOMETRAJE,
        AUTOPARTES,
        DOCUMENTO
    }

    enum AttestationStatus {
        VIGENTE,
        OBSERVADA,
        REVOCADA
    }

    struct Attestation {
        uint256 vehicleTokenId;
        bytes32 externalIdHash;
        bytes32 payloadHash;
        address oracle;
        uint64 reportedAt;
        uint64 validUntil;
        AttestationKind kind;
        AttestationStatus status;
    }

    struct EvidenceBatch {
        uint256 vehicleTokenId;
        bytes32 merkleRoot;
        bytes32 metadataHash;
        address oracle;
        uint64 reportedAt;
        AttestationKind kind;
        AttestationStatus status;
    }

    ICarPassOracleTarget public immutable carPass;

    mapping(bytes32 => Attestation) public attestations;
    mapping(bytes32 => EvidenceBatch) public evidenceBatches;
    mapping(uint256 => bytes32[]) private _vehicleAttestationIds;
    mapping(uint256 => bytes32[]) private _vehicleBatchIds;
    mapping(bytes32 => bytes32) private _attestationByDedupeKey;
    mapping(bytes32 => bytes32) private _batchByDedupeKey;
    mapping(address => uint256) public nonces;

    event AttestationSubmitted(
        bytes32 indexed attestationId,
        uint256 indexed vehicleTokenId,
        AttestationKind indexed kind,
        address oracle,
        bytes32 externalIdHash,
        bytes32 payloadHash,
        uint64 reportedAt,
        uint64 validUntil
    );

    event AttestationStatusUpdated(
        bytes32 indexed attestationId,
        AttestationStatus status,
        address updatedBy
    );

    event EvidenceBatchSubmitted(
        bytes32 indexed batchId,
        uint256 indexed vehicleTokenId,
        AttestationKind indexed kind,
        address oracle,
        bytes32 merkleRoot,
        bytes32 metadataHash,
        uint64 reportedAt,
        bytes32[] leaves
    );

    event EvidenceBatchStatusUpdated(
        bytes32 indexed batchId,
        AttestationStatus status,
        address updatedBy
    );

    error VehiculoOracleNoExiste(uint256 vehicleTokenId);
    error OracleNoAutorizado(address oracle);
    error HashInvalido();
    error AttestationDuplicada(bytes32 dedupeKey);
    error AttestationNoEncontrada(bytes32 attestationId);
    error EvidenceBatchDuplicado(bytes32 dedupeKey);
    error EvidenceBatchNoEncontrado(bytes32 batchId);
    error EvidenceSinHojas();
    error FirmaExpirada(uint256 deadline);
    error FirmaInvalida(address recovered, address expected);

    constructor(address carPass_) EIP712("CarPassOracle", "1") {
        if (carPass_ == address(0)) {
            revert OracleNoAutorizado(address(0));
        }

        carPass = ICarPassOracleTarget(carPass_);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }

    function submitAttestation(
        uint256 vehicleTokenId,
        AttestationKind kind,
        bytes32 externalIdHash,
        bytes32 payloadHash,
        uint64 validUntil
    ) external onlyRole(ORACLE_ROLE) returns (bytes32 attestationId) {
        return _submitAttestation(vehicleTokenId, kind, externalIdHash, payloadHash, validUntil, msg.sender);
    }

    function submitSignedAttestation(
        uint256 vehicleTokenId,
        AttestationKind kind,
        bytes32 externalIdHash,
        bytes32 payloadHash,
        uint64 validUntil,
        address oracle,
        uint256 deadline,
        bytes calldata signature
    ) external returns (bytes32 attestationId) {
        if (block.timestamp > deadline) {
            revert FirmaExpirada(deadline);
        }
        if (!hasRole(ORACLE_ROLE, oracle)) {
            revert OracleNoAutorizado(oracle);
        }

        uint256 nonce = nonces[oracle];
        bytes32 structHash = keccak256(
            abi.encode(
                ATTESTATION_TYPEHASH,
                vehicleTokenId,
                kind,
                externalIdHash,
                payloadHash,
                validUntil,
                oracle,
                nonce,
                deadline
            )
        );
        address recovered = _hashTypedDataV4(structHash).recover(signature);
        if (recovered != oracle) {
            revert FirmaInvalida(recovered, oracle);
        }

        nonces[oracle] = nonce + 1;
        return _submitAttestation(vehicleTokenId, kind, externalIdHash, payloadHash, validUntil, oracle);
    }

    function updateAttestationStatus(bytes32 attestationId, AttestationStatus status) external {
        Attestation storage attestation = attestations[attestationId];
        if (attestation.oracle == address(0)) {
            revert AttestationNoEncontrada(attestationId);
        }
        bool isActiveOriginalOracle = msg.sender == attestation.oracle && hasRole(ORACLE_ROLE, msg.sender);
        if (!isActiveOriginalOracle && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert OracleNoAutorizado(msg.sender);
        }

        attestation.status = status;
        emit AttestationStatusUpdated(attestationId, status, msg.sender);
    }

    function submitEvidenceBatch(
        uint256 vehicleTokenId,
        AttestationKind kind,
        bytes32[] calldata leaves,
        bytes32 metadataHash
    ) external onlyRole(ORACLE_ROLE) returns (bytes32 batchId, bytes32 merkleRoot) {
        if (!carPass.vehiculoExiste(vehicleTokenId)) {
            revert VehiculoOracleNoExiste(vehicleTokenId);
        }
        if (leaves.length == 0) {
            revert EvidenceSinHojas();
        }
        if (metadataHash == bytes32(0)) {
            revert HashInvalido();
        }

        merkleRoot = _merkleRoot(leaves);

        bytes32 dedupeKey = _dedupeKey(vehicleTokenId, kind, merkleRoot);
        if (_batchByDedupeKey[dedupeKey] != bytes32(0)) {
            revert EvidenceBatchDuplicado(dedupeKey);
        }

        uint64 reportedAt = uint64(block.timestamp);
        batchId = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                "MERKLE_BATCH",
                vehicleTokenId,
                kind,
                merkleRoot,
                metadataHash,
                msg.sender,
                reportedAt
            )
        );

        evidenceBatches[batchId] = EvidenceBatch({
            vehicleTokenId: vehicleTokenId,
            merkleRoot: merkleRoot,
            metadataHash: metadataHash,
            oracle: msg.sender,
            reportedAt: reportedAt,
            kind: kind,
            status: AttestationStatus.VIGENTE
        });
        _batchByDedupeKey[dedupeKey] = batchId;
        _vehicleBatchIds[vehicleTokenId].push(batchId);

        emit EvidenceBatchSubmitted(
            batchId,
            vehicleTokenId,
            kind,
            msg.sender,
            merkleRoot,
            metadataHash,
            reportedAt,
            leaves
        );
    }

    /// @notice Verifica sin wallet que `leaf` forma parte del batch Merkle publicado como `batchId`.
    function verifyEvidenceLeaf(
        bytes32 batchId,
        bytes32 leaf,
        bytes32[] calldata proof
    ) external view returns (bool) {
        EvidenceBatch storage batch = evidenceBatches[batchId];
        if (batch.oracle == address(0)) {
            revert EvidenceBatchNoEncontrado(batchId);
        }
        return MerkleProof.verifyCalldata(proof, batch.merkleRoot, leaf);
    }

    function updateEvidenceBatchStatus(bytes32 batchId, AttestationStatus status) external {
        EvidenceBatch storage batch = evidenceBatches[batchId];
        if (batch.oracle == address(0)) {
            revert EvidenceBatchNoEncontrado(batchId);
        }
        bool isActiveOriginalOracle = msg.sender == batch.oracle && hasRole(ORACLE_ROLE, msg.sender);
        if (!isActiveOriginalOracle && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert OracleNoAutorizado(msg.sender);
        }

        batch.status = status;
        emit EvidenceBatchStatusUpdated(batchId, status, msg.sender);
    }

    function getVehicleAttestationIds(uint256 vehicleTokenId)
        external
        view
        returns (bytes32[] memory)
    {
        return _vehicleAttestationIds[vehicleTokenId];
    }

    function getVehicleAttestationCount(uint256 vehicleTokenId) external view returns (uint256) {
        return _vehicleAttestationIds[vehicleTokenId].length;
    }

    function getVehicleEvidenceBatchIds(uint256 vehicleTokenId)
        external
        view
        returns (bytes32[] memory)
    {
        return _vehicleBatchIds[vehicleTokenId];
    }

    function getAttestationId(
        uint256 vehicleTokenId,
        AttestationKind kind,
        bytes32 externalIdHash
    ) external view returns (bytes32) {
        return _attestationByDedupeKey[_dedupeKey(vehicleTokenId, kind, externalIdHash)];
    }

    function getEvidenceBatchId(
        uint256 vehicleTokenId,
        AttestationKind kind,
        bytes32 merkleRoot
    ) external view returns (bytes32) {
        return _batchByDedupeKey[_dedupeKey(vehicleTokenId, kind, merkleRoot)];
    }

    function _submitAttestation(
        uint256 vehicleTokenId,
        AttestationKind kind,
        bytes32 externalIdHash,
        bytes32 payloadHash,
        uint64 validUntil,
        address oracle
    ) private returns (bytes32 attestationId) {
        if (!carPass.vehiculoExiste(vehicleTokenId)) {
            revert VehiculoOracleNoExiste(vehicleTokenId);
        }
        if (externalIdHash == bytes32(0) || payloadHash == bytes32(0)) {
            revert HashInvalido();
        }

        bytes32 dedupeKey = _dedupeKey(vehicleTokenId, kind, externalIdHash);
        if (_attestationByDedupeKey[dedupeKey] != bytes32(0)) {
            revert AttestationDuplicada(dedupeKey);
        }

        uint64 reportedAt = uint64(block.timestamp);
        attestationId = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                vehicleTokenId,
                kind,
                externalIdHash,
                payloadHash,
                oracle,
                reportedAt
            )
        );

        attestations[attestationId] = Attestation({
            vehicleTokenId: vehicleTokenId,
            externalIdHash: externalIdHash,
            payloadHash: payloadHash,
            oracle: oracle,
            reportedAt: reportedAt,
            validUntil: validUntil,
            kind: kind,
            status: AttestationStatus.VIGENTE
        });
        _attestationByDedupeKey[dedupeKey] = attestationId;
        _vehicleAttestationIds[vehicleTokenId].push(attestationId);

        emit AttestationSubmitted(
            attestationId,
            vehicleTokenId,
            kind,
            oracle,
            externalIdHash,
            payloadHash,
            reportedAt,
            validUntil
        );
    }

    function _dedupeKey(
        uint256 vehicleTokenId,
        AttestationKind kind,
        bytes32 externalIdHash
    ) private pure returns (bytes32) {
        return keccak256(abi.encode(vehicleTokenId, kind, externalIdHash));
    }

    /// @dev Arbol Merkle estandar (par ordenado + keccak256 conmutativo), compatible con
    /// {MerkleProof-verify}. El nodo sin par de cada nivel se promueve sin hashear.
    function _merkleRoot(bytes32[] calldata leaves) private pure returns (bytes32) {
        bytes32[] memory level = leaves;
        uint256 n = level.length;
        while (n > 1) {
            uint256 next = 0;
            for (uint256 i = 0; i < n; i += 2) {
                level[next] = (i + 1 < n) ? Hashes.commutativeKeccak256(level[i], level[i + 1]) : level[i];
                next++;
            }
            n = next;
        }
        return level[0];
    }
}
