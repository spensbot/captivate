import * as THREE from 'three'
import { randomRanged } from '../../../math/util'

export function pathUrl(path: string) {
  return `file://` + path
}

const imageLoader = new THREE.ImageLoader()
imageLoader.setCrossOrigin('*')
const bitmapLoader = new THREE.ImageBitmapLoader()
bitmapLoader.setCrossOrigin('*')
bitmapLoader.setOptions({ imageOrientation: 'flipY' })

async function getBitmap(src: string) {
  return await bitmapLoader.loadAsync(src)
}

export async function loadImage(src: string) {
  const bitmap = await getBitmap(src)
  const texture = new THREE.CanvasTexture(bitmap)
  return {
    texture,
    bitmap,
  }
}

export async function loadVideo(src: string) {
  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.setAttribute('playsinline', '')
  video.muted = true
  video.loop = true
  video.autoplay = true
  video.src = src
  let duration = await getDuration(video)
  video.currentTime = randomStartTime(duration)
  await video.play()
  await awaitVisVideoReady(video)
  return video
}

/** Visualizer video: playing, non-zero size, enough buffer to paint (stricter for VOD than live). */
export function visVideoReady(video: HTMLVideoElement): boolean {
  if (video.paused || video.ended) {
    return false
  }
  if (video.videoWidth <= 0 || video.videoHeight <= 0) {
    return false
  }

  const vod =
    Number.isFinite(video.duration) &&
    !Number.isNaN(video.duration) &&
    video.duration > 0
  const minReady = vod
    ? HTMLMediaElement.HAVE_FUTURE_DATA
    : HTMLMediaElement.HAVE_CURRENT_DATA

  return video.readyState >= minReady
}

/**
 * Waits until {@link visVideoReady} holds, then one `requestVideoFrameCallback` when available
 * so WebGL has a decoded frame.
 */
export async function awaitVisVideoReady(
  video: HTMLVideoElement,
  timeoutMs = 20000
): Promise<void> {
  if (visVideoReady(video)) {
    await awaitVisVideoFrame(video, 4000)
    return
  }

  await new Promise<void>((resolve, reject) => {
    const started = Date.now()
    let raf: number | null = null

    const cleanup = () => {
      video.removeEventListener('loadeddata', onUpdate)
      video.removeEventListener('canplay', onUpdate)
      video.removeEventListener('playing', onUpdate)
      video.removeEventListener('canplaythrough', onUpdate)
      video.removeEventListener('progress', onUpdate)
      video.removeEventListener('resize', onUpdate)
      video.removeEventListener('timeupdate', onUpdate)
      video.removeEventListener('waiting', onUpdate)
      video.removeEventListener('error', onError)
      if (raf !== null) {
        cancelAnimationFrame(raf)
        raf = null
      }
    }

    const fail = (message: string) => {
      cleanup()
      reject(new Error(message))
    }

    const onError = () => {
      fail(video.error?.message ?? 'Video load error')
    }

    const scheduleCheck = () => {
      if (raf !== null) {
        return
      }
      raf = requestAnimationFrame(() => {
        raf = null
        onUpdate()
      })
    }

    const onUpdate = () => {
      if (Date.now() - started >= timeoutMs) {
        fail('Timed out waiting for video decode/buffer before playback')
        return
      }
      if (visVideoReady(video)) {
        cleanup()
        resolve()
        return
      }
      scheduleCheck()
    }

    video.addEventListener('loadeddata', onUpdate)
    video.addEventListener('canplay', onUpdate)
    video.addEventListener('playing', onUpdate)
    video.addEventListener('canplaythrough', onUpdate)
    video.addEventListener('progress', onUpdate)
    video.addEventListener('resize', onUpdate)
    video.addEventListener('timeupdate', onUpdate)
    video.addEventListener('waiting', onUpdate)
    video.addEventListener('error', onError)
    onUpdate()
  })

  await awaitVisVideoFrame(video, 4000)
}

/** One `requestVideoFrameCallback` tick (no-op if unsupported). */
async function awaitVisVideoFrame(
  video: HTMLVideoElement,
  frameWaitMs: number
): Promise<void> {
  const anyVideo = video as HTMLVideoElement & {
    requestVideoFrameCallback?: (cb: (now: number, metadata: unknown) => void) => number
  }
  if (typeof anyVideo.requestVideoFrameCallback !== 'function') {
    return
  }
  await new Promise<void>((resolve) => {
    const timer = window.setTimeout(() => resolve(), frameWaitMs)
    anyVideo.requestVideoFrameCallback!(() => {
      window.clearTimeout(timer)
      resolve()
    })
  })
}

export function releaseVideo(video: HTMLVideoElement) {
  video.pause()
  video.removeAttribute('src')
  video.load()
  video.remove()
}

const MIN_PLAY_TIME = 5 // seconds
function randomStartTime(duration: number) {
  if (Number.isNaN(duration) || duration < MIN_PLAY_TIME) {
    return 0
  } else {
    return randomRanged(0, duration - MIN_PLAY_TIME)
  }
}

async function getDuration(video: HTMLVideoElement): Promise<number> {
  if (video.readyState >= 1 && Number.isFinite(video.duration)) {
    return video.duration
  }

  return new Promise((resolve) => {
    const onLoadedMetadata = () => {
      cleanup()
      resolve(video.duration)
    }

    const onDurationChange = () => {
      if (!Number.isFinite(video.duration)) return
      cleanup()
      resolve(video.duration)
    }

    const onError = () => {
      cleanup()
      resolve(0)
    }

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('durationchange', onDurationChange)
      video.removeEventListener('error', onError)
    }

    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('durationchange', onDurationChange)
    video.addEventListener('error', onError)
  })
}
