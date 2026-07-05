import { Contract, isAddress } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { CARPASS_ABI } from '../contracts/carpassAbi'
import { CARPASS_ORACLE_ABI } from '../contracts/carPassOracleAbi'
import { VEHICLEPARTS_ABI } from '../contracts/vehiclePartsAbi'
import { CONTRACT_ADDRESS as CARPASS_ADDRESS, hasContractAddress as hasCarPassAddress } from './useCarPass'
import {
  CONTRACT_ADDRESS as VEHICLEPARTS_ADDRESS,
  hasContractAddress as hasVehiclePartsAddress,
} from './useVehicleParts'
import { hasOracleAddress, resolveOracleAddress } from '../domain/carpass/oracleEvidence'
import { getPublicProvider } from '../lib/publicProvider'

export type BlockchainHealthItem = {
  key: string
  label: string
  status: 'ok' | 'warn' | 'pending'
  detail: string
  href?: string
}

type BlockchainHealthState = {
  loading: boolean
  items: BlockchainHealthItem[]
}

const EXPLORER = 'https://sepolia.etherscan.io/address/'

async function hasBytecode(address: string) {
  if (!isAddress(address)) return false
  const code = await getPublicProvider().getCode(address)
  return code !== '0x'
}

export function useBlockchainHealth() {
  const oracleAddress = useMemo(() => resolveOracleAddress(), [])
  const oracleConfigured = hasOracleAddress(oracleAddress)
  const [state, setState] = useState<BlockchainHealthState>({
    loading: true,
    items: [],
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const items: BlockchainHealthItem[] = []

      const carPassBytecode = hasCarPassAddress ? await hasBytecode(CARPASS_ADDRESS).catch(() => false) : false
      items.push({
        key: 'carpass',
        label: 'CarPass NFT',
        status: hasCarPassAddress && carPassBytecode ? 'ok' : 'warn',
        detail: hasCarPassAddress
          ? carPassBytecode ? 'Contrato principal desplegado en Sepolia' : 'Address configurada sin bytecode'
          : 'Address no configurada',
        href: hasCarPassAddress ? `${EXPLORER}${CARPASS_ADDRESS}` : undefined,
      })

      const vehiclePartsBytecode = hasVehiclePartsAddress
        ? await hasBytecode(VEHICLEPARTS_ADDRESS).catch(() => false)
        : false
      let vehiclePartsLinked = false
      if (vehiclePartsBytecode && hasCarPassAddress) {
        try {
          const parts = new Contract(VEHICLEPARTS_ADDRESS, VEHICLEPARTS_ABI, getPublicProvider())
          const linked = String(await parts.carPass())
          vehiclePartsLinked = linked.toLowerCase() === CARPASS_ADDRESS.toLowerCase()
        } catch {
          vehiclePartsLinked = false
        }
      }
      items.push({
        key: 'vehicleparts',
        label: 'VehicleParts',
        status: vehiclePartsBytecode && vehiclePartsLinked ? 'ok' : 'warn',
        detail: vehiclePartsBytecode
          ? vehiclePartsLinked ? 'Autopartes enlazadas a CarPass' : 'Contrato vivo pero link CarPass no coincide'
          : 'Pendiente deploy/configuracion de autopartes',
        href: hasVehiclePartsAddress ? `${EXPLORER}${VEHICLEPARTS_ADDRESS}` : undefined,
      })

      const oracleBytecode = oracleConfigured ? await hasBytecode(oracleAddress).catch(() => false) : false
      let oracleLinked = false
      if (oracleBytecode && hasCarPassAddress) {
        try {
          const oracle = new Contract(oracleAddress, CARPASS_ORACLE_ABI, getPublicProvider())
          const linked = String(await oracle.carPass())
          oracleLinked = linked.toLowerCase() === CARPASS_ADDRESS.toLowerCase()
        } catch {
          oracleLinked = false
        }
      }
      items.push({
        key: 'oracle',
        label: 'CarPassOracle',
        status: oracleBytecode && oracleLinked ? 'ok' : 'pending',
        detail: oracleConfigured
          ? oracleBytecode
            ? oracleLinked ? 'Oracle desplegado y enlazado a CarPass' : 'Oracle vivo pero link CarPass no coincide'
            : 'Address oracle configurada sin bytecode'
          : 'Listo localmente, pendiente deploy Sepolia',
        href: oracleConfigured ? `${EXPLORER}${oracleAddress}` : undefined,
      })

      const abiReady = Boolean(CARPASS_ABI.length && VEHICLEPARTS_ABI.length && CARPASS_ORACLE_ABI.length)
      items.push({
        key: 'abi',
        label: 'ABI exportada',
        status: abiReady ? 'ok' : 'warn',
        detail: abiReady ? 'Frontend tiene ABIs de CarPass, VehicleParts y Oracle' : 'Falta exportar alguna ABI',
      })

      if (!cancelled) {
        setState({ loading: false, items })
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [oracleAddress, oracleConfigured])

  return state
}
