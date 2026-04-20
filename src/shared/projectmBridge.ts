import { ProjectMRuntimeDetection } from './projectm'

export type ProjectMBridgeMode = 'native' | 'fallback'
export type ProjectMBridgeTransport = 'fbo-texture' | 'bgra-buffer'

export interface ProjectMBridgeStatus {
  bridgeLoaded: boolean
  bridgePath: string | null
  runtime: ProjectMRuntimeDetection
  supportedTransports: ProjectMBridgeTransport[]
  message: string
}

export interface ProjectMBridgeSessionInitRequest {
  sessionId: string
  width: number
  height: number
  fps: number
  transport: ProjectMBridgeTransport
  presetPath?: string
  texturePath?: string
}

export interface ProjectMBridgeSessionInitResult {
  ok: boolean
  sessionId: string
  mode: ProjectMBridgeMode
  transport: ProjectMBridgeTransport
  message: string
}

export interface ProjectMBridgeAudioChunk {
  sessionId: string
  channels: 1 | 2
  samples: number[]
}

export interface ProjectMBridgeRenderRequest {
  sessionId: string
  frameTimeMs: number
}

export interface ProjectMBridgeRenderResult {
  ok: boolean
  sessionId: string
  mode: ProjectMBridgeMode
  transport: ProjectMBridgeTransport
  width: number
  height: number
  pixelFormat: 'bgra8'
  bufferBinary: Uint8Array | null
  bufferBase64: string | null
  message: string
}
