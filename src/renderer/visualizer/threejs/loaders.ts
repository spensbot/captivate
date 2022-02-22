import * as THREE from 'three'

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

// async function getImg(src: string) {
//   return await imageLoader.loadAsync(src)
// }

export async function loadImage(src: string) {
  // let canvas = document.createElement('canvas')
  // let context = canvas.getContext('2d')

  // if (context === null) return Promise.reject(`canvas.getContext("2d") failed`)

  // const img = await getImg(src)

  // context.drawImage(img, 0, 0, canvas.width, canvas.height)
  // return context.getImageData(0, 0, canvas.width, canvas.height)
  const bitmap = await getBitmap(src)
  const texture = new THREE.CanvasTexture(bitmap)
  return {
    texture,
    bitmap,
  }
}

// export async function getImageTexture(
//   src: string
// ): Promise<THREE.CanvasTexture> {
//   const img = await getImg(src)
//   return new THREE.CanvasTexture(img)
// }

export async function loadVideo(src: string) {
  const video = document.createElement('video')
  video.muted = true
  video.loop = true
  video.src = src
  await video.play()
  return video
}

export function releaseVideo(video: HTMLVideoElement) {
  video.pause()
  video.removeAttribute('src')
  video.load()
  video.remove()
}
