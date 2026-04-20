import * as THREE from 'three'
import LayerBase from './LayerBase'
import UpdateResource from '../UpdateResource'
import {
  initProjectMBridgeSession,
  pushProjectMBridgeAudio,
  renderProjectMBridgeFrame,
  shutdownProjectMBridgeSession,
} from '../../ipcHandler'
import { ProjectMBridgeTransport } from '../../../shared/projectmBridge'

export interface ProjectMConfig {
  type: 'ProjectM'
  preset: string
  presetDirectory: string
  intensity: number
}

const BRIDGE_TARGET_FPS = 30
const BRIDGE_RENDER_FPS = 24
const BRIDGE_MIN_WIDTH = 256
const BRIDGE_MAX_WIDTH = 640
const BRIDGE_MIN_HEIGHT = 144
const BRIDGE_MAX_HEIGHT = 360
const BRIDGE_QUALITY_MIN = 0.26
const BRIDGE_QUALITY_MAX = 0.45

export function initProjectMConfig(): ProjectMConfig {
  return {
    type: 'ProjectM',
    preset: '',
    presetDirectory: '',
    intensity: 1,
  }
}

export function normalizeProjectMConfig(source: unknown): ProjectMConfig {
  const defaults = initProjectMConfig()
  const input = (source ?? {}) as Partial<ProjectMConfig>

  return {
    type: 'ProjectM',
    preset:
      typeof input.preset === 'string' && input.preset.trim().length > 0
        ? input.preset.trim()
        : defaults.preset,
    presetDirectory: normalizePresetDirectory(
      typeof input.presetDirectory === 'string' ? input.presetDirectory : '',
      typeof input.preset === 'string' ? input.preset : defaults.preset
    ),
    intensity: clamp01(input.intensity, defaults.intensity),
  }
}

export default class ProjectM extends LayerBase {
  private config: ProjectMConfig
  private root: THREE.Group
  private quad: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private textureData: Uint8Array
  private texture: THREE.DataTexture
  private textureWidth = 0
  private textureHeight = 0
  private sessionId: string
  private sessionReady = false
  private sessionInitPromise: Promise<void> | null = null
  private renderInFlight = false
  private audioPushInFlight = false
  private lastAudioPushMs = 0
  private lastRenderDispatchMs = 0
  private lastBridgeFrameTimeMs = 0
  private targetWidth = 384
  private targetHeight = 216
  private viewportWidth = 1280
  private viewportHeight = 720
  private qualityScale = 0.36
  private renderLatencyEmaMs = 0
  private lastQualityAdjustMs = 0
  private fallbackClockSec = 0
  private sessionGeneration = 0
  private consecutiveRenderMisses = 0
  private hasRenderedFrame = false

  constructor(config: ProjectMConfig) {
    super()
    this.config = normalizeProjectMConfig(config)
    this.scene.background = new THREE.Color('#000000')
    this.sessionId = makeSessionId()
    this.recomputeTargetSize()

    this.root = new THREE.Group()
    this.scene.add(this.root)

    this.textureData = new Uint8Array(4 * 4 * 4)
    this.textureWidth = 4
    this.textureHeight = 4
    this.texture = new THREE.DataTexture(
      this.textureData,
      this.textureWidth,
      this.textureHeight,
      THREE.RGBAFormat
    )
    this.texture.needsUpdate = true

    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        toneMapped: false,
        transparent: true,
      })
    )
    this.quad.position.set(0, 0, 0)
    this.root.add(this.quad)
  }

  resize(width: number, height: number): void {
    const safeWidth = Math.max(1, Math.round(width))
    const safeHeight = Math.max(1, Math.round(height))
    this.viewportWidth = safeWidth
    this.viewportHeight = safeHeight
    super.resize(safeWidth, safeHeight)
    this.updateQuadScale()
    this.recomputeTargetSize()
    this.resetSession(true)
  }

  applyConfig(nextConfig: unknown): boolean {
    const input = (nextConfig as { projectM?: unknown } | null | undefined)?.projectM
    if (input === undefined) {
      return false
    }
    const next = normalizeProjectMConfig(input)
    const presetChanged = next.preset !== this.config.preset
    this.config = next
    if (presetChanged) {
      this.resetSession(true)
    }
    return true
  }

  update(res: UpdateResource): void {
    const dtSec = Math.max(0, res.dt) / 1000
    this.fallbackClockSec += dtSec

    this.quad.material.color.setScalar(1)
    this.quad.material.opacity = 1

    if (this.sessionInitPromise === null && this.sessionReady === false) {
      this.sessionInitPromise = this.initSession()
    }

    const now = Date.now()
    if (
      this.sessionReady &&
      !this.audioPushInFlight &&
      now - this.lastAudioPushMs >= 33
    ) {
      this.lastAudioPushMs = now
      this.audioPushInFlight = true
      const audioChunk = buildBridgeAudioChunk(res.audio)
      void pushProjectMBridgeAudio({
        sessionId: this.sessionId,
        channels: audioChunk.channels,
        samples: audioChunk.samples,
      })
        .catch(() => undefined)
        .finally(() => {
          this.audioPushInFlight = false
        })
    }

    if (
      this.sessionReady &&
      !this.renderInFlight &&
      now - this.lastRenderDispatchMs >= 1000 / BRIDGE_RENDER_FPS
    ) {
      const elapsedSinceLastBridgeFrame =
        this.lastBridgeFrameTimeMs > 0
          ? Math.max(1, now - this.lastBridgeFrameTimeMs)
          : Math.round(1000 / BRIDGE_RENDER_FPS)
      this.lastBridgeFrameTimeMs = now
      this.lastRenderDispatchMs = now
      this.renderInFlight = true
      const dispatchStartedAt = performance.now()
      const currentGeneration = this.sessionGeneration
      void renderProjectMBridgeFrame({
        sessionId: this.sessionId,
        frameTimeMs: Math.min(250, Math.max(1, Math.round(elapsedSinceLastBridgeFrame))),
      })
        .then((result) => {
          this.updateAdaptiveQuality(performance.now() - dispatchStartedAt)
          if (currentGeneration !== this.sessionGeneration) {
            return
          }
          if (!result.ok) {
            this.consecutiveRenderMisses += 1
            if (this.consecutiveRenderMisses >= 30) {
              this.resetSession(false)
            }
            return
          }
          const frameBytes = coerceFrameBytes(
            result.bufferBinary,
            result.bufferBase64,
            result.width,
            result.height
          )
          if (frameBytes === null) {
            this.consecutiveRenderMisses += 1
            if (this.consecutiveRenderMisses >= 30) {
              this.resetSession(false)
            }
            return
          }
          this.consecutiveRenderMisses = 0
          this.applyBridgeFrame(frameBytes, result.width, result.height)
        })
        .catch(() => {
          this.updateAdaptiveQuality(performance.now() - dispatchStartedAt)
          this.consecutiveRenderMisses += 1
          if (this.consecutiveRenderMisses >= 30) {
            this.resetSession(false)
          }
        })
        .finally(() => {
          this.renderInFlight = false
        })
    }

    if (!this.sessionReady && !this.hasRenderedFrame) {
      this.drawFallbackFrame()
    }
  }

  isFrameReady(): boolean {
    return this.hasRenderedFrame
  }

  dispose(): void {
    this.sessionGeneration += 1
    void shutdownProjectMBridgeSession(this.sessionId).catch(() => undefined)
    this.quad.geometry.dispose()
    this.quad.material.dispose()
    this.texture.dispose()
    this.root.remove(this.quad)
    this.scene.remove(this.root)
  }

  private async initSession() {
    const requestedGeneration = this.sessionGeneration
    const requestedSessionId = this.sessionId
    try {
      const transport: ProjectMBridgeTransport = 'bgra-buffer'
      const presetPath = this.config.preset.trim()
      const result = await initProjectMBridgeSession({
        sessionId: requestedSessionId,
        width: this.targetWidth,
        height: this.targetHeight,
        fps: BRIDGE_TARGET_FPS,
        transport,
        presetPath: toProjectMBridgePresetPath(presetPath),
        texturePath: buildTextureSearchPathHint(presetPath),
      })
      if (
        requestedGeneration !== this.sessionGeneration ||
        requestedSessionId !== this.sessionId
      ) {
        return
      }
      this.sessionReady = result.ok
    } catch (_error) {
      if (requestedGeneration === this.sessionGeneration) {
        this.sessionReady = false
      }
    } finally {
      if (requestedGeneration === this.sessionGeneration) {
        this.sessionInitPromise = null
      }
    }
  }

  private resetSession(generateNewId: boolean) {
    const previousSessionId = this.sessionId
    this.sessionGeneration += 1
    this.sessionReady = false
    this.sessionInitPromise = null
    this.renderInFlight = false
    this.audioPushInFlight = false
    this.lastAudioPushMs = 0
    this.lastRenderDispatchMs = 0
    this.lastBridgeFrameTimeMs = 0
    this.consecutiveRenderMisses = 0
    if (generateNewId) {
      this.sessionId = makeSessionId()
    }
    void shutdownProjectMBridgeSession(previousSessionId).catch(() => undefined)
  }

  private applyBridgeFrame(bytes: Uint8Array, width: number, height: number) {
    const safeWidth = clampInt(width, 1, BRIDGE_MAX_WIDTH)
    const safeHeight = clampInt(height, 1, BRIDGE_MAX_HEIGHT)
    const byteLength = safeWidth * safeHeight * 4
    const frameBytes = bytes.length === byteLength ? bytes : bytes.subarray(0, byteLength)

    if (safeWidth !== this.textureWidth || safeHeight !== this.textureHeight) {
      this.texture.dispose()
      this.textureData = new Uint8Array(byteLength)
      this.textureWidth = safeWidth
      this.textureHeight = safeHeight
      this.texture = new THREE.DataTexture(
        this.textureData,
        this.textureWidth,
        this.textureHeight,
        THREE.RGBAFormat
      )
      this.texture.needsUpdate = true
      this.quad.material.map = this.texture
      this.quad.material.needsUpdate = true
      this.updateQuadScale()
    }

    if (frameBytes.length < byteLength) {
      this.textureData.fill(0)
    }
    this.textureData.set(frameBytes)
    this.texture.needsUpdate = true
    this.hasRenderedFrame = true
  }

  private updateQuadScale() {
    const visible = this.visibleSizeAtZ(0)
    const viewportAspect =
      visible.height > 0 ? visible.width / visible.height : 1
    const textureAspect =
      this.textureHeight > 0 ? this.textureWidth / this.textureHeight : viewportAspect

    let drawWidth = visible.width
    let drawHeight = visible.height
    if (textureAspect > viewportAspect) {
      drawHeight = drawWidth / Math.max(0.0001, textureAspect)
    } else {
      drawWidth = drawHeight * textureAspect
    }
    this.quad.scale.set(drawWidth / 2, drawHeight / 2, 1)
    this.quad.position.set(0, 0, 0)
  }

  private drawFallbackFrame() {
    const width = this.textureWidth
    const height = this.textureHeight
    if (width <= 0 || height <= 0) return
    let offset = 0
    for (let y = 0; y < height; y++) {
      const v = y / Math.max(1, height - 1)
      for (let x = 0; x < width; x++) {
        const u = x / Math.max(1, width - 1)
        const wave =
          Math.sin((u * 7 + this.fallbackClockSec * 1.8) * Math.PI) * 0.5 +
          Math.cos((v * 6 - this.fallbackClockSec * 1.3) * Math.PI) * 0.5
        const c = Math.round((wave * 0.5 + 0.5) * 255)
        this.textureData[offset++] = c
        this.textureData[offset++] = c
        this.textureData[offset++] = c
        this.textureData[offset++] = 255
      }
    }
    this.texture.needsUpdate = true
  }

  private recomputeTargetSize() {
    this.targetWidth = clampInt(
      Math.round(this.viewportWidth * this.qualityScale),
      BRIDGE_MIN_WIDTH,
      BRIDGE_MAX_WIDTH
    )
    this.targetHeight = clampInt(
      Math.round(this.viewportHeight * this.qualityScale),
      BRIDGE_MIN_HEIGHT,
      BRIDGE_MAX_HEIGHT
    )
  }

  private updateAdaptiveQuality(renderLatencyMs: number) {
    if (!Number.isFinite(renderLatencyMs) || renderLatencyMs <= 0) {
      return
    }
    this.renderLatencyEmaMs =
      this.renderLatencyEmaMs <= 0
        ? renderLatencyMs
        : this.renderLatencyEmaMs * 0.85 + renderLatencyMs * 0.15

    const now = Date.now()
    if (now - this.lastQualityAdjustMs < 3000) {
      return
    }

    if (this.renderLatencyEmaMs > 150 && this.qualityScale > BRIDGE_QUALITY_MIN) {
      this.qualityScale = Math.max(BRIDGE_QUALITY_MIN, this.qualityScale * 0.85)
      this.recomputeTargetSize()
      this.lastQualityAdjustMs = now
      this.resetSession(false)
      return
    }

    if (this.renderLatencyEmaMs < 70 && this.qualityScale < BRIDGE_QUALITY_MAX) {
      this.qualityScale = Math.min(BRIDGE_QUALITY_MAX, this.qualityScale * 1.07)
      this.recomputeTargetSize()
      this.lastQualityAdjustMs = now
      this.resetSession(false)
    }
  }
}

function buildBridgeAudioChunk(audio: UpdateResource['audio']) {
  const sampleCount = 256
  const channels: 1 | 2 = 2
  const out = new Array<number>(sampleCount * channels)
  const level = clamp01(audio.inputLevel, 0) * (audio.enabled ? 1 : 0)
  const beat = clamp01(audio.beatPulse, 0) * (audio.enabled ? 1 : 0)
  const energy = clamp01(audio.energyLevel, 0) * (audio.enabled ? 1 : 0)
  const spectrum = Array.isArray(audio.spectrum) ? audio.spectrum : []
  for (let i = 0; i < sampleCount; i++) {
    const t = i / Math.max(1, sampleCount - 1)
    const lowSpectrum =
      spectrum.length > 0
        ? spectrum[Math.floor(t * Math.max(1, (spectrum.length * 0.5) - 1))] ?? 0
        : 0
    const highSpectrum =
      spectrum.length > 0 ? spectrum[Math.floor(t * (spectrum.length - 1))] ?? 0 : 0
    const drive = Math.max(0, Math.min(1, 0.18 + level * 0.82))
    const harmonicBase = Math.sin(t * Math.PI * (4 + energy * 18))
    const harmonicPulse = Math.sin(t * Math.PI * (8 + beat * 32))
    const left = clampSigned(
      drive * (harmonicBase * (0.35 + lowSpectrum * 0.65) + harmonicPulse * 0.38)
    )
    const right = clampSigned(
      drive * (harmonicBase * (0.3 + highSpectrum * 0.7) - harmonicPulse * 0.36)
    )
    out[i * 2] = left
    out[i * 2 + 1] = right
  }
  return {
    channels,
    samples: out,
  }
}

function decodeBase64(base64: string, expectedLength: number) {
  const globalDecoder =
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { atob?: unknown }).atob === 'function'
      ? ((globalThis as { atob: (input: string) => string }).atob)
      : null

  if (globalDecoder !== null) {
    let binary: string
    try {
      binary = globalDecoder(base64)
    } catch (_error) {
      return null
    }
    const length = Math.min(expectedLength, binary.length)
    const bytes = new Uint8Array(expectedLength)
    for (let i = 0; i < length; i++) {
      bytes[i] = binary.charCodeAt(i) & 0xff
    }
    return bytes
  }

  try {
    const maybeBuffer = (globalThis as { Buffer?: any }).Buffer
    if (typeof maybeBuffer?.from === 'function') {
      const decoded = maybeBuffer.from(base64, 'base64')
      const bytes = new Uint8Array(expectedLength)
      bytes.set(decoded.subarray(0, expectedLength))
      return bytes
    }
  } catch (_error) {
    return null
  }

  return null
}

function coerceFrameBytes(
  binary: unknown,
  base64: unknown,
  width: number,
  height: number
) {
  const expectedLength = clampInt(width, 1, BRIDGE_MAX_WIDTH) * clampInt(height, 1, BRIDGE_MAX_HEIGHT) * 4
  if (binary instanceof Uint8Array) {
    return binary.length >= expectedLength ? binary : null
  }
  if (
    binary !== null &&
    typeof binary === 'object' &&
    'buffer' in (binary as Record<string, unknown>) &&
    'byteLength' in (binary as Record<string, unknown>)
  ) {
    try {
      const view = binary as ArrayBufferView
      const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
      return bytes.length >= expectedLength ? bytes : null
    } catch (_error) {
      // fall through
    }
  }
  if (
    binary !== null &&
    typeof binary === 'object' &&
    (binary as { type?: unknown }).type === 'Buffer' &&
    Array.isArray((binary as { data?: unknown }).data)
  ) {
    const values = (binary as { data: unknown[] }).data
      .map((value) => Number(value))
      .map((value) => (Number.isFinite(value) ? value : 0))
      .map((value) => Math.max(0, Math.min(255, value | 0)))
    const bytes = Uint8Array.from(values)
    return bytes.length >= expectedLength ? bytes : null
  }
  if (typeof base64 === 'string' && base64.length > 0) {
    return decodeBase64(base64, expectedLength)
  }
  return null
}

function clamp01(value: unknown, fallback: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return fallback
  }
  return Math.min(1, Math.max(0, numeric))
}

function clampSigned(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(-1, value))
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  const rounded = Math.round(value)
  return Math.min(max, Math.max(min, rounded))
}

function makeSessionId() {
  return `projectm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function buildTextureSearchPathHint(presetPath: string) {
  const presetDir = dirnameFromPath(normalizeProjectMBridgePath(presetPath))
  if (presetDir.length <= 0) {
    return ''
  }
  const candidates = new Set<string>()
  const sep = presetDir.includes('\\') ? '\\' : '/'
  const add = (base: string, child: string) =>
    base.endsWith(sep) ? `${base}${child}` : `${base}${sep}${child}`
  candidates.add(presetDir)
  candidates.add(add(presetDir, 'textures'))
  candidates.add(add(presetDir, 'Textures'))

  const parent = dirnameFromPath(presetDir)
  const currentName = basenameFromPath(presetDir).toLowerCase()
  if (parent.length > 0 && (currentName === 'presets' || currentName === 'preset')) {
    const parentSep = parent.includes('\\') ? '\\' : '/'
    const addParent = (base: string, child: string) =>
      base.endsWith(parentSep) ? `${base}${child}` : `${base}${parentSep}${child}`
    candidates.add(parent)
    candidates.add(addParent(parent, 'textures'))
    candidates.add(addParent(parent, 'Textures'))
  }

  return Array.from(candidates).join(';')
}

function dirnameFromPath(input: string) {
  const value = normalizeProjectMBridgePath(
    typeof input === 'string' ? input.trim() : ''
  )
  if (value.length <= 0 || /^[a-z]+:\/\//i.test(value)) {
    return ''
  }
  const normalized = value.replace(/[\\\/]+$/, '')
  const separatorIndex = Math.max(
    normalized.lastIndexOf('/'),
    normalized.lastIndexOf('\\')
  )
  if (separatorIndex <= 0) {
    return ''
  }
  return normalized.slice(0, separatorIndex)
}

function basenameFromPath(input: string) {
  const value = normalizeProjectMBridgePath(
    typeof input === 'string' ? input.trim() : ''
  )
  if (value.length <= 0 || /^[a-z]+:\/\//i.test(value)) {
    return ''
  }
  const normalized = value.replace(/[\\\/]+$/, '')
  const separatorIndex = Math.max(
    normalized.lastIndexOf('/'),
    normalized.lastIndexOf('\\')
  )
  if (separatorIndex < 0) {
    return normalized
  }
  return normalized.slice(separatorIndex + 1)
}

function normalizePresetDirectory(presetDirectory: string, presetPath: string) {
  const explicit = typeof presetDirectory === 'string' ? presetDirectory.trim() : ''
  if (explicit.length > 0) {
    return explicit
  }
  return dirnameFromPath(typeof presetPath === 'string' ? presetPath : '')
}

function toProjectMBridgePresetPath(presetPath: string) {
  return normalizeProjectMBridgePath(presetPath)
}

function normalizeProjectMBridgePath(input: string) {
  const value = typeof input === 'string' ? input.trim() : ''
  if (value.length <= 0) {
    return value
  }
  if (!/^file:\/\//i.test(value)) {
    return value
  }
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'file:') {
      return value
    }
    const host = decodeURIComponent(parsed.hostname ?? '')
    let pathname = decodeURIComponent(parsed.pathname ?? '')
    if (host.length > 0) {
      pathname = pathname.replace(/^\/+/, '')
      const uncTail = pathname.replace(/\//g, '\\')
      return `\\\\${host}\\${uncTail}`
    }
    if (/^\/[a-zA-Z]:\//.test(pathname)) {
      pathname = pathname.slice(1)
    }
    if (/^[a-zA-Z]:\//.test(pathname)) {
      return pathname.replace(/\//g, '\\')
    }
    return pathname
  } catch (_error) {
    return value
  }
}
