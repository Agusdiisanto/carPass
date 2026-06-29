export type Role = 'admin' | 'registrador' | 'mecanico' | 'aseguradora' | 'inspector' | 'none'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  registrador: 'Concesionaria',
  mecanico: 'Taller',
  aseguradora: 'Aseguradora',
  inspector: 'Inspector VTV',
  none: 'Sin rol',
}

export const ROLE_BADGE_CLASS: Record<Role, string> = {
  admin: 'admin',
  registrador: 'registrador',
  mecanico: 'taller',
  aseguradora: 'aseguradora',
  inspector: 'inspector',
  none: 'none',
}
