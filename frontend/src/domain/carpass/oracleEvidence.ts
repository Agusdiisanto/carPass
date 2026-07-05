import { ZeroAddress, isAddress } from 'ethers'
import { CARPASS_ORACLE_DEPLOYMENT } from '../../contracts/carPassOracleDeployment'
import { formatDate, formatMonthYear } from './formatters'

export const ORACLE_KIND_LABELS = [
  'VTV',
  'Service',
  'Siniestro',
  'Kilometraje',
  'Autopartes',
  'Documento',
] as const

export const ORACLE_STATUS_LABELS = [
  'Vigente',
  'Observada',
  'Revocada',
] as const

export type OracleAttestation = {
  evidenceType: 'attestation'
  id: string
  vehicleTokenId: bigint
  externalIdHash: string
  payloadHash: string
  oracle: string
  reportedAt: bigint
  validUntil: bigint
  kind: number
  status: number
}

export type OracleEvidenceBatch = {
  evidenceType: 'batch'
  id: string
  vehicleTokenId: bigint
  merkleRoot: string
  metadataHash: string
  oracle: string
  reportedAt: bigint
  kind: number
  status: number
}

export type OracleEvidenceItem = OracleAttestation | OracleEvidenceBatch

export function resolveOracleAddress() {
  const envAddress = import.meta.env.VITE_CARPASS_ORACLE_CONTRACT_ADDRESS
  if (envAddress && envAddress !== ZeroAddress) return envAddress
  return CARPASS_ORACLE_DEPLOYMENT.address
}

export function hasOracleAddress(address = resolveOracleAddress()) {
  return isAddress(address)
}

export function normalizeOracleAttestation(id: string, raw: unknown): OracleAttestation {
  const row = raw as Record<string, unknown>
  return {
    evidenceType: 'attestation',
    id,
    vehicleTokenId: BigInt(row.vehicleTokenId as bigint | string | number),
    externalIdHash: String(row.externalIdHash ?? ''),
    payloadHash: String(row.payloadHash ?? ''),
    oracle: String(row.oracle ?? ''),
    reportedAt: BigInt(row.reportedAt as bigint | string | number),
    validUntil: BigInt(row.validUntil as bigint | string | number),
    kind: Number(row.kind ?? 0),
    status: Number(row.status ?? 0),
  }
}

export function normalizeOracleEvidenceBatch(id: string, raw: unknown): OracleEvidenceBatch {
  const row = raw as Record<string, unknown>
  return {
    evidenceType: 'batch',
    id,
    vehicleTokenId: BigInt(row.vehicleTokenId as bigint | string | number),
    merkleRoot: String(row.merkleRoot ?? ''),
    metadataHash: String(row.metadataHash ?? ''),
    oracle: String(row.oracle ?? ''),
    reportedAt: BigInt(row.reportedAt as bigint | string | number),
    kind: Number(row.kind ?? 0),
    status: Number(row.status ?? 0),
  }
}

export function oracleKindLabel(kind: number) {
  return ORACLE_KIND_LABELS[kind] ?? 'Evidencia'
}

export function oracleStatusLabel(status: number) {
  return ORACLE_STATUS_LABELS[status] ?? 'Desconocida'
}

export function oracleStatusClass(status: number) {
  if (status === 0) return 'ok'
  if (status === 1) return 'warn'
  if (status === 2) return 'bad'
  return 'neutral'
}

export function shortHash(value: string) {
  if (!value || value.length <= 14) return value || '-'
  return `${value.slice(0, 8)}...${value.slice(-6)}`
}

export function formatOracleDate(value: bigint) {
  return formatDate(value)
}

export function formatOracleValidity(value: bigint) {
  if (value === 0n) return 'Sin vencimiento'
  return `Vigente hasta ${formatMonthYear(value) ?? formatOracleDate(value)}`
}

export function oracleAddressLabel(address: string) {
  return isAddress(address) ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Oracle'
}

export function usefulOracleSources() {
  return ['VTV', 'taller', 'aseguradora', 'registro', 'autopartes']
}

export function oracleEvidenceModeLabel(item: OracleEvidenceItem) {
  return item.evidenceType === 'batch' ? 'Merkle batch' : 'EIP-712 / rol'
}
