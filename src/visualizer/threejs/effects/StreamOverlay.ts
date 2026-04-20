import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import * as THREE from 'three'
import { Uniform } from 'three'
import streamOverlayVertex from '../shaders/StreamOverlay.vert'
import streamOverlayFragment from '../shaders/StreamOverlay.frag'
import { loadVideo, releaseVideo } from '../util/loaders'
import CustomPassShader from './CustomPassShader'
import EffectBase from './EffectBase'
import { StreamOverlayConfig, initStreamOverlayConfig } from './effectConfigs'
import ipcChannelsShared from '../../../shared/ipc_channels'
import {
  initVisualizerRelayRequest,
  VisualizerRelayRequest,
  VisualizerRelayStartResult,
} from '../../../shared/visualizerStreaming'

type StreamOverlayShader = CustomPassShader<{
  tDiffuse: Uniform
  streamTexture: Uniform
  hasStream: Uniform
  opacity: Uniform
}>

export class StreamOverlay extends EffectBase {
  config: StreamOverlayConfig
  shader: StreamOverlayShader
  pass: ShaderPass
  private video: HTMLVideoElement | null = null
  private streamImage: HTMLImageElement | null = null
  private texture: THREE.Texture | null = null
  private relayId: string | null = null
  private disposed = false

  constructor(config: StreamOverlayConfig) {
    super()
    this.config = {
      ...initStreamOverlayConfig(),
      ...config,
    }
    this.shader = {
      uniforms: {
        tDiffuse: new Uniform(null),
        streamTexture: new Uniform(null),
        hasStream: new Uniform(0),
        opacity: new Uniform(config.opacity),
      },
      vertexShader: streamOverlayVertex,
      fragmentShader: streamOverlayFragment,
    }
    this.pass = new ShaderPass(this.shader)

    const url = config.url.trim()
    if (url.length > 0) {
      this.loadStream(url)
    }
  }

  private async loadStream(url: string) {
    let target = url

    if (isRtspUrl(url)) {
      try {
        const relay = await startRelay(initVisualizerRelayRequest(url))
        if (this.disposed) {
          if (relay.relayId) {
            void stopRelay(relay.relayId)
          }
          return
        }
        this.relayId = relay.relayId
        target = relay.url
      } catch (err) {
        console.error(`Failed to start RTSP relay`, err)
        return
      }
    }

    if (isMjpegRelayUrl(target)) {
      await this.loadMjpegStream(target)
      return
    }

    try {
      const video = await loadVideo(target)
      if (this.disposed) {
        releaseVideo(video)
        return
      }

      const texture = new THREE.VideoTexture(video)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.generateMipmaps = false

      this.video = video
      this.texture = texture
      this.pass.uniforms.streamTexture.value = texture
      this.pass.uniforms.hasStream.value = 1
    } catch (err) {
      console.error(`Failed to load stream overlay video`, err)
    }
  }

  update() {
    this.pass.uniforms.opacity.value = this.config.opacity
    if (this.streamImage && this.texture) {
      this.texture.needsUpdate = true
    }
  }

  private async loadMjpegStream(url: string) {
    return await new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      const onLoad = () => {
        cleanup()
        if (this.disposed) {
          resolve()
          return
        }

        const texture = new THREE.Texture(img)
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.generateMipmaps = false
        texture.needsUpdate = true

        this.streamImage = img
        this.texture = texture
        this.pass.uniforms.streamTexture.value = texture
        this.pass.uniforms.hasStream.value = 1
        resolve()
      }

      const onError = () => {
        cleanup()
        reject(new Error(`Failed to load MJPEG relay stream`))
      }

      const cleanup = () => {
        img.removeEventListener('load', onLoad)
        img.removeEventListener('error', onError)
      }

      img.addEventListener('load', onLoad)
      img.addEventListener('error', onError)
      img.src = url
    }).catch((err) => {
      console.error(`Failed to load stream overlay MJPEG relay`, err)
      if (this.relayId) {
        void stopRelay(this.relayId)
        this.relayId = null
      }
    })
  }

  dispose() {
    this.disposed = true
    this.pass.uniforms.hasStream.value = 0
    this.pass.uniforms.streamTexture.value = null

    if (this.texture) {
      this.texture.dispose()
      this.texture = null
    }

    if (this.video) {
      releaseVideo(this.video)
      this.video = null
    }

    if (this.streamImage) {
      this.streamImage.src = ''
      this.streamImage = null
    }

    if (this.relayId) {
      void stopRelay(this.relayId)
      this.relayId = null
    }
  }
}

async function startRelay(req: VisualizerRelayRequest) {
  const invoke = getIpcInvoke()
  if (invoke === null) {
    throw new Error('Electron IPC is unavailable in this environment.')
  }
  return (await invoke(
    ipcChannelsShared.visualizer_stream_relay_start,
    req
  )) as VisualizerRelayStartResult
}

async function stopRelay(relayId: string) {
  const invoke = getIpcInvoke()
  if (invoke === null) {
    return
  }
  await invoke(ipcChannelsShared.visualizer_stream_relay_stop, relayId)
}

function getIpcInvoke() {
  if (typeof window === 'undefined') {
    return null
  }
  const maybeElectron = (window as any).electron
  const maybeInvoke = maybeElectron?.ipcRenderer?.invoke
  if (typeof maybeInvoke !== 'function') {
    return null
  }
  return maybeInvoke as (channel: string, ...args: any[]) => Promise<any>
}

function isRtspUrl(url: string) {
  const lower = url.toLowerCase()
  return lower.startsWith('rtsp://') || lower.startsWith('rtsps://')
}

function isMjpegRelayUrl(url: string) {
  return url.toLowerCase().endsWith('.mjpg')
}
