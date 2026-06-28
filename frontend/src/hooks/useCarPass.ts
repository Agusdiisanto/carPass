import { BrowserProvider, Contract, Interface, isAddress } from 'ethers'
import { useState } from 'react'

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

export const CONTRACT_ADDRESS = import.meta.env.VITE_CARPASS_CONTRACT_ADDRESS ?? ''
export const hasContractAddress = isAddress(CONTRACT_ADDRESS)

export const ABI = [
  // Roles
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function REGISTRADOR_ROLE() view returns (bytes32)',
  'function MECANICO_ROLE() view returns (bytes32)',
  'function ASEGURADORA_ROLE() view returns (bytes32)',
  'function INSPECTOR_VTV_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function grantRole(bytes32 role, address account)',
  'function revokeRole(bytes32 role, address account)',
  'function estaRevocado(address wallet) view returns (bool)',
  // Vehiculo
  'function registrarVehiculo((string vin,string marca,string modelo,uint16 anio,string color) info, address propietarioInicial) returns (uint256)',
  'function vinToTokenId(string vin) view returns (uint256)',
  'function getVehiculoInfo(uint256 tokenId) view returns ((string vin,string marca,string modelo,uint16 anio,string color))',
  // Service
  'function agregarService(uint256 tokenId,(uint256 timestamp,string tipoServicio,uint32 kilometraje,address taller,string descripcion) registro)',
  'function getHistorialService(uint256 tokenId) view returns ((uint256 timestamp,string tipoServicio,uint32 kilometraje,address taller,string descripcion)[])',
  'function ultimoKilometrajeRegistrado(uint256 tokenId) view returns (uint32)',
  // Siniestro
  'function agregarSiniestro(uint256 tokenId,(uint256 timestamp,uint8 gravedad,string descripcion,bool reparado,uint256 costoEstimado,address declarante) registro)',
  'function getHistorialSiniestros(uint256 tokenId) view returns ((uint256 timestamp,uint8 gravedad,string descripcion,bool reparado,uint256 costoEstimado,address declarante)[])',
  // VTV
  'function agregarVTV(uint256 tokenId,(uint256 timestamp,uint8 resultado,uint256 vencimiento,address planta) registro)',
  'function getHistorialVTV(uint256 tokenId) view returns ((uint256 timestamp,uint8 resultado,uint256 vencimiento,address planta)[])',
  // Sello
  'function getSelloCalidad(uint256 tokenId) view returns (uint8 estado, string motivo)',
  // Errores
  'error KilometrajeNoMonotonico(uint32 recibido, uint32 ultimo)',
  'error VehiculoYaRegistrado(string vin)',
  'error VehiculoNoEncontrado(uint256 tokenId)',
]

export type Role = 'admin' | 'registrador' | 'mecanico' | 'aseguradora' | 'inspector' | 'none'

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

function parseContractError(error: unknown): string {
  const raw = error as Record<string, unknown>
  const data =
    (raw?.data as string) ??
    ((raw?.error as Record<string, unknown>)?.data as string) ??
    ((raw?.info as Record<string, unknown>)?.error as Record<string, unknown>)?.data as string

  if (data) {
    try {
      const iface = new Interface(ABI)
      const parsed = iface.parseError(data)
      if (parsed) {
        switch (parsed.name) {
          case 'VehiculoYaRegistrado':
            return `El VIN ${parsed.args[0]} ya está registrado`
          case 'VehiculoNoEncontrado':
            return 'Vehículo no encontrado en el contrato'
          case 'KilometrajeNoMonotonico':
            return `Kilometraje inválido: ${Number(parsed.args[0]).toLocaleString('es-AR')} km debe superar ${Number(parsed.args[1]).toLocaleString('es-AR')} km`
          case 'VinInvalido':
            return 'VIN inválido: debe tener exactamente 17 caracteres'
          case 'TransferenciaSoloPropietario':
            return 'Solo el propietario puede transferir este vehículo'
          case 'AccessControlUnauthorizedAccount':
            return 'Tu wallet no tiene permisos para esta operación'
          default:
            return `Error del contrato: ${parsed.name}`
        }
      }
    } catch {
      // no se pudo parsear, continúa al fallback
    }
  }

  if (error instanceof Error) {
    const msg = error.message.split('\n')[0]
    if (msg.includes('user rejected')) return 'Transacción cancelada por el usuario'
    if (msg.includes('insufficient funds')) return 'Fondos insuficientes para pagar el gas'
    return msg.slice(0, 120)
  }

  return 'Transacción rechazada'
}

function getProvider() {
  if (!window.ethereum) throw new Error('MetaMask no detectado')
  return new BrowserProvider(window.ethereum as EthereumProvider)
}

async function getSignerContract() {
  if (!hasContractAddress) throw new Error('Contrato no configurado')
  const signer = await getProvider().getSigner()
  return new Contract(CONTRACT_ADDRESS, ABI, signer)
}

async function getReadContract() {
  if (!hasContractAddress) throw new Error('Contrato no configurado')
  return new Contract(CONTRACT_ADDRESS, ABI, getProvider())
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
  }
}
