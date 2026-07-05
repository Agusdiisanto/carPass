import { BrowserProvider, Contract, ZeroAddress, isAddress } from 'ethers'
import { useState } from 'react'
import { VEHICLEPARTS_ABI } from '../contracts/vehiclePartsAbi'
import { VEHICLEPARTS_DEPLOYMENT } from '../contracts/vehiclePartsDeployment'
import { parseVehiclePartsError } from '../domain/carpass/errors'
import { normalizeParte, normalizePartes, type Parte } from '../domain/carpass/vehicleParts'
import { getPublicProvider } from '../lib/publicProvider'
import { getActiveEthereum, type EthereumProvider } from '../lib/ethereumProvider'
import { ensureSepoliaWalletReady } from '../lib/sepoliaGate'
import { emitVehicleChainUpdateFromToken } from './useCarPass'
import { requestFleetSync } from '../lib/fleetSync'
import { assertCanRegistrarPartes, explainRegistrarPartesFailure } from '../lib/vehiclePartsPreflight'

function resolveContractAddress() {
  const envAddress = import.meta.env.VITE_VEHICLEPARTS_CONTRACT_ADDRESS
  if (envAddress && envAddress !== ZeroAddress) return envAddress
  return VEHICLEPARTS_DEPLOYMENT.address
}

export const ABI = VEHICLEPARTS_ABI
export const CONTRACT_ADDRESS = resolveContractAddress()
export const hasContractAddress = isAddress(CONTRACT_ADDRESS)

export type VehiclePartsLastOp = {
  txHash: string | null
  blockNumber: number | null
  failed: boolean
}

export type { Parte } from '../domain/carpass/vehicleParts'

function getProvider() {
  const eth = getActiveEthereum()
  if (!eth) throw new Error('MetaMask no detectado')
  return new BrowserProvider(eth as EthereumProvider)
}

async function getSignerContract() {
  if (!hasContractAddress) throw new Error('Contrato de autopartes no configurado')
  await ensureSepoliaWalletReady()
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
  const partes = normalizePartes(raw)

  const [h0, h1, h2, h3, h4, h5] = await Promise.all(
    [0, 1, 2, 3, 4, 5].map(tipo =>
      (c.getHistorialParte(vehicleTokenId, tipo) as Promise<unknown[]>)
        .then(r => r.length)
        .catch(() => 0),
    ),
  )
  const historialLen = [h0, h1, h2, h3, h4, h5]

  return partes.map((p, i) => ({
    ...p,
    reemplazada: historialLen[i] > 1,
  }))
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

export async function tienePartesRegistradas(vehicleTokenId: bigint): Promise<boolean> {
  const c = await getReadContract()
  const [historialMotor, rawPartes] = await Promise.all([
    c.getHistorialParte(vehicleTokenId, 0) as Promise<unknown[]>,
    c.getPartesVehiculo(vehicleTokenId) as Promise<unknown[]>,
  ])
  if (historialMotor.length > 0) return true
  return normalizePartes(rawPartes).some(parte => parte.numeroGrabado.trim().length > 0)
}

export function useVehicleParts() {
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [lastOp, setLastOp] = useState<VehiclePartsLastOp>({
    txHash: null,
    blockNumber: null,
    failed: false,
  })

  async function run(
    label: string,
    action: () => Promise<{ summary: string; txHash?: string; blockNumber?: number }>,
    onError?: (error: unknown) => Promise<string>,
  ) {
    try {
      setBusy(label)
      setMessage(`${label}...`)
      setLastOp({ txHash: null, blockNumber: null, failed: false })

      const result = await action()
      setLastOp({
        txHash: result.txHash ?? null,
        blockNumber: result.blockNumber ?? null,
        failed: false,
      })
      setMessage(result.summary)
      return true
    } catch (error) {
      setLastOp({ txHash: null, blockNumber: null, failed: true })
      const message = onError ? await onError(error) : parseVehiclePartsError(error)
      setMessage(message)
      return false
    } finally {
      setBusy('')
    }
  }

  async function registrarPartes(vehicleTokenId: bigint, numerosGrabado: string[]) {
    let numerosUsados = numerosGrabado
    return run(
      'Registrando autopartes',
      async () => {
        setMessage('Validando permisos y estado on-chain...')
        const numeros = await assertCanRegistrarPartes(vehicleTokenId, numerosGrabado)
        numerosUsados = numeros
        setMessage('Registrando autopartes... (confirmá en MetaMask)')
        const c = await getSignerContract()
        const tx = await c.registrarPartes(vehicleTokenId, numeros)
        const receipt = await tx.wait()
        void emitVehicleChainUpdateFromToken(vehicleTokenId, 'autopartes')
        requestFleetSync()
        return {
          summary: 'Autopartes registradas en la blockchain',
          txHash: receipt?.hash ?? tx.hash,
          blockNumber: receipt?.blockNumber,
        }
      },
      async (error) => explainRegistrarPartesFailure(vehicleTokenId, numerosUsados, error),
    )
  }

  async function reemplazarParte(vehicleTokenId: bigint, tipo: number, nuevoNumeroGrabado: string) {
    return run('Reemplazando autoparte', async () => {
      const c = await getSignerContract()
      const tx = await c.reemplazarParte(vehicleTokenId, tipo, nuevoNumeroGrabado)
      const receipt = await tx.wait()
      void emitVehicleChainUpdateFromToken(vehicleTokenId, 'autopartes')
      requestFleetSync()
      return {
        summary: 'Autoparte reemplazada en la blockchain',
        txHash: receipt?.hash ?? tx.hash,
        blockNumber: receipt?.blockNumber,
      }
    })
  }

  function reset() {
    setBusy('')
    setMessage('')
    setLastOp({ txHash: null, blockNumber: null, failed: false })
  }

  return {
    busy,
    message,
    lastOp,
    registrarPartes,
    reemplazarParte,
    getPartesVehiculo,
    getHistorialParte,
    getParteActual,
    reset,
  }
}
