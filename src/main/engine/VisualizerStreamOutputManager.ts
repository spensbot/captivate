import { spawn } from 'child_process'
import { BrowserWindow, NativeImage } from 'electron'
import {
  initVisualizerStreamState,
  VisualizerStreamConfig,
  VisualizerStreamState,
} from 'shared/visualizerStreaming'
import {
  buildFfmpegEnv,
  visStreamHealth,
  resolveNdiRuntimeLibrary,
  resolveFfmpegPath,
} from './visualizerStreamingRuntime'
import VisualizerNdiSender from './VisualizerNdiSender'
import {
  telemetryCounter,
  telemetryDuration,
  telemetryEvent,
  telemetryGauge,
  telemetryHealth,
} from '../telemetry'

const MIN_FPS = 1
const MAX_FPS = 120
const MIN_BITRATE_KBPS = 250
const MAX_BITRATE_KBPS = 100000
const MAX_STDIN_QUEUE_BYTES = 8 * 1024 * 1024

export default class VisualizerStreamOutputManager {
  private ffmpeg: ReturnType<typeof spawn> | null = null
  private ndiSender: VisualizerNdiSender | null = null
  private window: BrowserWindow | null = null
  private frameSubscribed = false
  private frameIntervalMs = 1000 / 30
  private nextFrameDueMs = 0
  private state: VisualizerStreamState = initVisualizerStreamState()
  private stopping = false
  private nextTelemetryFrameSampleAtMs = 0
  private ffmpegPipeErrored = false

  getState(): VisualizerStreamState {
    return { ...this.state }
  }

  start(
    config: VisualizerStreamConfig,
    window: BrowserWindow | null
  ): VisualizerStreamState {
    const startAt = performance.now()
    telemetryCounter('stream.output', 'start_requests')
    if (window === null || window.isDestroyed()) {
      telemetryHealth('stream.output', 'warn', 'Start failed: visualizer window missing')
      return this.setError(config.protocol, 'Open the visualizer window first.')
    }

    this.stopInternal('Restarting stream')

    const normalized = normalizeConfig(config)
    const health = visStreamHealth(
      normalized.ffmpegPath,
      normalized.ndiMuxer,
      normalized.ndiRuntimePath
    )
    if (normalized.protocol === 'RTSP' && !health.ffmpeg.exists) {
      telemetryHealth('stream.output', 'error', 'Start failed: ffmpeg missing')
      return this.setError(
        normalized.protocol,
        `FFmpeg not found at "${health.ffmpeg.resolvedPath}".`
      )
    }
    if (normalized.protocol === 'NDI' && !health.ndi.supported) {
      telemetryHealth('stream.output', 'error', 'Start failed: NDI unsupported')
      return this.setError(
        normalized.protocol,
        health.ndi.message
      )
    }
    if (normalized.protocol === 'NDI' && !health.ndi.runtimeReady) {
      telemetryHealth('stream.output', 'error', 'Start failed: NDI runtime missing')
      return this.setError(
        normalized.protocol,
        `NDI runtime libraries are missing. Add them to assets/ndi-runtime or install system NDI runtime.`
      )
    }

    const [windowWidth, windowHeight] = window.getContentSize()
    const width = clampEven(windowWidth, 2, 7680)
    const height = clampEven(windowHeight, 2, 4320)

    this.window = window
    this.frameIntervalMs = 1000 / normalized.fps
    this.nextFrameDueMs = 0
    this.ffmpegPipeErrored = false

    const shouldUseNativeNdi =
      normalized.protocol === 'NDI' && health.ndi.delivery === 'native_sdk'
    if (shouldUseNativeNdi) {
      const runtimeLibraryPath =
        health.ndi.nativeLibraryPath ||
        resolveNdiRuntimeLibrary(normalized.ndiRuntimePath)
      if (runtimeLibraryPath === null) {
        return this.setError(
          normalized.protocol,
          'NDI runtime library could not be resolved.'
        )
      }

      try {
        const ndiSender = new VisualizerNdiSender({
          libraryPath: runtimeLibraryPath,
          configuredRuntimePath: normalized.ndiRuntimePath,
          sourceName: normalized.ndiName,
          width,
          height,
          fps: normalized.fps,
        })
        ndiSender.start()
        this.ndiSender = ndiSender
        telemetryCounter('stream.output', 'ndi_native_started')
      } catch (err) {
        this.cleanupNdiSender()
        telemetryCounter('stream.output', 'ndi_native_start_failures')
        telemetryHealth('stream.output', 'error', 'Failed to start native NDI sender')
        return this.setError(
          normalized.protocol,
          `Failed to start native NDI sender: ${toErrorMessage(err)}`
        )
      }
    } else {
      const ffmpegArgs =
        normalized.protocol === 'RTSP'
          ? buildRtspArgs(normalized, width, height)
          : buildNdiArgs(normalized, width, height)
      const ffmpegPath = resolveFfmpegPath(normalized.ffmpegPath)

      try {
        const ffmpeg = spawn(ffmpegPath, ffmpegArgs, {
          stdio: ['pipe', 'ignore', 'pipe'],
          windowsHide: true,
          env: buildFfmpegEnv(normalized.ndiRuntimePath),
        })
        this.ffmpeg = ffmpeg
        ffmpeg.stdin?.on('error', (err) => {
          this.handleFfmpegPipeError(
            normalized.protocol,
            `FFmpeg stdin error: ${err?.message || String(err)}`
          )
        })

        ffmpeg.on('error', (err) => {
          telemetryCounter('stream.output', 'ffmpeg_errors')
          telemetryHealth(
            'stream.output',
            'error',
            `FFmpeg process error: ${err.message || String(err)}`
          )
          if (!this.stopping) {
            this.setError(
              normalized.protocol,
              `FFmpeg process error: ${err.message || String(err)}`
            )
          }
          this.cleanupProcess()
          this.stopFrameSubscription()
        })

        ffmpeg.stderr.on('data', (chunk: Buffer) => {
          const text = chunk.toString().trim()
          if (text.length > 0) {
            console.warn(`[visualizer-stream] ${text}`)
          }
        })

        ffmpeg.on('exit', (code, signal) => {
          telemetryCounter('stream.output', 'ffmpeg_exits')
          telemetryHealth('stream.output', 'warn', 'FFmpeg process exited', {
            code,
            signal,
          })
          if (!this.stopping && this.state.status !== 'error') {
            const detail =
              code !== null
                ? `code ${code}`
                : signal
                ? `signal ${signal}`
                : 'unknown'
            this.setError(
              normalized.protocol,
              `FFmpeg exited unexpectedly (${detail}).`
            )
          }
          this.cleanupProcess()
          this.stopFrameSubscription()
          if (!this.stopping && this.state.status !== 'error') {
            this.state = {
              status: 'idle',
              protocol: normalized.protocol,
              message: 'Not streaming',
            }
          }
        })
      } catch (err) {
        telemetryCounter('stream.output', 'ffmpeg_start_failures')
        telemetryHealth('stream.output', 'error', 'Failed to launch FFmpeg')
        return this.setError(
          normalized.protocol,
          `Failed to launch FFmpeg: ${String(err)}`
        )
      }
    }

    if (!this.startFrameSubscription(window, width, height)) {
      telemetryCounter('stream.output', 'frame_subscription_failures')
      telemetryHealth(
        'stream.output',
        'error',
        'Frame subscription unsupported in this Electron build'
      )
      this.stopInternal('Not streaming')
      return this.setError(
        normalized.protocol,
        `Your Electron build does not support frame subscription for capture.`
      )
    }

    this.state = {
      status: 'running',
      protocol: normalized.protocol,
      message:
        normalized.protocol === 'RTSP'
          ? `Streaming to ${normalized.rtspUrl}`
          : shouldUseNativeNdi
          ? `Streaming as NDI source "${normalized.ndiName}" (native SDK)`
          : `Streaming as NDI source "${normalized.ndiName}"`,
    }
    telemetryGauge('stream.output', 'width', width, 'px')
    telemetryGauge('stream.output', 'height', height, 'px')
    telemetryGauge('stream.output', 'fps', normalized.fps, 'fps')
    telemetryDuration('stream.output', 'start_ms', performance.now() - startAt)
    telemetryHealth('stream.output', 'ok', 'Stream running')
    telemetryCounter('stream.output', 'start_success')

    return this.getState()
  }

  stop(): VisualizerStreamState {
    return this.stopInternal('Not streaming')
  }

  private stopInternal(message: string): VisualizerStreamState {
    telemetryCounter('stream.output', 'stop_requests')
    this.stopping = true
    this.stopFrameSubscription()
    this.cleanupProcess()
    this.cleanupNdiSender()
    this.window = null
    this.state = {
      status: 'idle',
      protocol: this.state.protocol,
      message,
    }
    this.stopping = false
    telemetryHealth('stream.output', 'warn', message)
    return this.getState()
  }

  private cleanupProcess() {
    if (this.ffmpeg === null) return

    try {
      this.ffmpeg.stdin?.end()
    } catch (_err) {}

    try {
      this.ffmpeg.kill('SIGTERM')
    } catch (_err) {}

    this.ffmpeg = null
  }

  private cleanupNdiSender() {
    if (this.ndiSender === null) return
    try {
      this.ndiSender.stop()
    } catch (_err) {}
    this.ndiSender = null
  }

  private startFrameSubscription(
    window: BrowserWindow,
    width: number,
    height: number
  ): boolean {
    const webContentsAny = window.webContents as unknown as {
      beginFrameSubscription?: (
        onlyDirty: boolean,
        callback: (image: NativeImage) => void
      ) => void
      endFrameSubscription?: () => void
    }

    if (typeof webContentsAny.beginFrameSubscription !== 'function') {
      return false
    }

    webContentsAny.beginFrameSubscription(false, (image) =>
      this.onFrame(image, width, height)
    )
    this.frameSubscribed = true

    window.once('closed', () => {
      if (this.state.status === 'running' || this.state.status === 'starting') {
        this.stopInternal('Visualizer window was closed')
      }
    })

    return true
  }

  private stopFrameSubscription() {
    if (!this.frameSubscribed || this.window === null || this.window.isDestroyed()) {
      this.frameSubscribed = false
      return
    }

    const webContentsAny = this.window.webContents as unknown as {
      endFrameSubscription?: () => void
    }

    if (typeof webContentsAny.endFrameSubscription === 'function') {
      webContentsAny.endFrameSubscription()
    }

    this.frameSubscribed = false
  }

  private onFrame(image: NativeImage, width: number, height: number) {
    const frameStartedAt = performance.now()
    if (image.isEmpty()) return

    const now = performance.now()
    if (this.nextFrameDueMs <= 0) {
      this.nextFrameDueMs = now
    }
    if (now + 0.25 < this.nextFrameDueMs) {
      return
    }
    this.nextFrameDueMs += this.frameIntervalMs
    if (now - this.nextFrameDueMs > this.frameIntervalMs * 4) {
      this.nextFrameDueMs = now + this.frameIntervalMs
    }

    const size = image.getSize()
    const frame =
      size.width === width && size.height === height
        ? image
        : image.resize({ width, height, quality: 'good' })

    if (this.ndiSender !== null) {
      try {
        this.ndiSender.sendFrame(frame.toBitmap())
        this.recordFrameTelemetry(frameStartedAt, width, height)
      } catch (err) {
        telemetryCounter('stream.output', 'ndi_send_errors')
        telemetryHealth('stream.output', 'error', 'NDI frame send error')
        if (!this.stopping) {
          this.setError(this.state.protocol, `NDI send error: ${toErrorMessage(err)}`)
        }
      }
      return
    }

    if (this.ffmpeg === null || this.ffmpeg.stdin === null) return
    if (
      this.ffmpegPipeErrored ||
      this.ffmpeg.stdin.destroyed ||
      this.ffmpeg.stdin.writable !== true ||
      this.ffmpeg.stdin.writableEnded === true
    ) {
      return
    }
    try {
      if (this.ffmpeg.stdin.writableLength > MAX_STDIN_QUEUE_BYTES) {
        telemetryCounter('stream.output', 'frame_dropped_backpressure')
        return
      }
      const bitmap = frame.toBitmap()
      this.ffmpeg.stdin.write(bitmap, (err) => {
        if (err) {
          this.handleFfmpegPipeError(
            this.state.protocol,
            `FFmpeg stdin write failed: ${err.message || String(err)}`
          )
        }
      })
      this.recordFrameTelemetry(frameStartedAt, width, height)
    } catch (err) {
      telemetryCounter('stream.output', 'frame_encode_errors')
      telemetryHealth('stream.output', 'error', 'Frame encode error')
      if (!this.stopping) {
        this.setError(this.state.protocol, `Frame encode error: ${String(err)}`)
      }
    }
  }

  private handleFfmpegPipeError(
    protocol: VisualizerStreamConfig['protocol'],
    message: string
  ) {
    if (this.ffmpegPipeErrored) {
      return
    }
    this.ffmpegPipeErrored = true
    telemetryCounter('stream.output', 'ffmpeg_pipe_errors')
    telemetryHealth('stream.output', 'error', message)
    if (!this.stopping) {
      this.setError(protocol, message)
    }
    this.cleanupProcess()
    this.stopFrameSubscription()
  }

  private setError(
    protocol: VisualizerStreamConfig['protocol'],
    message: string
  ): VisualizerStreamState {
    telemetryCounter('stream.output', 'errors')
    telemetryEvent('stream.output', 'error', 'error', message)
    this.state = {
      status: 'error',
      protocol,
      message,
    }
    return this.getState()
  }

  private recordFrameTelemetry(
    frameStartedAt: number,
    width: number,
    height: number
  ) {
    const now = performance.now()
    const frameMs = now - frameStartedAt
    telemetryDuration('stream.output', 'frame_pipeline_ms', frameMs)
    if (now >= this.nextTelemetryFrameSampleAtMs) {
      this.nextTelemetryFrameSampleAtMs = now + 1000
      telemetryGauge('stream.output', 'last_frame_pipeline_ms', frameMs, 'ms')
      telemetryGauge('stream.output', 'frame_width', width, 'px')
      telemetryGauge('stream.output', 'frame_height', height, 'px')
      telemetryGauge(
        'stream.output',
        'stdin_queue_bytes',
        this.ffmpeg?.stdin?.writableLength ?? 0,
        'bytes'
      )
    }
  }
}

function normalizeConfig(config: VisualizerStreamConfig): VisualizerStreamConfig {
  return {
    ...config,
    protocol: config.protocol === 'NDI' ? 'NDI' : 'RTSP',
    ffmpegPath:
      typeof config.ffmpegPath === 'string' && config.ffmpegPath.trim().length > 0
        ? config.ffmpegPath.trim()
        : 'auto',
    ndiRuntimePath:
      typeof config.ndiRuntimePath === 'string'
        ? config.ndiRuntimePath.trim()
        : '',
    fps: clampInt(config.fps, MIN_FPS, MAX_FPS, 30),
    bitrateKbps: clampInt(
      config.bitrateKbps,
      MIN_BITRATE_KBPS,
      MAX_BITRATE_KBPS,
      6000
    ),
    rtspUrl:
      typeof config.rtspUrl === 'string' && config.rtspUrl.trim().length > 0
        ? config.rtspUrl.trim()
        : 'rtsp://127.0.0.1:8554/captivate',
    rtspTransport: config.rtspTransport === 'udp' ? 'udp' : 'tcp',
    ndiName:
      typeof config.ndiName === 'string' && config.ndiName.trim().length > 0
        ? config.ndiName.trim()
        : 'Captivate Visualizer',
    ndiMuxer:
      typeof config.ndiMuxer === 'string' && config.ndiMuxer.trim().length > 0
        ? config.ndiMuxer.trim()
        : 'libndi_newtek',
  }
}

function buildRtspArgs(
  config: VisualizerStreamConfig,
  width: number,
  height: number
) {
  const listenUrl = toRtspListenUrl(config.rtspUrl)
  return [
    '-hide_banner',
    '-loglevel',
    'warning',
    '-f',
    'rawvideo',
    '-pix_fmt',
    'bgra',
    '-video_size',
    `${width}x${height}`,
    '-framerate',
    String(config.fps),
    '-i',
    'pipe:0',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-tune',
    'zerolatency',
    '-pix_fmt',
    'yuv420p',
    '-g',
    String(Math.max(2, config.fps * 2)),
    '-keyint_min',
    String(Math.max(2, config.fps)),
    '-b:v',
    `${config.bitrateKbps}k`,
    '-maxrate',
    `${config.bitrateKbps}k`,
    '-bufsize',
    `${config.bitrateKbps * 2}k`,
    '-f',
    'rtsp',
    '-rtsp_flags',
    'listen',
    '-rtsp_transport',
    config.rtspTransport,
    listenUrl,
  ]
}

function buildNdiArgs(
  config: VisualizerStreamConfig,
  width: number,
  height: number
) {
  return [
    '-hide_banner',
    '-loglevel',
    'warning',
    '-f',
    'rawvideo',
    '-pix_fmt',
    'bgra',
    '-video_size',
    `${width}x${height}`,
    '-framerate',
    String(config.fps),
    '-i',
    'pipe:0',
    '-an',
    '-pix_fmt',
    'uyvy422',
    '-f',
    config.ndiMuxer,
    config.ndiName,
  ]
}

function clampInt(value: number, min: number, max: number, fallback: number) {
  const next = Number.isFinite(value) ? Math.round(value) : fallback
  return Math.min(max, Math.max(min, next))
}

function clampEven(value: number, min: number, max: number) {
  let next = clampInt(value, min, max, min)
  if (next % 2 !== 0) {
    next = Math.max(min, next - 1)
  }
  return next
}

function toErrorMessage(err: unknown) {
  if (err instanceof Error && err.message.length > 0) {
    return err.message
  }
  return String(err)
}

function toRtspListenUrl(url: string) {
  try {
    const parsed = new URL(url)
    if (
      parsed.protocol === 'rtsp:' &&
      (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')
    ) {
      parsed.hostname = '0.0.0.0'
      return parsed.toString()
    }
  } catch (_err) {}
  return url
}
