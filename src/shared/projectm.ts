export interface ProjectMRuntimeDetection {
  available: boolean
  libraryPath: string | null
  version: string | null
  searchPaths: string[]
  source: 'configured' | 'auto' | 'none'
  message: string
  downloadUrl: string
}

export interface ProjectMPresetOption {
  path: string
  label: string
}

export interface ProjectMPresetCatalog {
  presets: ProjectMPresetOption[]
  roots: string[]
  message: string
  textureDirectories?: string[]
  scanTimedOut?: boolean
}

export function getProjectMRuntimeDownloadUrl() {
  return 'https://github.com/projectM-visualizer/projectm/releases/latest'
}

export interface ProjectMInstallResult {
  ok: boolean
  message: string
  runtimePath: string | null
  bridgePath: string | null
  downloadUrl: string
}

export function initProjectMRuntimeDetection(): ProjectMRuntimeDetection {
  return {
    available: false,
    libraryPath: null,
    version: null,
    searchPaths: [],
    source: 'none',
    message: 'projectM runtime library not found',
    downloadUrl: getProjectMRuntimeDownloadUrl(),
  }
}
