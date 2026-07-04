import { BrowserProvider, Contract, ZeroAddress, isAddress } from 'ethers'
import { useState } from 'react'
import { CARPASS_ABI } from '../contracts/carpassAbi'
import { CARPASS_DEPLOYMENT } from '../contracts/carpassDeployment'
import { parseContractError } from '../domain/carpass/errors'
import { normalizeVin } from '../domain/carpass/formatters'
import { normalizeSelloCalidad, normalizeVehiculoInfo } from '../domain/carpass/vehicleInfo'
import { isValidVin, normalizeWalletAddress } from '../domain/carpass/validators'
import type { Role } from '../domain/carpass/roles'
import {
  notifyVehicleChainUpdate,
  type VehicleChainRefreshReason,
} from '../lib/vehicleChainRefresh'
import { requestFleetSync } from '../lib/fleetSync'
import { getPublicProvider } from '../lib/publicProvider'
import { resolveVehicleByVin } from '../lib/vehicleLookup'
import {
  recordChainActivity,
  updateChainActivity,
  type ChainActivityKind,
} from '../lib/chainActivity'
import {
  describeFleetReadError,
  queryTransferEventsForToken,
  queryTransferEventsToAddress,
} from '../lib/fleetRead'

import { getActiveEthereum, type EthereumProvider } from '../lib/ethereumProvider'
import { ensureSepoliaWalletReady } from '../lib/sepoliaGate'

function resolveContractAddress() {
  const envAddress = import.meta.env.VITE_CARPASS_CONTRACT_ADDRESS
  if (envAddress && envAddress !== ZeroAddress) return envAddress
  return CARPASS_DEPLOYMENT.address
}

export const ABI = CARPASS_ABI
export const CONTRACT_ADDRESS = resolveContractAddress()
export const hasContractAddress = isAddress(CONTRACT_ADDRESS)

export type { Role } from '../domain/carpass/roles'

export type VehiculoInfo = {
  vin: string
  marca: string
  modelo: string
  anio: number
  color: string
}

export type RegistroService = {
  timestamp: bigint
  tipoServicio: string
  kilometraje: bigint
  taller: string
  descripcion: string
}

export type RegistroSiniestro = {
  timestamp: bigint
  costoEstimado: bigint
  descripcion: string
  gravedad: number
  reparado: boolean
  declarante: string
}

export type RegistroVTV = {
  timestamp: bigint
  vencimiento: bigint
  resultado: number
  planta: string
}

export type SelloCalidad = {
  estado: number
  motivo: string
}

export type TransferenciaVehiculo = {
  from: string
  to: string
  tokenId: bigint
  blockNumber: number
  txHash: string
}

function getProvider() {
  const eth = getActiveEthereum()
  if (!eth) throw new Error('MetaMask no detectado')
  return new BrowserProvider(eth as EthereumProvider)
}

async function getSignerContract() {
  if (!hasContractAddress) throw new Error('Contrato no configurado')
  await ensureSepoliaWalletReady()
  const signer = await getProvider().getSigner()
  return new Contract(CONTRACT_ADDRESS, ABI, signer)
}

async function getReadContract() {
  if (!hasContractAddress) throw new Error('Contrato no configurado')
  return new Contract(CONTRACT_ADDRESS, ABI, getPublicProvider())
}

export async function detectRole(address: string): Promise<Role> {
  const contract = await getReadContract()
  const [adminRole, regRole, mecRole, asegRole, vtvRole] = await Promise.all([
    contract.DEFAULT_ADMIN_ROLE(),
    contract.REGISTRADOR_ROLE(),
    contract.MECANICO_ROLE(),
    contract.ASEGURADORA_ROLE(),
    contract.INSPECTOR_VTV_ROLE(),
  ])
  const [isAdmin, isReg, isMec, isAseg, isVtv] = await Promise.all([
    contract.hasRole(adminRole, address),
    contract.hasRole(regRole, address),
    contract.hasRole(mecRole, address),
    contract.hasRole(asegRole, address),
    contract.hasRole(vtvRole, address),
  ])
  if (isAdmin) return 'admin'
  if (isReg) return 'registrador'
  if (isMec) return 'mecanico'
  if (isAseg) return 'aseguradora'
  if (isVtv) return 'inspector'
  return 'none'
}

export async function resolveVinByTokenId(tokenId: bigint): Promise<string | null> {
  try {
    const c = await getReadContract()
    const info = normalizeVehiculoInfo(await c.getVehiculoInfo(tokenId))
    const vin = normalizeVin(info.vin)
    return isValidVin(vin) ? vin : null
  } catch {
    return null
  }
}

export async function emitVehicleChainUpdateFromToken(tokenId: bigint, reason: VehicleChainRefreshReason) {
  const vin = await resolveVinByTokenId(tokenId)
  if (vin) notifyVehicleChainUpdate(vin, reason)
}

export async function getVehiculoPorVin(vin: string) {
  const c = await getReadContract()
  return resolveVehicleByVin(c, vin)
}

export async function getHistorial(tokenId: bigint) {
  const c = await getReadContract()
  const [services, siniestros, vtv, selloRaw] = await Promise.all([
    c.getHistorialService(tokenId) as Promise<RegistroService[]>,
    c.getHistorialSiniestros(tokenId) as Promise<RegistroSiniestro[]>,
    c.getHistorialVTV(tokenId) as Promise<RegistroVTV[]>,
    c.getSelloCalidad(tokenId),
  ])
  return {
    services,
    siniestros,
    vtv,
    sello: normalizeSelloCalidad(selloRaw),
  }
}

export async function getUltimoKm(tokenId: bigint): Promise<number> {
  const c = await getReadContract()
  return Number(await c.ultimoKilometrajeRegistrado(tokenId))
}

export async function getPropietario(tokenId: bigint): Promise<string> {
  const c = await getReadContract()
  return (await c.ownerOf(tokenId)) as string
}

export async function getMisVehiculos(address: string): Promise<Array<{ tokenId: bigint; info: VehiculoInfo }>> {
  const { tokenIds } = await queryTransferEventsToAddress(CONTRACT_ADDRESS, address)
  const readContract = await getReadContract()
  const results = await Promise.all(
    tokenIds.map(async (tokenId) => {
      try {
        const owner: string = await readContract.ownerOf(tokenId)
        if (owner.toLowerCase() !== address.toLowerCase()) return null
        const info = normalizeVehiculoInfo(await readContract.getVehiculoInfo(tokenId))
        return { tokenId, info }
      } catch {
        return null
      }
    }),
  )
  return results.filter((r): r is { tokenId: bigint; info: VehiculoInfo } => r !== null)
}

export async function getMisVehiculosSafe(address: string) {
  try {
    const vehiculos = await getMisVehiculos(address)
    return { vehiculos, error: '' }
  } catch (error) {
    return { vehiculos: [], error: describeFleetReadError(error) }
  }
}

export async function getTransferenciasVehiculo(tokenId: bigint): Promise<TransferenciaVehiculo[]> {
  const events = await queryTransferEventsForToken(CONTRACT_ADDRESS, tokenId)
  return events
    .map((event) => {
      const parsed = event as unknown as {
        args: { from: string; to: string; tokenId: bigint }
        blockNumber: number
        transactionHash: string
      }
      return {
        from: parsed.args.from,
        to: parsed.args.to,
        tokenId: parsed.args.tokenId,
        blockNumber: parsed.blockNumber,
        txHash: parsed.transactionHash,
      }
    })
    .sort((a, b) => b.blockNumber - a.blockNumber)
}

export type CarPassLastOp = {
  kind: ChainActivityKind | null
  txHash: string | null
  blockNumber: number | null
  failed: boolean
}

type RunMeta = {
  kind: ChainActivityKind
  method?: string
  title?: string
  detail?: string
  counterparty?: string
  vin?: string
}

type RunActionResult = {
  summary: string
  txHash?: string
  blockNumber?: number
}

async function getConnectedAddress(): Promise<string> {
  const ready = await ensureSepoliaWalletReady()
  return ready.address
}

export function useCarPass() {
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [lastOp, setLastOp] = useState<CarPassLastOp>({
    kind: null,
    txHash: null,
    blockNumber: null,
    failed: false,
  })

  async function run(label: string, meta: RunMeta, action: () => Promise<RunActionResult>) {
    let activityId = ''
    try {
      setBusy(label)
      setMessage(`${label}...`)
      setLastOp({ kind: meta.kind, txHash: null, blockNumber: null, failed: false })

      const walletAddress = await getConnectedAddress()
      activityId = recordChainActivity({
        walletAddress,
        kind: meta.kind,
        status: 'pending',
        title: meta.title ?? label,
        detail: meta.detail,
        method: meta.method,
        counterparty: meta.counterparty ?? CONTRACT_ADDRESS,
        vin: meta.vin,
      })

      const result = await action()

      updateChainActivity(activityId, {
        status: 'confirmed',
        txHash: result.txHash,
        blockNumber: result.blockNumber,
      })
      setLastOp({
        kind: meta.kind,
        txHash: result.txHash ?? null,
        blockNumber: result.blockNumber ?? null,
        failed: false,
      })
      setMessage(result.summary)
      return true
    } catch (error) {
      const errMsg = parseContractError(error)
      if (activityId) {
        updateChainActivity(activityId, { status: 'failed', detail: errMsg })
      } else {
        try {
          const walletAddress = await getConnectedAddress()
          recordChainActivity({
            walletAddress,
            kind: 'tx_failed',
            status: 'failed',
            title: meta.title ?? label,
            detail: errMsg,
            method: meta.method,
          })
        } catch {
          // wallet no disponible
        }
      }
      setLastOp({ kind: meta.kind, txHash: null, blockNumber: null, failed: true })
      setMessage(errMsg)
      return false
    } finally {
      setBusy('')
    }
  }

  async function registrarVehiculo(info: VehiculoInfo, propietario: string) {
    const ok = await run(
      'Registrando vehiculo',
      {
        kind: 'mint_vehicle',
        method: 'registrarVehiculo',
        title: 'Alta de vehículo (NFT)',
        detail: `VIN ${info.vin}`,
        vin: normalizeVin(info.vin),
        counterparty: CONTRACT_ADDRESS,
      },
      async () => {
        const c = await getSignerContract()
        const payload = { ...info, vin: normalizeVin(info.vin) }
        const tx = await c.registrarVehiculo(payload, propietario)
        const receipt = await tx.wait()
        return {
          summary: 'Vehiculo registrado correctamente',
          txHash: receipt?.hash ?? tx.hash,
          blockNumber: receipt?.blockNumber,
        }
      },
    )
    if (ok) notifyVehicleChainUpdate(normalizeVin(info.vin), 'mint')
    return ok
  }

  async function agregarService(
    tokenId: bigint,
    km: number,
    tipo: string,
    descripcion: string,
  ) {
    const ok = await run(
      'Cargando service',
      {
        kind: 'service',
        method: 'agregarService',
        title: 'Service registrado',
        detail: `${km.toLocaleString('es-AR')} km · ${tipo}`,
      },
      async () => {
        const c = await getSignerContract()
        const tx = await c.agregarService(tokenId, {
          timestamp: 0,
          tipoServicio: tipo,
          kilometraje: km,
          taller: '0x0000000000000000000000000000000000000000',
          descripcion,
        })
        const receipt = await tx.wait()
        return {
          summary: 'Service registrado en la blockchain',
          txHash: receipt?.hash ?? tx.hash,
          blockNumber: receipt?.blockNumber,
        }
      },
    )
    if (ok) void emitVehicleChainUpdateFromToken(tokenId, 'service')
    return ok
  }

  async function agregarSiniestro(
    tokenId: bigint,
    gravedad: number,
    descripcion: string,
    reparado: boolean,
    costo: number,
  ) {
    const ok = await run(
      'Registrando siniestro',
      {
        kind: 'siniestro',
        method: 'agregarSiniestro',
        title: 'Siniestro registrado',
        detail: descripcion.slice(0, 80) || undefined,
      },
      async () => {
        const c = await getSignerContract()
        const tx = await c.agregarSiniestro(tokenId, {
          timestamp: 0,
          gravedad,
          descripcion,
          reparado,
          costoEstimado: costo,
          declarante: '0x0000000000000000000000000000000000000000',
        })
        const receipt = await tx.wait()
        return {
          summary: 'Siniestro registrado en la blockchain',
          txHash: receipt?.hash ?? tx.hash,
          blockNumber: receipt?.blockNumber,
        }
      },
    )
    if (ok) void emitVehicleChainUpdateFromToken(tokenId, 'siniestro')
    return ok
  }

  async function agregarVTV(
    tokenId: bigint,
    resultado: number,
    vencimientoTs: number,
  ) {
    const ok = await run(
      'Registrando VTV',
      {
        kind: 'vtv',
        method: 'agregarVTV',
        title: 'VTV registrada',
      },
      async () => {
        const c = await getSignerContract()
        const tx = await c.agregarVTV(tokenId, {
          timestamp: 0,
          resultado,
          vencimiento: vencimientoTs,
          planta: '0x0000000000000000000000000000000000000000',
        })
        const receipt = await tx.wait()
        return {
          summary: 'VTV registrada en la blockchain',
          txHash: receipt?.hash ?? tx.hash,
          blockNumber: receipt?.blockNumber,
        }
      },
    )
    if (ok) void emitVehicleChainUpdateFromToken(tokenId, 'vtv')
    return ok
  }

  async function grantRole(roleName: string, account: string) {
    return run(
      'Asignando rol',
      {
        kind: 'grant_role',
        method: 'grantRole',
        title: 'Rol asignado',
        detail: roleName,
        counterparty: account,
      },
      async () => {
        const c = await getSignerContract()
        const role = await (c as Contract)[roleName]()
        const tx = await c.grantRole(role, account)
        const receipt = await tx.wait()
        return {
          summary: `Rol asignado a ${account.slice(0, 8)}...`,
          txHash: receipt?.hash ?? tx.hash,
          blockNumber: receipt?.blockNumber,
        }
      },
    )
  }

  async function revokeRole(roleName: string, account: string) {
    return run(
      'Revocando rol',
      {
        kind: 'revoke_role',
        method: 'revokeRole',
        title: 'Rol revocado',
        detail: roleName,
        counterparty: account,
      },
      async () => {
        const c = await getSignerContract()
        const role = await (c as Contract)[roleName]()
        const tx = await c.revokeRole(role, account)
        const receipt = await tx.wait()
        return {
          summary: `Rol revocado de ${account.slice(0, 8)}...`,
          txHash: receipt?.hash ?? tx.hash,
          blockNumber: receipt?.blockNumber,
        }
      },
    )
  }

  async function transferirVehiculo(_from: string, to: string, tokenId: bigint, vin?: string) {
    const destinatario = normalizeWalletAddress(to)
    if (!destinatario) {
      setMessage('Direccion de destino invalida')
      return false
    }

    const ok = await run(
      'Transfiriendo vehiculo',
      {
        kind: 'transfer_nft',
        method: 'transferFrom',
        title: 'Transferencia de NFT',
        detail: vin ? `VIN ${normalizeVin(vin)}` : `Token #${String(tokenId)}`,
        counterparty: destinatario,
        vin: vin ? normalizeVin(vin) : undefined,
      },
      async () => {
        const signerAddress = await getConnectedAddress()
        if (_from.toLowerCase() !== signerAddress.toLowerCase()) {
          throw new Error('La cuenta activa de MetaMask no coincide con el propietario del vehiculo.')
        }
        const c = await getSignerContract()
        const tx = await c.transferFrom(signerAddress, destinatario, tokenId)
        const receipt = await tx.wait()
        return {
          summary: `Vehiculo transferido a ${destinatario.slice(0, 8)}...`,
          txHash: receipt?.hash ?? tx.hash,
          blockNumber: receipt?.blockNumber,
        }
      },
    )
    if (ok) {
      const resolvedVin = vin ? normalizeVin(vin) : await resolveVinByTokenId(tokenId)
      if (resolvedVin && isValidVin(resolvedVin)) {
        notifyVehicleChainUpdate(resolvedVin, 'transfer')
      }
      requestFleetSync()
    }
    return ok
  }

  return {
    busy,
    message,
    lastOp,
    registrarVehiculo,
    agregarService,
    agregarSiniestro,
    agregarVTV,
    grantRole,
    revokeRole,
    getVehiculoPorVin,
    getHistorial,
    getUltimoKm,
    getPropietario,
    getTransferenciasVehiculo,
    transferirVehiculo,
    getMisVehiculos,
    getMisVehiculosSafe,
  }
}
