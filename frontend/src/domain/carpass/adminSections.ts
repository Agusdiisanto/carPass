import type { OperativeRole } from './roles'
import { ROLE_CAPABILITIES, ROLE_DESCRIPTIONS, ROLE_LABELS } from './roles'

export type AdminSectionKey =
  | 'hub'
  | 'vehiculos'
  | 'roles'
  | 'propietario'
  | 'registrador'
  | 'taller'
  | 'aseguradora'
  | 'inspector'

export type AdminSectionGroup = 'core' | 'operative'

export type AdminSection = {
  key: AdminSectionKey
  label: string
  shortLabel: string
  description: string
  group: AdminSectionGroup
  roleClass?: OperativeRole
  accentClass?: string
  capabilities?: string[]
}

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    key: 'hub',
    label: 'Inicio',
    shortLabel: 'Inicio',
    description: 'Resumen del panel y acceso rápido a cada área.',
    group: 'core',
  },
  {
    key: 'vehiculos',
    label: 'Alta de vehículos',
    shortLabel: 'Vehículos',
    description: 'Emití pasaportes digitales vinculados al VIN con 0 km iniciales.',
    group: 'core',
    capabilities: ['VIN único', 'Propietario inicial', 'Sepolia testnet'],
  },
  {
    key: 'roles',
    label: 'Roles y permisos',
    shortLabel: 'Roles',
    description: 'Asigná o revocá permisos operativos a wallets del ecosistema.',
    group: 'core',
    capabilities: ['Concesionaria', 'Taller', 'Aseguradora', 'Inspector VTV'],
  },
  {
    key: 'propietario',
    label: 'Cambio de dominio',
    shortLabel: 'Dominio',
    description: 'Listado on-chain, busqueda por VIN/QR y transferencia de dominio CarPass para wallets propietarias.',
    group: 'operative',
    accentClass: 'none',
    capabilities: ['Listado automatico', 'VIN/QR', 'Transferencia NFT'],
  },
  {
    key: 'registrador',
    label: ROLE_LABELS.registrador,
    shortLabel: 'Concesionaria',
    description: ROLE_DESCRIPTIONS.registrador,
    group: 'operative',
    roleClass: 'registrador',
    capabilities: ROLE_CAPABILITIES.registrador,
  },
  {
    key: 'taller',
    label: ROLE_LABELS.mecanico,
    shortLabel: 'Taller',
    description: ROLE_DESCRIPTIONS.mecanico,
    group: 'operative',
    roleClass: 'mecanico',
    capabilities: ROLE_CAPABILITIES.mecanico,
  },
  {
    key: 'aseguradora',
    label: ROLE_LABELS.aseguradora,
    shortLabel: 'Aseguradora',
    description: ROLE_DESCRIPTIONS.aseguradora,
    group: 'operative',
    roleClass: 'aseguradora',
    capabilities: ROLE_CAPABILITIES.aseguradora,
  },
  {
    key: 'inspector',
    label: ROLE_LABELS.inspector,
    shortLabel: 'Inspector VTV',
    description: ROLE_DESCRIPTIONS.inspector,
    group: 'operative',
    roleClass: 'inspector',
    capabilities: ROLE_CAPABILITIES.inspector,
  },
]

export const ADMIN_SECTION_STORAGE_KEY = 'carpass_admin_section'

export function readAdminSection(): AdminSectionKey {
  try {
    const raw = localStorage.getItem(ADMIN_SECTION_STORAGE_KEY)
    if (raw && ADMIN_SECTIONS.some((section) => section.key === raw)) {
      return raw as AdminSectionKey
    }
  } catch {
    // localStorage no disponible.
  }
  return 'hub'
}

export function saveAdminSection(key: AdminSectionKey) {
  try {
    localStorage.setItem(ADMIN_SECTION_STORAGE_KEY, key)
  } catch {
    // localStorage no disponible.
  }
}

export function getAdminSection(key: AdminSectionKey): AdminSection {
  return ADMIN_SECTIONS.find((section) => section.key === key) ?? ADMIN_SECTIONS[0]
}
