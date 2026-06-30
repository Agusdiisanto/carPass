/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_APP_URL?: string
  readonly VITE_DEV_LAN_HOST?: string
}

interface Window {
  readonly ethereum?: unknown
}
