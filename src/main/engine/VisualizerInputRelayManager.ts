import { spawn } from 'child_process'
import { createServer } from 'net'
import { nanoid } from 'nanoid'
import {
  VisualizerRelayRequest,
  VisualizerRelayStartResult,
} from 'shared/visualizerStreaming'
import {
  buildFfmpegEnv,
  visStreamHealth,
  resolveFfmpegPath,
} from './visualizerStreamingRuntime'

interface RelayEntry {
  id: string
  sourceUrl: string
  relayUrl: string
  process: ReturnType<typeof spawn>
}

const RELAY_READY_TIMEOUT_MS = 750
const RELAY_READY_POLL_MS = 50

export default class VisualizerInputRelayManager {
  private byId = new Map<string, RelayEntry>()
  private bySourceUrl = new Map<string, RelayEntry>()

  async start(req: VisualizerRelayRequest): Promise<VisualizerRelayStartResult> {
    const sourceUrl = req.sourceUrl.trim()
    if (sourceUrl.length === 0) {
      throw new Error('Stream URL is empty')
    }

    const sourceKind = isRtspUrl(sourceUrl)
      ? 'rtsp'
      : isNdiUrl(sourceUrl)
      ? 'ndi'
      : 'direct'

    if (sourceKind === 'direct') {
      return {
        mode: 'direct',
        relayId: null,
        url: sourceUrl,
        message: 'Using direct URL',
      }
    }

    const existing = this.bySourceUrl.get(sourceUrl)
    if (existing) {
      return {
        mode: 'mjpegRelay',
        relayId: existing.id,
        url: existing.relayUrl,
        message: 'Using existing RTSP relay',
      }
    }

    const relayId = nanoid()
    const port = await getFreePort()
    const relayUrl = `http://127.0.0.1:${port}/${relayId}.mjpg`
    const health = visStreamHealth(req.ffmpegPath, 'libndi_newtek')
    if (!health.ffmpeg.exists) {
      throw new Error(`FFmpeg not found at "${health.ffmpeg.resolvedPath}"`)
    }
    const ffmpegPath = resolveFfmpegPath(req.ffmpegPath)

    const ffmpegArgs =
      sourceKind === 'ndi'
        ? buildNdiRelayArgs(req, sourceUrl, relayUrl)
        : buildRtspRelayArgs(req, sourceUrl, relayUrl)

    const relayProcess = spawn(ffmpegPath, ffmpegArgs, {
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
      env: buildFfmpegEnv(),
    })

    const entry: RelayEntry = {
      id: relayId,
      sourceUrl,
      relayUrl,
      process: relayProcess,
    }
    this.byId.set(relayId, entry)
    this.bySourceUrl.set(sourceUrl, entry)

    relayProcess.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim()
      if (text.length > 0) {
        console.warn(`[visualizer-relay:${relayId}] ${text}`)
      }
    })

    relayProcess.on('error', (err) => {
      console.error(`[visualizer-relay:${relayId}] process error`, err)
      this.cleanup(relayId)
    })

    relayProcess.on('exit', () => {
      this.cleanup(relayId)
    })

    try {
      await waitForRelayReady(relayUrl, relayProcess)
    } catch (err) {
      this.kill(entry)
      throw new Error(`RTSP relay failed to start: ${toErrorMessage(err)}`)
    }

    return {
      mode: 'mjpegRelay',
      relayId,
      url: relayUrl,
      message:
        sourceKind === 'ndi'
          ? `NDI relay started on ${relayUrl}`
          : `RTSP relay started on ${relayUrl}`,
    }
  }

  stop(relayId: string) {
    const entry = this.byId.get(relayId)
    if (!entry) return
    this.kill(entry)
  }

  stopAll() {
    for (const entry of Array.from(this.byId.values())) {
      this.kill(entry)
    }
  }

  private kill(entry: RelayEntry) {
    try {
      entry.process.kill('SIGTERM')
    } catch (_err) {}
    this.cleanup(entry.id)
  }

  private cleanup(relayId: string) {
    const entry = this.byId.get(relayId)
    if (!entry) return
    this.byId.delete(relayId)
    this.bySourceUrl.delete(entry.sourceUrl)
  }
}

function isRtspUrl(url: string) {
  const lower = url.toLowerCase()
  return lower.startsWith('rtsp://') || lower.startsWith('rtsps://')
}

function isNdiUrl(url: string) {
  const lower = url.toLowerCase()
  return lower.startsWith('ndi://')
}

function parseNdiSourceName(url: string) {
  const sourceName = url.slice('ndi://'.length).trim()
  return sourceName.length > 0 ? sourceName : 'Captivate'
}

function buildRtspRelayArgs(
  req: VisualizerRelayRequest,
  sourceUrl: string,
  relayUrl: string
) {
  return [
    '-hide_banner',
    '-loglevel',
    'warning',
    '-rtsp_transport',
    req.rtspTransport === 'udp' ? 'udp' : 'tcp',
    '-fflags',
    'nobuffer',
    '-flags',
    'low_delay',
    '-i',
    sourceUrl,
    '-an',
    '-vf',
    `fps=${clampFps(req.fps)}`,
    '-f',
    'mpjpeg',
    '-q:v',
    '5',
    '-listen',
    '1',
    relayUrl,
  ]
}

function buildNdiRelayArgs(
  req: VisualizerRelayRequest,
  sourceUrl: string,
  relayUrl: string
) {
  return [
    '-hide_banner',
    '-loglevel',
    'warning',
    '-fflags',
    'nobuffer',
    '-flags',
    'low_delay',
    '-f',
    'libndi_newtek',
    '-i',
    parseNdiSourceName(sourceUrl),
    '-an',
    '-vf',
    `fps=${clampFps(req.fps)}`,
    '-f',
    'mpjpeg',
    '-q:v',
    '5',
    '-listen',
    '1',
    relayUrl,
  ]
}

function clampFps(fps: number) {
  if (!Number.isFinite(fps)) return 30
  return Math.max(1, Math.min(120, Math.round(fps)))
}

async function getFreePort() {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.on('error', (err) => reject(err))
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (addr === null || typeof addr === 'string') {
        server.close()
        reject(new Error('Failed to resolve relay port'))
        return
      }
      const port = addr.port
      server.close(() => resolve(port))
    })
  })
}

async function waitForRelayReady(
  _relayUrl: string,
  relayProcess: ReturnType<typeof spawn>
) {
  const started = Date.now()

  while (Date.now() - started < RELAY_READY_TIMEOUT_MS) {
    if (relayProcess.exitCode !== null || relayProcess.killed) {
      throw new Error('Relay process exited before it became ready')
    }

    await sleep(RELAY_READY_POLL_MS)
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

function toErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) {
    return err.message
  }
  return String(err)
}
