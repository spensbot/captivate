import * as THREE from 'three'
import { randomRanged } from '../../../../math/util'

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
  video.muted = true
  video.loop = true
  video.src = src
  let duration = await getDuration(video)
  video.currentTime = randomStartTime(duration)
  await video.play()
  return video
}

export function releaseVideo(video: HTMLVideoElement) {
  video.pause()
  video.removeAttribute('src')
  video.load()
  video.remove()
}

const MIN_PLAY_TIME = 5 // seconds
function randomStartTime(duration: number) {
  if (duration === NaN || duration < MIN_PLAY_TIME) {
    return 0
  } else {
    return randomRanged(0, duration - MIN_PLAY_TIME)
  }
}

async function getDuration(video: HTMLVideoElement): Promise<number> {
  return new Promise((resolve) => {
    video.addEventListener('durationchange', function listener() {
      video.removeEventListener('durationchange', listener)
      resolve(video.duration)
    })
  })
}
