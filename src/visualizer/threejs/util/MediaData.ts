import * as THREE from 'three'
import { loadVideo, releaseVideo, loadImage } from './loaders'
import { imageExtensions, videoExtensions } from '../layers/LocalMediaConfig'
import { Size } from '../../../math/size'

interface MediaDataBase {
  size: Size
}

interface VideoData extends MediaDataBase {
  type: 'video'
  video: HTMLVideoElement
  texture: THREE.VideoTexture
  material: THREE.MeshBasicMaterial
}

interface ImageData extends MediaDataBase {
  type: 'image'
  texture: THREE.CanvasTexture
  material: THREE.MeshBasicMaterial
}

export type MediaData = VideoData | ImageData

type MediaType = MediaData['type']

function getExtension(filename: string): string {
  const parts = filename.split('.')
  return parts[parts.length - 1]
}

function getMediaType(filename: string): MediaType | null {
  const ext = getExtension(filename).toLowerCase()
  return imageExtensions.includes(ext)
    ? 'image'
    : videoExtensions.includes(ext)
    ? 'video'
    : null
}

export function releaseMediaData(data: MediaData) {
  if (data.type === 'video') {
    releaseVideo(data.video)
  }
  data.material.dispose()
  data.texture.dispose()
}

export async function getMediaData(src: string): Promise<MediaData> {
  const mediaType = getMediaType(src)
  if (mediaType === 'image') {
    return getImageData(src)
  } else if (mediaType === 'video') {
    return getVideoData(src)
  }
  throw Error(`Bad File Extension: ${src}`)
}

async function getImageData(src: string): Promise<ImageData> {
  const {
    texture,
    bitmap: { width, height },
  } = await loadImage(src)
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: texture,
  })
  return {
    type: 'image',
    texture,
    material,
    size: {
      width,
      height,
    },
  }
}

async function getVideoData(src: string): Promise<VideoData> {
  const video = await loadVideo(src)

  const texture = new THREE.VideoTexture(video)
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: texture,
  })
  return {
    type: 'video',
    video,
    texture,
    material,
    size: {
      width: video.videoWidth,
      height: video.videoHeight,
    },
  }
}
