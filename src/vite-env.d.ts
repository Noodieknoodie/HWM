/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TEAMS_DAB_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}