import type { OperativeRole } from './roles'
import { ROLE_CAPABILITIES, ROLE_DESCRIPTIONS, ROLE_LABELS } from './roles'

export type AdminPath = 'manage' | 'operate'

export type AdminManageSectionKey = 'hub' | 'vehiculos' | 'roles'

export type AdminOperativeSectionKey =
  | 'inicio'
  | 'propietario'
  | 'registrador'
  | 'taller'
  | 'aseguradora'
  | 'inspector'

export type AdminSectionKey = AdminManageSectionKey | AdminOperativeSectionKey

export type AdminSectionGroup = 'core' | 'operative' | 'owner'

export type AdminSection = {
  key: AdminSectionKey
  label: string
  shortLabel: string
  description: string
  group: AdminSectionGroup
  path: AdminPath
  roleClass?: OperativeRole
  accentClass?: string
  capabilities?: string[]
}

export const ADMIN_PATH_LABELS: Record<
  AdminPath,
  { label: string; tabSubtitle: string; navEyebrow: string }
> = {
  manage: {
    label: 'Administración',
    tabSubtitle: 'Vehículos y roles',
    navEyebrow: 'Gestión del contrato',
  },
  operate: {
    label: 'Garaje y roles',
    tabSubtitle: 'Transferir · simular roles',
    navEyebrow: 'Propietario y ecosistema',
  },
}

export const ADMIN_PATH_STORAGE_KEY = 'carpass_admin_path'
export const ADMIN_MANAGE_SECTION_STORAGE_KEY = 'carpass_admin_manage_section'
export const ADMIN_OPERATIVE_SECTION_STORAGE_KEY = 'carpass_admin_operative_section'
/** @deprecated Migración desde layout anterior */
export const ADMIN_SECTION_STORAGE_KEY = 'carpass_admin_section'

export const ADMIN_MANAGE_SECTIONS: AdminSection[] = [
  {
    key: 'hub',
    label: 'Inicio',
    shortLabel: 'Inicio',
    description: 'Resumen de administración, red y accesos de gestión.',
    group: 'core',
    path: 'manage',
  },
  {
    key: 'vehiculos',
    label: 'Alta de vehículos',
    shortLabel: 'Vehículos',
    description: 'Emití pasaportes digitales vinculados al VIN con 0 km iniciales.',
    group: 'core',
    path: 'manage',
    capabilities: ['VIN único', 'Propietario inicial', 'Sepolia testnet'],
  },
  {
    key: 'roles',
    label: 'Roles y permisos',
    shortLabel: 'Roles',
    description: 'Asigná o revocá permisos operativos a wallets del ecosistema.',
    group: 'core',
    path: 'manage',
    capabilities: ['Concesionaria', 'Taller', 'Aseguradora', 'Inspector VTV'],
  },
]

export const ADMIN_OPERATIVE_SECTIONS: AdminSection[] = [
  {
    key: 'inicio',
    label: 'Inicio',
    shortLabel: 'Inicio',
    description: 'Accedé a tu garaje NFT o simulá los flujos operativos del ecosistema.',
    group: 'operative',
    path: 'operate',
  },
  {
    key: 'propietario',
    label: 'Mis vehículos',
    shortLabel: 'Garaje',
    description: 'Flota NFT en tu wallet: consultá el pasaporte público o transferí dominio on-chain.',
    group: 'owner',
    path: 'operate',
    accentClass: 'none',
    capabilities: ['Flota on-chain', 'Ver pasaporte', 'Transferir dominio'],
  },
  {
    key: 'registrador',
    label: ROLE_LABELS.registrador,
    shortLabel: 'Concesionaria',
    description: ROLE_DESCRIPTIONS.registrador,
    group: 'operative',
    path: 'operate',
    roleClass: 'registrador',
    capabilities: ROLE_CAPABILITIES.registrador,
  },
  {
    key: 'taller',
    label: ROLE_LABELS.mecanico,
    shortLabel: 'Taller',
    description: ROLE_DESCRIPTIONS.mecanico,
    group: 'operative',
    path: 'operate',
    roleClass: 'mecanico',
    capabilities: ROLE_CAPABILITIES.mecanico,
  },
  {
    key: 'aseguradora',
    label: ROLE_LABELS.aseguradora,
    shortLabel: 'Aseguradora',
    description: ROLE_DESCRIPTIONS.aseguradora,
    group: 'operative',
    path: 'operate',
    roleClass: 'aseguradora',
    capabilities: ROLE_CAPABILITIES.aseguradora,
  },
  {
    key: 'inspector',
    label: ROLE_LABELS.inspector,
    shortLabel: 'Inspector VTV',
    description: ROLE_DESCRIPTIONS.inspector,
    group: 'operative',
    path: 'operate',
    roleClass: 'inspector',
    capabilities: ROLE_CAPABILITIES.inspector,
  },
]

export const ADMIN_SECTIONS: AdminSection[] = [...ADMIN_MANAGE_SECTIONS, ...ADMIN_OPERATIVE_SECTIONS]

const LEGACY_OPERATIVE_KEYS = new Set<AdminOperativeSectionKey>([
  'propietario',
  'registrador',
  'taller',
  'aseguradora',
  'inspector',
])

function isManageSectionKey(key: string): key is AdminManageSectionKey {
  return key === 'hub' || key === 'vehiculos' || key === 'roles'
}

function isOperativeSectionKey(key: string): key is AdminOperativeSectionKey {
  return ADMIN_OPERATIVE_SECTIONS.some((section) => section.key === key)
}

export function readAdminPath(): AdminPath {
  try {
    const stored = localStorage.getItem(ADMIN_PATH_STORAGE_KEY)
    if (stored === 'manage' || stored === 'operate') return stored

    const legacy = localStorage.getItem(ADMIN_SECTION_STORAGE_KEY)
    if (legacy && LEGACY_OPERATIVE_KEYS.has(legacy as AdminOperativeSectionKey)) {
      return 'operate'
    }
  } catch {
    // localStorage no disponible.
  }
  return 'manage'
}

export function saveAdminPath(path: AdminPath) {
  try {
    localStorage.setItem(ADMIN_PATH_STORAGE_KEY, path)
  } catch {
    // localStorage no disponible.
  }
}

export function readAdminManageSection(): AdminManageSectionKey {
  try {
    const raw = localStorage.getItem(ADMIN_MANAGE_SECTION_STORAGE_KEY)
    if (raw && isManageSectionKey(raw)) return raw

    const legacy = localStorage.getItem(ADMIN_SECTION_STORAGE_KEY)
    if (legacy && isManageSectionKey(legacy)) return legacy
  } catch {
    // localStorage no disponible.
  }
  return 'hub'
}

export function saveAdminManageSection(key: AdminManageSectionKey) {
  try {
    localStorage.setItem(ADMIN_MANAGE_SECTION_STORAGE_KEY, key)
  } catch {
    // localStorage no disponible.
  }
}

export function readAdminOperativeSection(): AdminOperativeSectionKey {
  try {
    const raw = localStorage.getItem(ADMIN_OPERATIVE_SECTION_STORAGE_KEY)
    if (raw && isOperativeSectionKey(raw)) return raw

    const legacy = localStorage.getItem(ADMIN_SECTION_STORAGE_KEY)
    if (legacy && LEGACY_OPERATIVE_KEYS.has(legacy as AdminOperativeSectionKey)) {
      return legacy as AdminOperativeSectionKey
    }
  } catch {
    // localStorage no disponible.
  }
  return 'inicio'
}

export function saveAdminOperativeSection(key: AdminOperativeSectionKey) {
  try {
    localStorage.setItem(ADMIN_OPERATIVE_SECTION_STORAGE_KEY, key)
  } catch {
    // localStorage no disponible.
  }
}

export function getAdminSection(key: AdminSectionKey): AdminSection {
  return ADMIN_SECTIONS.find((section) => section.key === key) ?? ADMIN_MANAGE_SECTIONS[0]
}

export function operativeSectionToRole(key: AdminOperativeSectionKey): OperativeRole | null {
  const section = getAdminSection(key)
  return section.roleClass ?? null
}

export function getAdminPathLabel(path: AdminPath): string {
  return ADMIN_PATH_LABELS[path].label
}

export function isOwnerGarageSection(key: AdminSectionKey): boolean {
  return key === 'propietario'
}

export function isOperativeRoleSection(key: AdminOperativeSectionKey): boolean {
  return key !== 'inicio' && key !== 'propietario'
}

export const ADMIN_OPERATIVE_GARAGE_SECTIONS = ADMIN_OPERATIVE_SECTIONS.filter(
  (section) => section.key === 'inicio' || section.key === 'propietario',
)

export const ADMIN_OPERATIVE_ROLE_SECTIONS = ADMIN_OPERATIVE_SECTIONS.filter(
  (section) => section.key !== 'inicio' && section.key !== 'propietario',
)
