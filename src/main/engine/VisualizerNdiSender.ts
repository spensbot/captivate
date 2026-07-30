import { existsSync } from 'fs'
import { getKoffi } from './koffiNative'
import { applyNdiRuntimeEnv } from './visualizerStreamingRuntime'

const NDI_FOURCC_BGRA = 1095911234
const NDI_FRAME_FORMAT_PROGRESSIVE = 1

let ndiStructsRegistered = false

function ensureNdiStructs() {
  if (ndiStructsRegistered) {
    return
  }
  const koffi = getKoffi()
  koffi.struct('NDIlib_send_create_t', {
    p_ndi_name: 'const char *',
    p_groups: 'const char *',
    clock_video: 'bool',
    clock_audio: 'bool',
  })
  koffi.struct('NDIlib_video_frame_v2_t', {
    xres: 'int',
    yres: 'int',
    FourCC: 'uint32_t',
    frame_rate_N: 'int',
    frame_rate_D: 'int',
    picture_aspect_ratio: 'float',
    frame_format_type: 'int',
    timecode: 'int64_t',
    p_data: 'uint8_t *',
    line_stride_in_bytes: 'int',
    p_metadata: 'const char *',
    timestamp: 'int64_t',
  })
  ndiStructsRegistered = true
}

type NdiInitializeFn = () => number
type NdiDestroyFn = () => void
type NdiVersionFn = () => string
type NdiSendCreateFn = (createSettings: unknown) => unknown
type NdiSendDestroyFn = (sendInstance: unknown) => void
type NdiSendVideoV2Fn = (sendInstance: unknown, frame: unknown) => void

interface SenderConfig {
  libraryPath: string
  configuredRuntimePath: string
  sourceName: string
  width: number
  height: number
  fps: number
}

export default class VisualizerNdiSender {
  private readonly sourceName: string
  private readonly width: number
  private readonly height: number
  private readonly fps: number
  private readonly ndiInitialize: NdiInitializeFn
  private readonly ndiDestroy: NdiDestroyFn
  private readonly ndiVersion: NdiVersionFn
  private readonly ndiSendCreate: NdiSendCreateFn
  private readonly ndiSendDestroy: NdiSendDestroyFn
  private readonly ndiSendVideoV2: NdiSendVideoV2Fn
  private initialized = false
  private sendInstance: unknown = null

  constructor(config: SenderConfig) {
    if (!existsSync(config.libraryPath)) {
      throw new Error(`NDI runtime library not found at "${config.libraryPath}"`)
    }

    applyNdiRuntimeEnv(config.configuredRuntimePath)

    ensureNdiStructs()
    const lib = getKoffi().load(config.libraryPath)
    this.ndiInitialize = lib.func('int NDIlib_initialize(void)') as NdiInitializeFn
    this.ndiDestroy = lib.func('void NDIlib_destroy(void)') as NdiDestroyFn
    this.ndiVersion = lib.func('const char * NDIlib_version(void)') as NdiVersionFn
    this.ndiSendCreate = lib.func(
      'void * NDIlib_send_create(const NDIlib_send_create_t * p_create_settings)'
    ) as NdiSendCreateFn
    this.ndiSendDestroy = lib.func(
      'void NDIlib_send_destroy(void * p_instance)'
    ) as NdiSendDestroyFn
    this.ndiSendVideoV2 = lib.func(
      'void NDIlib_send_send_video_v2(void * p_instance, const NDIlib_video_frame_v2_t * p_video_data)'
    ) as NdiSendVideoV2Fn

    this.sourceName = config.sourceName
    this.width = config.width
    this.height = config.height
    this.fps = Math.max(1, Math.round(config.fps))
  }

  start() {
    const initialized = this.ndiInitialize()
    if (!initialized) {
      throw new Error('NDI SDK failed to initialize')
    }
    this.initialized = true

    const sendCreate = {
      p_ndi_name: this.sourceName,
      p_groups: null,
      clock_video: false,
      clock_audio: false,
    }

    this.sendInstance = this.ndiSendCreate(sendCreate)
    if (this.sendInstance === null) {
      this.stop()
      throw new Error('Failed to create NDI sender instance')
    }
  }

  stop() {
    if (this.sendInstance !== null) {
      try {
        this.ndiSendDestroy(this.sendInstance)
      } catch (_err) {}
      this.sendInstance = null
    }

    if (this.initialized) {
      try {
        this.ndiDestroy()
      } catch (_err) {}
      this.initialized = false
    }
  }

  sendFrame(frameBuffer: Buffer) {
    if (this.sendInstance === null) return
    const expectedMinBytes = this.width * this.height * 4
    if (frameBuffer.byteLength < expectedMinBytes) {
      return
    }

    const frame = {
      xres: this.width,
      yres: this.height,
      FourCC: NDI_FOURCC_BGRA,
      frame_rate_N: this.fps,
      frame_rate_D: 1,
      picture_aspect_ratio:
        this.height > 0 ? this.width / this.height : 1,
      frame_format_type: NDI_FRAME_FORMAT_PROGRESSIVE,
      timecode: 0,
      p_data: frameBuffer,
      line_stride_in_bytes: this.width * 4,
      p_metadata: null,
      timestamp: 0,
    }
    this.ndiSendVideoV2(this.sendInstance, frame)
  }

  getVersion() {
    if (!this.initialized) {
      return null
    }
    try {
      return this.ndiVersion()
    } catch (_err) {
      return null
    }
  }
}
