import { BrowserProvider, Contract, ZeroAddress, isAddress } from 'ethers'
import { useState } from 'react'
import { VEHICLEPARTS_ABI } from '../contracts/vehiclePartsAbi'
import { VEHICLEPARTS_DEPLOYMENT } from '../contracts/vehiclePartsDeployment'
import { parseVehiclePartsError } from '../domain/carpass/errors'
import { normalizeParte, normalizePartes, type Parte } from '../domain/carpass/vehicleParts'
import { getPublicProvider } from '../lib/publicProvider'
import { getActiveEthereum, type EthereumProvider } from '../lib/ethereumProvider'

function resolveContractAddress() {
  const envAddress = import.meta.env.VITE_VEHICLEPARTS_CONTRACT_ADDRESS
  if (envAddress && envAddress !== ZeroAddress) return envAddress
  return VEHICLEPARTS_DEPLOYMENT.address
}

export const ABI = VEHICLEPARTS_ABI
export const CONTRACT_ADDRESS = resolveContractAddress()
export const hasContractAddress = isAddress(CONTRACT_ADDRESS)

export type { Parte } from '../domain/carpass/vehicleParts'

function getProvider() {
  const eth = getActiveEthereum()
  if (!eth) throw new Error('MetaMask no detectado')
  return new BrowserProvider(eth as EthereumProvider)
}

async function getSignerContract() {
  if (!hasContractAddress) throw new Error('Contrato de autopartes no configurado')
  const signer = await getProvider().getSigner()
  return new Contract(CONTRACT_ADDRESS, ABI, signer)
}

async function getReadContract() {
  if (!hasContractAddress) throw new Error('Contrato de autopartes no configurado')
  return new Contract(CONTRACT_ADDRESS, ABI, getPublicProvider())
}

export async function getPartesVehiculo(vehicleTokenId: bigint): Promise<Parte[]> {
  const c = await getReadContract()
  const raw = (await c.getPartesVehiculo(vehicleTokenId)) as unknown[]
  return normalizePartes(raw)
}

export async function getHistorialParte(vehicleTokenId: bigint, tipo: number): Promise<Parte[]> {
  const c = await getReadContract()
  const raw = (await c.getHistorialParte(vehicleTokenId, tipo)) as unknown[]
  return normalizePartes(raw)
}

export async function getParteActual(vehicleTokenId: bigint, tipo: number): Promise<Parte> {
  const c = await getReadContract()
  return normalizeParte(await c.getParteActual(vehicleTokenId, tipo))
}

export function useVehicleParts() {
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
      setMessage(parseVehiclePartsError(error))
      return false
    } finally {
      setBusy('')
    }
  }

  async function registrarPartes(vehicleTokenId: bigint, numerosGrabado: string[]) {
    return run('Registrando autopartes', async () => {
      const c = await getSignerContract()
      const tx = await c.registrarPartes(vehicleTokenId, numerosGrabado)
      await tx.wait()
      return 'Autopartes registradas en la blockchain'
    })
  }

  async function reemplazarParte(vehicleTokenId: bigint, tipo: number, nuevoNumeroGrabado: string) {
    return run('Reemplazando autoparte', async () => {
      const c = await getSignerContract()
      const tx = await c.reemplazarParte(vehicleTokenId, tipo, nuevoNumeroGrabado)
      await tx.wait()
      return 'Autoparte reemplazada en la blockchain'
    })
  }

  return {
    busy,
    message,
    registrarPartes,
    reemplazarParte,
    getPartesVehiculo,
    getHistorialParte,
    getParteActual,
  }
}
