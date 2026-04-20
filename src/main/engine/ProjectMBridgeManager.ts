import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { ChildProcess, fork } from 'child_process'
import {
  ProjectMBridgeAudioChunk,
  ProjectMBridgeRenderRequest,
  ProjectMBridgeRenderResult,
  ProjectMBridgeSessionInitRequest,
  ProjectMBridgeSessionInitResult,
  ProjectMBridgeStatus,
  ProjectMBridgeTransport,
} from '../../shared/projectmBridge'
import { detectProjectMRuntime } from './projectmRuntime'

interface ProjectMBridgeNativeAddon {
  createSession: (request: ProjectMBridgeSessionInitRequest) => boolean
  loadPreset?: (request: ProjectMBridgePresetLoadRequest) => boolean
  pushAudio: (chunk: ProjectMBridgeAudioChunk) => void
  render: (request: ProjectMBridgeRenderRequest) => Uint8Array | null
  destroySession: (sessionId: string) => void
  getSupportedTransports?: () => ProjectMBridgeTransport[]
}

interface BridgeSessionState {
  mode: 'native' | 'fallback'
  transport: ProjectMBridgeTransport
  width: number
  height: number
  fallbackPhase: number
  fallbackAudioLevel: number
  fallbackBeatPulse: number
  fallbackHue: number
}

type BridgeWorkerCommand =
  | 'createSession'
  | 'loadPreset'
  | 'pushAudio'
  | 'render'
  | 'destroySession'

interface BridgeWorkerResponse {
  id: number
  ok: boolean
  payload?: unknown
  error?: string
}

interface PendingWorkerRequest {
  resolve: (value: any) => void
  reject: (reason: unknown) => void
  timeout: NodeJS.Timeout | null
  worker: ChildProcess
}

interface JsonBufferLike {
  type?: unknown
  data?: unknown
}

interface ProjectMBridgePresetLoadRequest {
  sessionId: string
  presetPath?: string
  texturePath?: string
}

export default class ProjectMBridgeManager {
  private addon: ProjectMBridgeNativeAddon | null = null
  private addonPath: string | null = null
  private sessions = new Map<string, BridgeSessionState>()
  /** One Node child per native session so a blocking createSession cannot stall other sessions' render/audio. */
  private nativeSessionWorkers = new Map<string, ChildProcess>()
  private pendingWorkerRequests = new Map<number, PendingWorkerRequest>()
  private nextWorkerRequestId = 1
  private workerFailureMessage: string | null = null
  private bridgeLogPath: string | null = null

  constructor() {
    this.reload()
  }

  reload() {
    this.shutdownAllSync()
    const loaded = tryLoadProjectMBridgeAddon()
    this.addon = loaded.addon
    this.addonPath = loaded.path
    this.workerFailureMessage = null
  }

  getStatus(): ProjectMBridgeStatus {
    const runtime = detectProjectMRuntime()
    const supportedTransports =
      this.addon?.getSupportedTransports?.() ??
      (this.addon !== null ? ['bgra-buffer'] : [])

    return {
      bridgeLoaded: this.addon !== null,
      bridgePath: this.addonPath,
      runtime,
      supportedTransports,
      message:
        this.workerFailureMessage !== null
          ? `projectM bridge worker unavailable (${this.workerFailureMessage}). Running fallback bridge.`
          : this.addon !== null
            ? 'projectM bridge native addon loaded.'
            : 'projectM bridge native addon missing. Running built-in compatibility bridge.',
    }
  }

  async initSession(
    request: ProjectMBridgeSessionInitRequest
  ): Promise<ProjectMBridgeSessionInitResult> {
    const normalizedRequest = normalizeSessionInitRequest(request)
    const runtime = detectProjectMRuntime()
    if (!runtime.available) {
      const fallback = this.createFallbackSession(normalizedRequest)
      return {
        ...fallback,
        message: `Native runtime unavailable. ${runtime.message}`,
      }
    }

    if (this.addon === null) {
      const fallback = this.createFallbackSession(normalizedRequest)
      return {
        ...fallback,
        message: 'Bridge addon missing. Using fallback session contract only.',
      }
    }

    try {
      let ok = false
      const existingSession = this.sessions.get(normalizedRequest.sessionId)
      const existingWorker =
        this.nativeSessionWorkers.get(normalizedRequest.sessionId) ?? null
      const canHotSwapPreset =
        existingSession?.mode === 'native' &&
        existingWorker !== null &&
        existingSession.transport === normalizedRequest.transport &&
        existingSession.width === normalizeDimension(normalizedRequest.width) &&
        existingSession.height === normalizeDimension(normalizedRequest.height)

      if (canHotSwapPreset && existingWorker !== null) {
        ok = await this.callWorkerOn<boolean>(
          existingWorker,
          'loadPreset',
          {
            request: normalizePresetLoadRequest({
              sessionId: normalizedRequest.sessionId,
              presetPath: normalizedRequest.presetPath,
              texturePath: normalizedRequest.texturePath,
            }),
          },
          20000
        )
        if (!ok) {
          await this.shutdownNativeWorkerForSession(normalizedRequest.sessionId)
          const fallback = this.createFallbackSession(normalizedRequest)
          const bridgeLogTail = this.readBridgeLogTail(6)
          return {
            ...fallback,
            message:
              bridgeLogTail !== null
                ? `Native bridge rejected preset load. ${bridgeLogTail}`
                : 'Native bridge rejected preset load.',
          }
        }
      } else {
        await this.shutdownNativeWorkerForSession(normalizedRequest.sessionId)

        const worker = this.forkBridgeWorker(runtime.libraryPath ?? null)
        if (worker === null) {
          const fallback = this.createFallbackSession(normalizedRequest)
          return {
            ...fallback,
            message:
              this.workerFailureMessage !== null
                ? `Native bridge worker unavailable. ${this.workerFailureMessage}`
                : 'Native bridge worker unavailable.',
          }
        }

        try {
          ok = await this.callWorkerOn<boolean>(
            worker,
            'createSession',
            { request: normalizedRequest },
            45000
          )
        } catch (_err) {
          ok = false
        }

        if (!ok) {
          try {
            worker.kill()
          } catch (_killErr) {
            // ignore
          }
          const fallback = this.createFallbackSession(normalizedRequest)
          const bridgeLogTail = this.readBridgeLogTail(6)
          return {
            ...fallback,
            message:
              bridgeLogTail !== null
                ? `Native bridge rejected session create request. ${bridgeLogTail}`
                : 'Native bridge rejected session create request.',
          }
        }

        this.nativeSessionWorkers.set(normalizedRequest.sessionId, worker)
      }

      this.sessions.set(normalizedRequest.sessionId, {
        mode: 'native',
        transport: normalizedRequest.transport,
        width: normalizeDimension(normalizedRequest.width),
        height: normalizeDimension(normalizedRequest.height),
        fallbackPhase: 0,
        fallbackAudioLevel: 0,
        fallbackBeatPulse: 0,
        fallbackHue: 0,
      })

      return {
        ok: true,
        sessionId: normalizedRequest.sessionId,
        mode: 'native',
        transport: normalizedRequest.transport,
        message: canHotSwapPreset
          ? 'Native projectM bridge preset applied.'
          : 'Native projectM bridge session initialized.',
      }
    } catch (err) {
      const fallback = this.createFallbackSession(normalizedRequest)
      const reason = err instanceof Error ? err.message : String(err)
      const bridgeLogTail = this.readBridgeLogTail(6)
      return {
        ...fallback,
        message:
          bridgeLogTail !== null
            ? `Native bridge session create failed: ${reason}. ${bridgeLogTail}`
            : `Native bridge session create failed: ${reason}.`,
      }
    }
  }

  async pushAudio(chunk: ProjectMBridgeAudioChunk): Promise<void> {
    const session = this.sessions.get(chunk.sessionId)
    if (!session) {
      return
    }

    if (session.mode === 'fallback') {
      const count = Math.max(1, chunk.samples.length)
      let sumSq = 0
      for (let i = 0; i < count; i++) {
        const sample = Number(chunk.samples[i] ?? 0)
        const clamped = Number.isFinite(sample) ? Math.max(-1, Math.min(1, sample)) : 0
        sumSq += clamped * clamped
      }
      const rms = Math.sqrt(sumSq / count)
      const peak = Math.min(
        1,
        chunk.samples.reduce((best, sample) => {
          const value = Number.isFinite(sample) ? Math.abs(sample) : 0
          return value > best ? value : best
        }, 0)
      )
      session.fallbackAudioLevel =
        session.fallbackAudioLevel * 0.78 + Math.min(1, rms * 0.22 + peak * 0.64) * 0.22
      session.fallbackBeatPulse = session.fallbackBeatPulse * 0.82 + peak * 0.18
      return
    }

    const worker = this.nativeSessionWorkers.get(chunk.sessionId)
    if (this.addon === null || worker === undefined) {
      return
    }

    void this.callWorkerOn<void>(worker, 'pushAudio', { chunk }, 2500).catch(
      () => undefined
    )
  }

  async render(
    request: ProjectMBridgeRenderRequest
  ): Promise<ProjectMBridgeRenderResult> {
    const session = this.sessions.get(request.sessionId)
    if (!session) {
      return {
        ok: false,
        sessionId: request.sessionId,
        mode: 'fallback',
        transport: 'bgra-buffer',
        width: 0,
        height: 0,
        pixelFormat: 'bgra8',
        bufferBinary: null,
        bufferBase64: null,
        message: 'Unknown bridge session.',
      }
    }

    const nativeWorker = this.nativeSessionWorkers.get(request.sessionId)
    if (session.mode === 'native' && this.addon !== null && nativeWorker !== undefined) {
      try {
        const rendered = await this.callWorkerOn<unknown>(
          nativeWorker,
          'render',
          { request },
          30000
        )
        const bufferBinary = coerceWorkerFramePayload(rendered)
        return {
          ok: true,
          sessionId: request.sessionId,
          mode: 'native',
          transport: session.transport,
          width: session.width,
          height: session.height,
          pixelFormat: 'bgra8',
          bufferBinary,
          bufferBase64: null,
          message: 'Rendered via native bridge.',
        }
      } catch (_err) {
        return {
          ok: false,
          sessionId: request.sessionId,
          mode: 'native',
          transport: session.transport,
          width: session.width,
          height: session.height,
          pixelFormat: 'bgra8',
          bufferBinary: null,
          bufferBase64: null,
          message: 'Native bridge render failed.',
        }
      }
    }

    return {
      ok: true,
      sessionId: request.sessionId,
      mode: 'fallback',
      transport: session.transport,
      width: session.width,
      height: session.height,
      pixelFormat: 'bgra8',
      bufferBinary: renderFallbackFrame(session, request.frameTimeMs),
      bufferBase64: null,
      message: 'Compatibility bridge frame rendered.',
    }
  }

  async shutdownSession(sessionId: string): Promise<void> {
    const existing = this.sessions.get(sessionId)
    if (!existing) return

    if (existing.mode === 'native') {
      await this.shutdownNativeWorkerForSession(sessionId)
    }

    this.sessions.delete(sessionId)
  }

  shutdownAll() {
    this.shutdownAllSync()
  }

  private shutdownAllSync() {
    for (const sessionId of [...this.sessions.keys()]) {
      const existing = this.sessions.get(sessionId)
      if (existing?.mode === 'native') {
        const worker = this.nativeSessionWorkers.get(sessionId)
        if (worker !== undefined) {
          this.nativeSessionWorkers.delete(sessionId)
          this.rejectPendingForWorker(worker, 'ProjectM bridge shutdown.')
          try {
            worker.kill()
          } catch (_err) {
            // ignore
          }
        }
      }
      this.sessions.delete(sessionId)
    }
    this.nativeSessionWorkers.clear()
  }

  private createFallbackSession(
    request: ProjectMBridgeSessionInitRequest
  ): ProjectMBridgeSessionInitResult {
    const transport: ProjectMBridgeTransport =
      request.transport === 'bgra-buffer' ? request.transport : 'bgra-buffer'

    this.sessions.set(request.sessionId, {
      mode: 'fallback',
      transport,
      width: normalizeDimension(request.width),
      height: normalizeDimension(request.height),
      fallbackPhase: 0,
      fallbackAudioLevel: 0,
      fallbackBeatPulse: 0,
      fallbackHue: Math.random(),
    })

    return {
      ok: true,
      sessionId: request.sessionId,
      mode: 'fallback',
      transport,
      message: 'Fallback bridge session initialized.',
    }
  }

  private forkBridgeWorker(runtimeLibraryPath: string | null): ChildProcess | null {
    if (this.addonPath === null || this.addonPath.trim().length <= 0) {
      this.workerFailureMessage = 'Native bridge addon path is missing.'
      return null
    }

    try {
      const bridgeHostDir = path.join(
        app.getPath('userData'),
        'projectm',
        'bridge-host'
      )
      mkdirSync(bridgeHostDir, { recursive: true })
      const bridgeLogPath = path.join(bridgeHostDir, 'projectmBridgeHost.log')
      this.bridgeLogPath = bridgeLogPath
      const worker = fork(createBridgeWorkerBootstrapPath(), {
        execPath: process.execPath,
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          CAPTIVATE_PROJECTM_BRIDGE_ADDON_PATH: this.addonPath,
          CAPTIVATE_PROJECTM_RUNTIME_PATH:
            typeof runtimeLibraryPath === 'string' ? runtimeLibraryPath : '',
          CAPTIVATE_PROJECTM_BRIDGE_LOG: bridgeLogPath,
        },
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        serialization: 'advanced',
      })

      worker.on('message', (value: BridgeWorkerResponse) => {
        if (!value || typeof value.id !== 'number') {
          return
        }
        const pending = this.pendingWorkerRequests.get(value.id)
        if (!pending) {
          return
        }
        this.pendingWorkerRequests.delete(value.id)
        if (pending.timeout !== null) {
          clearTimeout(pending.timeout)
        }
        if (value.ok) {
          pending.resolve(value.payload)
        } else {
          pending.reject(new Error(value.error ?? 'Worker request failed.'))
        }
      })

      worker.on('error', (error: Error) => {
        this.handleNativeWorkerCrashed(worker, error?.message ?? 'Worker error.')
      })

      worker.on('exit', () => {
        this.handleNativeWorkerCrashed(worker, 'ProjectM bridge worker exited.')
      })

      this.workerFailureMessage = null
      return worker
    } catch (error) {
      this.workerFailureMessage =
        error instanceof Error ? error.message : String(error)
      return null
    }
  }

  private handleNativeWorkerCrashed(worker: ChildProcess, reason: string) {
    for (const [sessionId, mapped] of [...this.nativeSessionWorkers.entries()]) {
      if (mapped === worker) {
        this.nativeSessionWorkers.delete(sessionId)
        if (this.sessions.get(sessionId)?.mode === 'native') {
          this.sessions.delete(sessionId)
        }
      }
    }
    this.rejectPendingForWorker(worker, reason)
  }

  private rejectPendingForWorker(worker: ChildProcess, reason: string) {
    for (const [id, pending] of this.pendingWorkerRequests.entries()) {
      if (pending.worker === worker) {
        this.pendingWorkerRequests.delete(id)
        if (pending.timeout !== null) {
          clearTimeout(pending.timeout)
        }
        pending.reject(new Error(reason))
      }
    }
  }

  private async shutdownNativeWorkerForSession(sessionId: string): Promise<void> {
    const worker = this.nativeSessionWorkers.get(sessionId)
    if (!worker) {
      return
    }
    await this.callWorkerOn<void>(
      worker,
      'destroySession',
      { sessionId },
      5000
    ).catch(() => undefined)
    this.nativeSessionWorkers.delete(sessionId)
    this.rejectPendingForWorker(worker, 'ProjectM bridge session ended.')
    try {
      worker.kill()
    } catch (_err) {
      // ignore
    }
  }

  private callWorkerOn<T>(
    worker: ChildProcess,
    command: BridgeWorkerCommand,
    payload: Record<string, unknown>,
    timeoutMs = 15000
  ): Promise<T> {
    const id = this.nextWorkerRequestId++
    return new Promise<T>((resolve, reject) => {
      const timeout =
        timeoutMs > 0
          ? setTimeout(() => {
              this.pendingWorkerRequests.delete(id)
              reject(new Error(`ProjectM bridge worker ${command} timed out.`))
            }, timeoutMs)
          : null
      this.pendingWorkerRequests.set(id, { resolve, reject, timeout, worker })
      worker.send({
        id,
        command,
        ...payload,
      })
    })
  }

  private readBridgeLogTail(maxLines = 8): string | null {
    const logPath = this.bridgeLogPath
    if (!logPath || !existsSync(logPath)) {
      return null
    }
    try {
      const content = readFileSync(logPath, 'utf8')
      const lines = content
        .split(/\r?\n/g)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
      if (lines.length <= 0) {
        return null
      }
      const tail = lines.slice(-maxLines).join(' | ')
      return `Bridge log tail: ${tail}`
    } catch (_err) {
      return null
    }
  }
}

function normalizeDimension(value: number) {
  const rounded = Math.round(value)
  if (!Number.isFinite(rounded) || rounded <= 0) {
    return 1
  }
  return rounded
}

function coerceWorkerFramePayload(payload: unknown): Uint8Array | null {
  if (payload === null || payload === undefined) {
    return null
  }
  if (payload instanceof Uint8Array) {
    return payload
  }
  if (Buffer.isBuffer(payload)) {
    return new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength)
  }
  if (ArrayBuffer.isView(payload)) {
    const view = payload as ArrayBufferView
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
  }
  const candidate = payload as JsonBufferLike
  if (candidate?.type === 'Buffer' && Array.isArray(candidate.data)) {
    const numeric = candidate.data
      .map((value) => Number(value))
      .map((value) => (Number.isFinite(value) ? value : 0))
      .map((value) => Math.max(0, Math.min(255, value | 0)))
    return Uint8Array.from(numeric)
  }
  return null
}

function normalizeSessionInitRequest(request: ProjectMBridgeSessionInitRequest) {
  return {
    ...request,
    presetPath: normalizeBridgePathValue(request.presetPath),
    texturePath: normalizeTexturePathList(request.texturePath),
  }
}

function normalizePresetLoadRequest(request: ProjectMBridgePresetLoadRequest) {
  return {
    ...request,
    presetPath: normalizeBridgePathValue(request.presetPath),
    texturePath: normalizeTexturePathList(request.texturePath),
  }
}

function normalizeTexturePathList(input: string | undefined) {
  const value = typeof input === 'string' ? input.trim() : ''
  if (value.length <= 0) {
    return value
  }
  const normalized = value
    .split(/[;\r\n]+/g)
    .map((entry) => normalizeBridgePathValue(entry))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
  return normalized.join(';')
}

function normalizeBridgePathValue(input: string | undefined) {
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
  } catch (_err) {
    return value
  }
}

let cachedBridgeHostPath: string | null = null

function createBridgeWorkerBootstrapPath() {
  if (cachedBridgeHostPath !== null && existsSync(cachedBridgeHostPath)) {
    return cachedBridgeHostPath
  }
  const bridgeHostDir = path.join(app.getPath('userData'), 'projectm', 'bridge-host')
  mkdirSync(bridgeHostDir, { recursive: true })
  const bridgeHostPath = path.join(bridgeHostDir, 'projectmBridgeHost.js')
  writeFileSync(bridgeHostPath, createProjectMBridgeHostScript(), 'utf8')
  cachedBridgeHostPath = bridgeHostPath
  return bridgeHostPath
}

export function createProjectMBridgeHostScript() {
  return `
const path = require('path');

const addonPath = String(process.env.CAPTIVATE_PROJECTM_BRIDGE_ADDON_PATH || '').trim();
const runtimeLibraryPath = String(process.env.CAPTIVATE_PROJECTM_RUNTIME_PATH || '').trim();

if (runtimeLibraryPath.length > 0) {
  process.env.CAPTIVATE_PROJECTM_RUNTIME_PATH = runtimeLibraryPath;
  const runtimeDir = path.dirname(runtimeLibraryPath);
  if (runtimeDir && runtimeDir.length > 0) {
    const prependEnvPath = (envKey) => {
      const currentValue = process.env[envKey] || '';
      const normalizedEntries = currentValue
        .split(path.delimiter)
        .map((entry) => String(entry || '').trim().toLowerCase())
        .filter((entry) => entry.length > 0);
      if (!normalizedEntries.includes(runtimeDir.trim().toLowerCase())) {
        process.env[envKey] = runtimeDir + path.delimiter + currentValue;
      }
    };
    prependEnvPath('PATH');
    if (process.platform === 'linux') {
      prependEnvPath('LD_LIBRARY_PATH');
    } else if (process.platform === 'darwin') {
      prependEnvPath('DYLD_LIBRARY_PATH');
      prependEnvPath('DYLD_FALLBACK_LIBRARY_PATH');
    }
  }
}

let addon = null;
try {
  addon = require(addonPath);
} catch (error) {
  addon = null;
}

function postOk(id, payload) {
  if (typeof process.send === 'function') {
    process.send({ id, ok: true, payload });
  }
}

function postError(id, error) {
  const message = error && error.message ? String(error.message) : String(error || 'Unknown worker error.');
  if (typeof process.send === 'function') {
    process.send({ id, ok: false, error: message });
  }
}

process.on('message', (message) => {
  if (!message || typeof message.id !== 'number' || typeof message.command !== 'string') {
    return;
  }
  const id = message.id;
  try {
    if (addon === null) {
      throw new Error('Native projectM bridge addon failed to load in worker.');
    }
    switch (message.command) {
      case 'createSession': {
        const result = addon.createSession(message.request);
        postOk(id, Boolean(result));
        return;
      }
      case 'loadPreset': {
        const result =
          typeof addon.loadPreset === 'function'
            ? addon.loadPreset(message.request)
            : false;
        postOk(id, Boolean(result));
        return;
      }
      case 'pushAudio': {
        addon.pushAudio(message.chunk);
        postOk(id, null);
        return;
      }
      case 'render': {
        const frame = addon.render(message.request);
        postOk(id, frame ?? null);
        return;
      }
      case 'destroySession': {
        addon.destroySession(message.sessionId);
        postOk(id, null);
        return;
      }
      default:
        throw new Error('Unknown worker command: ' + message.command);
    }
  } catch (error) {
    postError(id, error);
  }
});
`
}

function renderFallbackFrame(session: BridgeSessionState, frameTimeMs: number) {
  const width = Math.max(1, Math.min(960, session.width))
  const height = Math.max(1, Math.min(540, session.height))
  const frame = new Uint8Array(width * height * 4)
  const dtSec = Math.max(0.001, Math.min(0.1, frameTimeMs / 1000))
  const speed = 0.45 + session.fallbackAudioLevel * 1.9 + session.fallbackBeatPulse * 2.2
  session.fallbackPhase += dtSec * speed
  session.fallbackHue = (session.fallbackHue + dtSec * (0.008 + session.fallbackAudioLevel * 0.06)) % 1
  session.fallbackBeatPulse *= Math.pow(0.25, dtSec)

  const phase = session.fallbackPhase
  const audio = Math.max(0, Math.min(1, session.fallbackAudioLevel))
  const beat = Math.max(0, Math.min(1, session.fallbackBeatPulse))

  let offset = 0
  for (let y = 0; y < height; y++) {
    const v = y / Math.max(1, height - 1)
    for (let x = 0; x < width; x++) {
      const u = x / Math.max(1, width - 1)
      const plasma =
        Math.sin((u * 10.2 + phase * 1.1) * Math.PI) +
        Math.cos((v * 12.8 - phase * 0.9) * Math.PI) +
        Math.sin(((u + v) * 7.4 + phase * 0.7) * Math.PI)
      const rings = Math.sin(Math.hypot(u - 0.5, v - 0.5) * (30 + audio * 40) - phase * (8 + beat * 12))
      const energy = (plasma * 0.55 + rings * 0.45) * 0.5 + 0.5
      const hue = (session.fallbackHue + u * 0.18 + energy * 0.22 + beat * 0.08) % 1
      const sat = 0.62 + audio * 0.34
      const lit = Math.max(0, Math.min(1, 0.15 + energy * (0.4 + audio * 0.35) + beat * 0.18))
      const rgb = hslToRgb(hue, sat, lit)
      frame[offset++] = rgb[2]
      frame[offset++] = rgb[1]
      frame[offset++] = rgb[0]
      frame[offset++] = 255
    }
  }
  return frame
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 1) + 1) % 1
  const sat = Math.max(0, Math.min(1, s))
  const lit = Math.max(0, Math.min(1, l))
  if (sat <= 0) {
    const gray = Math.round(lit * 255)
    return [gray, gray, gray]
  }
  const q = lit < 0.5 ? lit * (1 + sat) : lit + sat - lit * sat
  const p = 2 * lit - q
  const r = hueToChannel(p, q, hue + 1 / 3)
  const g = hueToChannel(p, q, hue)
  const b = hueToChannel(p, q, hue - 1 / 3)
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

function hueToChannel(p: number, q: number, t: number) {
  let temp = t
  if (temp < 0) temp += 1
  if (temp > 1) temp -= 1
  if (temp < 1 / 6) return p + (q - p) * 6 * temp
  if (temp < 1 / 2) return q
  if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6
  return p
}

function tryLoadProjectMBridgeAddon() {
  ensureRuntimeLibraryOnPath()
  const dynamicRequire = eval('require') as NodeRequire
  const candidates = getAddonCandidates()
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue

    try {
      const loaded = dynamicRequire(candidate) as Partial<ProjectMBridgeNativeAddon>
      if (
        typeof loaded.createSession === 'function' &&
        typeof loaded.pushAudio === 'function' &&
        typeof loaded.render === 'function' &&
        typeof loaded.destroySession === 'function'
      ) {
        return {
          addon: loaded as ProjectMBridgeNativeAddon,
          path: candidate,
        }
      }
    } catch (_err) {}
  }

  return {
    addon: null,
    path: null,
  }
}

function ensureRuntimeLibraryOnPath() {
  const runtime = detectProjectMRuntime()
  const libraryPath = runtime.libraryPath
  if (!libraryPath || libraryPath.trim().length === 0) {
    return
  }

  const runtimeDir = path.dirname(libraryPath)
  prependPathEnvVar('PATH', runtimeDir)
  if (process.platform === 'linux') {
    prependPathEnvVar('LD_LIBRARY_PATH', runtimeDir)
  } else if (process.platform === 'darwin') {
    prependPathEnvVar('DYLD_LIBRARY_PATH', runtimeDir)
    prependPathEnvVar('DYLD_FALLBACK_LIBRARY_PATH', runtimeDir)
  }
}

function prependPathEnvVar(envKey: string, directory: string) {
  const trimmed = directory.trim()
  if (trimmed.length <= 0) return
  const current = process.env[envKey] ?? ''
  const entries = current
    .split(path.delimiter)
    .map((entry) => entry.trim().toLowerCase())
  if (entries.includes(trimmed.toLowerCase())) {
    return
  }
  process.env[envKey] = `${trimmed}${path.delimiter}${current}`
}

function getAddonCandidates() {
  const candidates: string[] = []
  const configured = process.env.CAPTIVATE_PROJECTM_BRIDGE_PATH?.trim() ?? ''
  if (configured.length > 0) {
    candidates.push(configured)
  }

  if (app.isPackaged) {
    const userDataBridgePath = path.join(
      app.getPath('userData'),
      'projectm',
      'projectm-bridge',
      'projectm_bridge.node'
    )
    candidates.push(
      path.join(
        process.resourcesPath,
        'assets',
        'projectm-bridge',
        'projectm_bridge.node'
      ),
      userDataBridgePath
    )
  } else {
    candidates.push(
      path.join(
        __dirname,
        '../../assets/projectm-bridge/projectm_bridge.node'
      ),
      path.join(__dirname, '../../native/projectm-bridge/projectm_bridge.node'),
      path.join(
        __dirname,
        '../../native/projectm-bridge/build/Release/projectm_bridge.node'
      ),
      path.join(__dirname, '../../../native/projectm-bridge/projectm_bridge.node'),
      path.join(
        __dirname,
        '../../../native/projectm-bridge/build/Release/projectm_bridge.node'
      ),
      path.join(
        app.getPath('userData'),
        'projectm',
        'projectm-bridge',
        'projectm_bridge.node'
      )
    )
  }

  return Array.from(new Set(candidates))
}
