import { BrowserProvider, Contract, ZeroAddress, isAddress, keccak256, solidityPacked } from 'ethers'
import { CARPASS_ABI } from '../contracts/carpassAbi'
import { CARPASS_DEPLOYMENT } from '../contracts/carpassDeployment'
import { VEHICLEPARTS_ABI } from '../contracts/vehiclePartsAbi'
import { VEHICLEPARTS_DEPLOYMENT } from '../contracts/vehiclePartsDeployment'
import { TOTAL_TIPOS_PARTE, TIPOS_PARTE, normalizePartes } from '../domain/carpass/vehicleParts'
import { parseVehiclePartsError, isGenericVehiclePartsRejection } from '../domain/carpass/errors'
import { vehicleExistsAtToken } from './vehicleLookup'
import { getPublicProvider } from './publicProvider'
import { getActiveEthereum, type EthereumProvider } from './ethereumProvider'
import { ensureSepoliaWalletReady } from './sepoliaGate'

function resolveCarPassAddress() {
  const envAddress = import.meta.env.VITE_CARPASS_CONTRACT_ADDRESS
  if (envAddress && envAddress !== ZeroAddress) return envAddress
  return CARPASS_DEPLOYMENT.address
}

function resolveVehiclePartsAddress() {
  const envAddress = import.meta.env.VITE_VEHICLEPARTS_CONTRACT_ADDRESS
  if (envAddress && envAddress !== ZeroAddress) return envAddress
  return VEHICLEPARTS_DEPLOYMENT.address
}

const CARPASS_ADDRESS = resolveCarPassAddress()
const VEHICLEPARTS_ADDRESS = resolveVehiclePartsAddress()

export type NumerosGrabadoTuple = [string, string, string, string, string, string]

export function toNumerosGrabadoTuple(numeros: string[]): NumerosGrabadoTuple {
  if (numeros.length !== TOTAL_TIPOS_PARTE) {
    throw new Error(`Se requieren exactamente ${TOTAL_TIPOS_PARTE} números de grabado`)
  }
  for (let i = 0; i < TOTAL_TIPOS_PARTE; i++) {
    if (!numeros[i]?.trim()) {
      throw new Error(`El número de grabado de ${TIPOS_PARTE[i]?.label ?? `parte ${i}`} no puede estar vacío`)
    }
  }
  return numeros as NumerosGrabadoTuple
}

function partTokenId(vehicleTokenId: bigint, tipo: number, numeroGrabado: string): bigint {
  return BigInt(
    keccak256(
      solidityPacked(['uint256', 'uint8', 'string'], [vehicleTokenId, tipo, numeroGrabado]),
    ),
  )
}

function getVehiclePartsReadContract() {
  if (!isAddress(VEHICLEPARTS_ADDRESS)) throw new Error('Contrato de autopartes no configurado')
  return new Contract(VEHICLEPARTS_ADDRESS, VEHICLEPARTS_ABI, getPublicProvider())
}

async function partTokenExists(partsRead: Contract, tokenId: bigint): Promise<boolean> {
  try {
    await partsRead.ownerOf(tokenId)
    return true
  } catch {
    return false
  }
}

/** Diagnóstico cuando el RPC no devuelve el motivo del revert. */
export async function diagnoseRegistrarPartesFailure(
  vehicleTokenId: bigint,
  numerosGrabado: string[],
  caller: string,
): Promise<string> {
  const partsRead = getVehiclePartsReadContract()
  const carPass = new Contract(CARPASS_ADDRESS, CARPASS_ABI, getPublicProvider())
  const provider = getPublicProvider()

  const exists = await vehicleExistsAtToken(carPass, vehicleTokenId)
  if (!exists) {
    return 'El vehículo no está minteado en CarPass. Verificá que el VIN exista (buscá de nuevo o registrá el pasaporte primero).'
  }

  const historiales = await Promise.all(
    Array.from({ length: TOTAL_TIPOS_PARTE }, (_, tipo) =>
      partsRead.getHistorialParte(vehicleTokenId, tipo).then((rows: unknown[]) => rows.length),
    ),
  )
  if (historiales.some(len => len > 0)) {
    return 'Este vehículo ya tiene autopartes registradas. Tocá Buscar otra vez para refrescar el estado.'
  }

  const rawPartes = (await partsRead.getPartesVehiculo(vehicleTokenId)) as unknown[]
  const partes = normalizePartes(rawPartes)
  if (partes.some(parte => parte.numeroGrabado.trim().length > 0)) {
    return 'Las autopartes ya figuran on-chain pero la UI estaba desactualizada. Volvé a buscar el VIN.'
  }

  const regRole = await partsRead.REGISTRADOR_ROLE()
  const allowed = await carPass.hasRole(regRole, caller)
  if (!allowed) {
    return 'Tu wallet no tiene rol Concesionaria (REGISTRADOR_ROLE) en CarPass. Otorgalo desde Admin → Roles.'
  }

  let owner: string
  try {
    owner = String(await carPass.ownerOf(vehicleTokenId))
  } catch {
    return 'No se pudo leer el propietario del NFT del vehículo en CarPass.'
  }

  const ownerCode = await provider.getCode(owner)
  if (ownerCode !== '0x') {
    return (
      'El propietario del vehículo es un contrato inteligente que no acepta ERC-721. ' +
      'Las autopartes se mintean al owner via _safeMint. Transferí el pasaporte a una wallet EOA (MetaMask) e intentá de nuevo.'
    )
  }

  for (let tipo = 0; tipo < TOTAL_TIPOS_PARTE; tipo++) {
    const tokenId = partTokenId(vehicleTokenId, tipo, numerosGrabado[tipo] ?? '')
    if (await partTokenExists(partsRead, tokenId)) {
      return (
        `El grabado ${numerosGrabado[tipo]} (${TIPOS_PARTE[tipo]?.label ?? `parte ${tipo}`}) ya existe como NFT. ` +
        'Se generarán números nuevos automáticamente al reintentar.'
      )
    }
  }

  return (
    'El contrato rechazó registrar autopartes sin detalle del nodo Sepolia. ' +
    'Confirmá rol Concesionaria, que el propietario sea una wallet EOA y que el VIN no tenga partes previas.'
  )
}

/** Lecturas on-chain antes de firmar — evita estimateGas sin motivo de revert. */
export async function assertCanRegistrarPartes(
  vehicleTokenId: bigint,
  numerosGrabado: string[],
): Promise<NumerosGrabadoTuple> {
  let numeros = toNumerosGrabadoTuple(numerosGrabado)
  const partsRead = getVehiclePartsReadContract()
  const carPassOnChain = String(await partsRead.carPass())
  if (carPassOnChain.toLowerCase() !== CARPASS_ADDRESS.toLowerCase()) {
    throw new Error(
      'VehicleParts y CarPass no coinciden en tu configuración. Revisá VITE_CARPASS_CONTRACT_ADDRESS y VITE_VEHICLEPARTS_CONTRACT_ADDRESS.',
    )
  }

  const carPass = new Contract(CARPASS_ADDRESS, CARPASS_ABI, getPublicProvider())
  const exists = await vehicleExistsAtToken(carPass, vehicleTokenId)
  if (!exists) {
    throw new Error('El vehículo no está registrado en CarPass (token inexistente). Verificá el VIN buscado.')
  }

  const historialMotor = (await partsRead.getHistorialParte(vehicleTokenId, 0)) as unknown[]
  if (historialMotor.length > 0) {
    throw new Error('Este vehículo ya tiene autopartes registradas. Volvé a buscar el VIN para refrescar el estado.')
  }

  const regRole = await partsRead.REGISTRADOR_ROLE()
  await ensureSepoliaWalletReady()
  const eth = getActiveEthereum()
  if (!eth) throw new Error('MetaMask no detectado')
  const signer = await new BrowserProvider(eth as EthereumProvider).getSigner()
  const caller = await signer.getAddress()
  const partsWrite = new Contract(VEHICLEPARTS_ADDRESS, VEHICLEPARTS_ABI, signer)
  const allowed = await carPass.hasRole(regRole, caller)
  if (!allowed) {
    throw new Error(
      'Tu wallet no tiene rol Concesionaria (REGISTRADOR_ROLE) en CarPass. Pedí el rol desde el panel Admin.',
    )
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await partsWrite.registrarPartes.staticCall(vehicleTokenId, numeros)
      return numeros
    } catch (error) {
      let message = parseVehiclePartsError(error)
      if (isGenericVehiclePartsRejection(message)) {
        message = await diagnoseRegistrarPartesFailure(vehicleTokenId, numeros, caller)
      }

      const collision =
        message.includes('ya existe como NFT') ||
        message.includes('ya fue registrado')
      if (collision && attempt === 0) {
        numeros = toNumerosGrabadoTuple(
          numeros.map((numero, tipo) => `${numero}-R${Date.now().toString(36).slice(-4)}-${tipo}`),
        )
        continue
      }

      throw new Error(message)
    }
  }

  throw new Error('No se pudo validar el registro de autopartes')
}

export async function explainRegistrarPartesFailure(
  vehicleTokenId: bigint,
  numerosGrabado: string[],
  error: unknown,
): Promise<string> {
  if (error instanceof Error && error.message.trim() && !isGenericVehiclePartsRejection(error.message)) {
    return error.message.split('\n')[0]
  }

  let message = parseVehiclePartsError(error)
  if (!isGenericVehiclePartsRejection(message)) return message

  try {
    await ensureSepoliaWalletReady()
    const eth = getActiveEthereum()
    if (!eth) return message
    const signer = await new BrowserProvider(eth as EthereumProvider).getSigner()
    const caller = await signer.getAddress()
    return await diagnoseRegistrarPartesFailure(vehicleTokenId, numerosGrabado, caller)
  } catch {
    return await diagnoseRegistrarPartesFailure(vehicleTokenId, numerosGrabado, '')
  }
}
