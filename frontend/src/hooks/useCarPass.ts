import { BrowserProvider, Contract, ZeroAddress, isAddress } from 'ethers'
import { useState } from 'react'
import { CARPASS_ABI } from '../contracts/carpassAbi'
import { CARPASS_DEPLOYMENT } from '../contracts/carpassDeployment'
import { parseContractError } from '../domain/carpass/errors'
import type { Role } from '../domain/carpass/roles'
import { getPublicProvider } from '../lib/publicProvider'

import { getActiveEthereum, type EthereumProvider } from '../lib/ethereumProvider'

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
  gravedad: number
  descripcion: string
  reparado: boolean
  costoEstimado: bigint
  declarante: string
}

export type RegistroVTV = {
  timestamp: bigint
  resultado: number
  vencimiento: bigint
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

export function useCarPass() {
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  async function run(label: string, action: () => Promise<string>) {
    try {
      setBusy(label)
      setMessage(`${label}...`)
      const result = await action()
      setMessage(result)
      return true
    } catch (error) {
      setMessage(parseContractError(error))
      return false
    } finally {
      setBusy('')
    }
  }

  async function registrarVehiculo(info: VehiculoInfo, propietario: string) {
    return run('Registrando vehiculo', async () => {
      const c = await getSignerContract()
      const tx = await c.registrarVehiculo(info, propietario)
      await tx.wait()
      return 'Vehiculo registrado correctamente'
    })
  }

  async function agregarService(
    tokenId: bigint,
    km: number,
    tipo: string,
    descripcion: string,
  ) {
    return run('Cargando service', async () => {
      const c = await getSignerContract()
      const tx = await c.agregarService(tokenId, {
        timestamp: 0,
        tipoServicio: tipo,
        kilometraje: km,
        taller: '0x0000000000000000000000000000000000000000',
        descripcion,
      })
      await tx.wait()
      return 'Service registrado en la blockchain'
    })
  }

  async function agregarSiniestro(
    tokenId: bigint,
    gravedad: number,
    descripcion: string,
    reparado: boolean,
    costo: number,
  ) {
    return run('Registrando siniestro', async () => {
      const c = await getSignerContract()
      const tx = await c.agregarSiniestro(tokenId, {
        timestamp: 0,
        gravedad,
        descripcion,
        reparado,
        costoEstimado: costo,
        declarante: '0x0000000000000000000000000000000000000000',
      })
      await tx.wait()
      return 'Siniestro registrado en la blockchain'
    })
  }

  async function agregarVTV(
    tokenId: bigint,
    resultado: number,
    vencimientoTs: number,
  ) {
    return run('Registrando VTV', async () => {
      const c = await getSignerContract()
      const tx = await c.agregarVTV(tokenId, {
        timestamp: 0,
        resultado,
        vencimiento: vencimientoTs,
        planta: '0x0000000000000000000000000000000000000000',
      })
      await tx.wait()
      return 'VTV registrada en la blockchain'
    })
  }

  async function grantRole(roleName: string, account: string) {
    return run('Asignando rol', async () => {
      const c = await getSignerContract()
      const role = await (c as Contract)[roleName]()
      const tx = await c.grantRole(role, account)
      await tx.wait()
      return `Rol asignado a ${account.slice(0, 8)}...`
    })
  }

  async function revokeRole(roleName: string, account: string) {
    return run('Revocando rol', async () => {
      const c = await getSignerContract()
      const role = await (c as Contract)[roleName]()
      const tx = await c.revokeRole(role, account)
      await tx.wait()
      return `Rol revocado de ${account.slice(0, 8)}...`
    })
  }

  async function getVehiculoPorVin(vin: string) {
    const c = await getReadContract()
    const tokenId: bigint = await c.vinToTokenId(vin)
    const info: VehiculoInfo = await c.getVehiculoInfo(tokenId)
    return { tokenId, info }
  }

  async function getHistorial(tokenId: bigint) {
    const c = await getReadContract()
    const [services, siniestros, vtv, sello] = await Promise.all([
      c.getHistorialService(tokenId) as Promise<RegistroService[]>,
      c.getHistorialSiniestros(tokenId) as Promise<RegistroSiniestro[]>,
      c.getHistorialVTV(tokenId) as Promise<RegistroVTV[]>,
      c.getSelloCalidad(tokenId) as Promise<[number, string]>,
    ])
    return {
      services,
      siniestros,
      vtv,
      sello: { estado: Number(sello[0]), motivo: sello[1] } as SelloCalidad,
    }
  }

  async function getUltimoKm(tokenId: bigint): Promise<number> {
    const c = await getReadContract()
    return Number(await c.ultimoKilometrajeRegistrado(tokenId))
  }

  async function getPropietario(tokenId: bigint): Promise<string> {
    const c = await getReadContract()
    return (await c.ownerOf(tokenId)) as string
  }

  async function getMisVehiculos(address: string): Promise<Array<{ tokenId: bigint; info: VehiculoInfo }>> {
    // Use MetaMask provider — publicnode blocks historical eth_getLogs without a token.
    const provider = getProvider()
    const c = new Contract(CONTRACT_ADDRESS, ABI, provider)
    const filter = c.filters.Transfer(null, address)
    const events = await c.queryFilter(filter, CARPASS_DEPLOYMENT.deployBlock)
    const uniqueIds = [...new Set(events.map((e) => (e as unknown as { args: { tokenId: bigint } }).args.tokenId))]
    const readContract = await getReadContract()
    const results = await Promise.all(
      uniqueIds.map(async (tokenId) => {
        try {
          const owner: string = await readContract.ownerOf(tokenId)
          if (owner.toLowerCase() !== address.toLowerCase()) return null
          const info: VehiculoInfo = await readContract.getVehiculoInfo(tokenId)
          return { tokenId, info }
        } catch {
          return null
        }
      }),
    )
    return results.filter((r): r is { tokenId: bigint; info: VehiculoInfo } => r !== null)
  }

  async function getTransferenciasVehiculo(tokenId: bigint): Promise<TransferenciaVehiculo[]> {
    // Use MetaMask provider: public RPCs can reject historical eth_getLogs.
    const provider = getProvider()
    const c = new Contract(CONTRACT_ADDRESS, ABI, provider)
    const filter = c.filters.Transfer(null, null, tokenId)
    const events = await c.queryFilter(filter, CARPASS_DEPLOYMENT.deployBlock)
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

  async function transferirVehiculo(from: string, to: string, tokenId: bigint) {
    return run('Transfiriendo vehiculo', async () => {
      const c = await getSignerContract()
      const tx = await c.transferFrom(from, to, tokenId)
      await tx.wait()
      return `Vehiculo transferido a ${to.slice(0, 8)}...`
    })
  }

  return {
    busy,
    message,
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
  }
}
