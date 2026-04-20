export type VisualizerStreamProtocol = 'RTSP' | 'NDI'
export type RtspTransport = 'tcp' | 'udp'
export type VisualizerStreamStatus = 'idle' | 'starting' | 'running' | 'error'
export type VisualizerRelayMode = 'direct' | 'mjpegRelay'
export type VisualizerNdiDelivery = 'ffmpeg_muxer' | 'native_sdk' | 'none'

export interface VisualizerStreamConfig {
  protocol: VisualizerStreamProtocol
  ffmpegPath: string
  ndiRuntimePath: string
  fps: number
  bitrateKbps: number
  rtspUrl: string
  rtspTransport: RtspTransport
  ndiName: string
  ndiMuxer: string
}

export interface VisualizerStreamState {
  status: VisualizerStreamStatus
  protocol: VisualizerStreamProtocol
  message: string
}

export interface VisualizerRelayRequest {
  sourceUrl: string
  ffmpegPath: string
  rtspTransport: RtspTransport
  fps: number
}

export interface VisualizerRelayStartResult {
  mode: VisualizerRelayMode
  relayId: string | null
  url: string
  message: string
}

/** FFmpeg + NDI runtime probe for stream-out settings UI. */
export interface VisStreamHealth {
  checkedAt: string
  ffmpeg: {
    requestedPath: string
    resolvedPath: string
    exists: boolean
    version: string | null
    error: string | null
  }
  ndi: {
    requestedMuxer: string
    supportedMuxers: string[]
    ffmpegMuxerSupported: boolean
    nativeSdkSupported: boolean
    delivery: VisualizerNdiDelivery
    nativeLibraryPath: string | null
    configuredRuntimePath: string | null
    autoDetectedRuntimePaths: string[]
    runtimeSearchPaths: string[]
    runtimeLibrariesFound: string[]
    runtimeReady: boolean
    supported: boolean
    downloadUrl: string
    message: string
  }
}

export interface VisualizerStreamingSettings {
  defaultFfmpegPath: string
  ndiRuntimePath: string
}

export interface VisualizerNdiRuntimeDetection {
  bestPath: string | null
  foundPaths: string[]
  downloadUrl: string
}

/** NDI names from FFmpeg `libndi_newtek` find_sources scan. */
export interface NdiSourceList {
  sources: string[]
  /** Non-empty when the scan could not complete or FFmpeg reported a hard failure. */
  error: string
}

export function initVisualizerStreamConfig(): VisualizerStreamConfig {
  return {
    protocol: 'RTSP',
    ffmpegPath: 'auto',
    ndiRuntimePath: '',
    fps: 30,
    bitrateKbps: 6000,
    rtspUrl: 'rtsp://127.0.0.1:8554/captivate',
    rtspTransport: 'tcp',
    ndiName: 'Captivate Visualizer',
    ndiMuxer: 'libndi_newtek',
  }
}

export function initVisualizerStreamState(): VisualizerStreamState {
  return {
    status: 'idle',
    protocol: 'RTSP',
    message: 'Not streaming',
  }
}

export function initVisualizerStreamingSettings(): VisualizerStreamingSettings {
  return {
    defaultFfmpegPath: 'auto',
    ndiRuntimePath: '',
  }
}

export function initVisualizerRelayRequest(url: string): VisualizerRelayRequest {
  return {
    sourceUrl: url,
    ffmpegPath: 'auto',
    rtspTransport: 'tcp',
    fps: 30,
  }
}
