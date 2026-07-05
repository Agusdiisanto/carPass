/* Auto-generated from artifacts/contracts/CarPassOracle.sol/CarPassOracle.json. */
/* Run `npm run export:frontend` after contract ABI changes. */

export const CARPASS_ORACLE_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "carPass_",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AccessControlBadConfirmation",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "neededRole",
        "type": "bytes32"
      }
    ],
    "name": "AccessControlUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dedupeKey",
        "type": "bytes32"
      }
    ],
    "name": "AttestationDuplicada",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "attestationId",
        "type": "bytes32"
      }
    ],
    "name": "AttestationNoEncontrada",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ECDSAInvalidSignature",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "length",
        "type": "uint256"
      }
    ],
    "name": "ECDSAInvalidSignatureLength",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "ECDSAInvalidSignatureS",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dedupeKey",
        "type": "bytes32"
      }
    ],
    "name": "EvidenceBatchDuplicado",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "batchId",
        "type": "bytes32"
      }
    ],
    "name": "EvidenceBatchNoEncontrado",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      }
    ],
    "name": "FirmaExpirada",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "recovered",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "expected",
        "type": "address"
      }
    ],
    "name": "FirmaInvalida",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "HashInvalido",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidShortString",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "oracle",
        "type": "address"
      }
    ],
    "name": "OracleNoAutorizado",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "str",
        "type": "string"
      }
    ],
    "name": "StringTooLong",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "vehicleTokenId",
        "type": "uint256"
      }
    ],
    "name": "VehiculoOracleNoExiste",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "attestationId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "enum CarPassOracle.AttestationStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "updatedBy",
        "type": "address"
      }
    ],
    "name": "AttestationStatusUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "attestationId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "vehicleTokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "enum CarPassOracle.AttestationKind",
        "name": "kind",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "oracle",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "externalIdHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "payloadHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "reportedAt",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "validUntil",
        "type": "uint64"
      }
    ],
    "name": "AttestationSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "EIP712DomainChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "batchId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "enum CarPassOracle.AttestationStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "updatedBy",
        "type": "address"
      }
    ],
    "name": "EvidenceBatchStatusUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "batchId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "vehicleTokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "enum CarPassOracle.AttestationKind",
        "name": "kind",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "oracle",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "merkleRoot",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "metadataHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "reportedAt",
        "type": "uint64"
      }
    ],
    "name": "EvidenceBatchSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "previousAdminRole",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "newAdminRole",
        "type": "bytes32"
      }
    ],
    "name": "RoleAdminChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "RoleGranted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "RoleRevoked",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "DEFAULT_ADMIN_ROLE",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ORACLE_ROLE",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "attestations",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "vehicleTokenId",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "externalIdHash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "payloadHash",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "oracle",
        "type": "address"
      },
      {
        "internalType": "uint64",
        "name": "reportedAt",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "validUntil",
        "type": "uint64"
      },
      {
        "internalType": "enum CarPassOracle.AttestationKind",
        "name": "kind",
        "type": "uint8"
      },
      {
        "internalType": "enum CarPassOracle.AttestationStatus",
        "name": "status",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "carPass",
    "outputs": [
      {
        "internalType": "contract ICarPassOracleTarget",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "eip712Domain",
    "outputs": [
      {
        "internalType": "bytes1",
        "name": "fields",
        "type": "bytes1"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "version",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "chainId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "verifyingContract",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "salt",
        "type": "bytes32"
      },
      {
        "internalType": "uint256[]",
        "name": "extensions",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "evidenceBatches",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "vehicleTokenId",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "merkleRoot",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "metadataHash",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "oracle",
        "type": "address"
      },
      {
        "internalType": "uint64",
        "name": "reportedAt",
        "type": "uint64"
      },
      {
        "internalType": "enum CarPassOracle.AttestationKind",
        "name": "kind",
        "type": "uint8"
      },
      {
        "internalType": "enum CarPassOracle.AttestationStatus",
        "name": "status",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "vehicleTokenId",
        "type": "uint256"
      },
      {
        "internalType": "enum CarPassOracle.AttestationKind",
        "name": "kind",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "externalIdHash",
        "type": "bytes32"
      }
    ],
    "name": "getAttestationId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "vehicleTokenId",
        "type": "uint256"
      },
      {
        "internalType": "enum CarPassOracle.AttestationKind",
        "name": "kind",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "merkleRoot",
        "type": "bytes32"
      }
    ],
    "name": "getEvidenceBatchId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      }
    ],
    "name": "getRoleAdmin",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "vehicleTokenId",
        "type": "uint256"
      }
    ],
    "name": "getVehicleAttestationCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "vehicleTokenId",
        "type": "uint256"
      }
    ],
    "name": "getVehicleAttestationIds",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "vehicleTokenId",
        "type": "uint256"
      }
    ],
    "name": "getVehicleEvidenceBatchIds",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "grantRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "hasRole",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "nonces",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "callerConfirmation",
        "type": "address"
      }
    ],
    "name": "renounceRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "revokeRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "vehicleTokenId",
        "type": "uint256"
      },
      {
        "internalType": "enum CarPassOracle.AttestationKind",
        "name": "kind",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "externalIdHash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "payloadHash",
        "type": "bytes32"
      },
      {
        "internalType": "uint64",
        "name": "validUntil",
        "type": "uint64"
      }
    ],
    "name": "submitAttestation",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "attestationId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "vehicleTokenId",
        "type": "uint256"
      },
      {
        "internalType": "enum CarPassOracle.AttestationKind",
        "name": "kind",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "merkleRoot",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "metadataHash",
        "type": "bytes32"
      }
    ],
    "name": "submitEvidenceBatch",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "batchId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "vehicleTokenId",
        "type": "uint256"
      },
      {
        "internalType": "enum CarPassOracle.AttestationKind",
        "name": "kind",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "externalIdHash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "payloadHash",
        "type": "bytes32"
      },
      {
        "internalType": "uint64",
        "name": "validUntil",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "oracle",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "submitSignedAttestation",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "attestationId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "attestationId",
        "type": "bytes32"
      },
      {
        "internalType": "enum CarPassOracle.AttestationStatus",
        "name": "status",
        "type": "uint8"
      }
    ],
    "name": "updateAttestationStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "batchId",
        "type": "bytes32"
      },
      {
        "internalType": "enum CarPassOracle.AttestationStatus",
        "name": "status",
        "type": "uint8"
      }
    ],
    "name": "updateEvidenceBatchStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const
