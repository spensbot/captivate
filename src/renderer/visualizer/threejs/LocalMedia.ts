import * as THREE from 'three'
import VisualizerBase, { UpdateResource } from './VisualizerBase'
import { getVideo, pathUrl, releaseVideo, getImageTexture } from './loaders'
import LoadQueue from './LoadQueue'

const t = 'LocalMedia'

export interface LocalMediaConfig {
  type: 'LocalMedia'
  paths: string[]
  imagePaths: string[]
}

const videoExtensions = new Set(['mp4'])
const base = '/Users/spensersaling/Movies/videos/'
const getVideos = () => [
  'balloons.mp4',
  'bonfire.mp4',
  'cowboy.mp4',
  'desert woman.mp4',
  'fern.mp4',
  'forest.mp4',
  'forest2.mp4',
  'particles.mp4',
  'sailing.mp4',
  'rain slowmo.mp4',
  'small fire.mp4',
  'smoke.mp4',
  'space.mp4',
  'sunset couple.mp4',
  'wheat.mp4',
  'wheat2.mp4',
  'woman in field.mp4',
]
const videoPaths = getVideos().map((filename) => base + filename)

const imageExtensions = new Set(['jpg', 'jpeg'])
const imageBase = `/Users/spensersaling/Pictures/`
const images = [
  // 'blue_city.jpg',
  // 'city.jpg',
  // 'forest.jpg',
  // 'hills.jpg',
  // 'love.jpg',
  // 'moon.jpg',
  // 'mountains.jpg',
  // 'old_city.jpg',
  // 'plane.jpg',
  // 'rave.jpg',
  // 'rose.jpg',
  // 'snow.jpg',
  // 'snowfall.jpg',
  // 'waterfall.jpg',
]
const imagePaths = images.map((filename) => imageBase + filename)
const paths = videoPaths.concat(imagePaths)

export function initLocalMediaConfig(): LocalMediaConfig {
  return {
    type: t,
    paths: paths,
    imagePaths: imagePaths,
  }
}

interface VideoData {
  type: 'video'
  video: HTMLVideoElement
  texture: THREE.VideoTexture
  material: THREE.MeshBasicMaterial
}

interface ImageData {
  type: 'image'
  texture: THREE.CanvasTexture
  material: THREE.MeshBasicMaterial
}

type MediaData = VideoData | ImageData

type MediaType = MediaData['type']

function getExtension(filename: string): string {
  const parts = filename.split('.')
  return parts[parts.length - 1]
}

function getMediaType(filename: string): MediaType | null {
  const ext = getExtension(filename)
  return imageExtensions.has(ext)
    ? 'image'
    : videoExtensions.has(ext)
    ? 'video'
    : null
}

function releaseMediaData(data: MediaData) {
  if (data.type === 'video') {
    releaseVideo(data.video)
  }
  data.material.dispose()
  data.texture.dispose()
}

export default class LocalMedia extends VisualizerBase {
  readonly type = t
  config: LocalMediaConfig
  mesh: THREE.Mesh
  index: number = 0
  queue: LoadQueue<MediaData>

  constructor(config: LocalMediaConfig) {
    super()
    this.config = initLocalMediaConfig()
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(7, 4, 4),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      })
    )
    this.scene.add(this.mesh)
    this.queue = new LoadQueue<MediaData>(
      3,
      () => this.loadNext(),
      releaseMediaData,
      (videoData) => {
        this.mesh.material = videoData.material
      }
    )
  }

  async loadNext(): Promise<MediaData> {
    const path = this.config.paths[this.index]
    this.index += 1
    if (this.index >= this.config.paths.length) {
      this.index = 0
    }

    const mediaType = getMediaType(path)
    if (mediaType === 'image') {
      const texture = await getImageTexture(pathUrl(path))
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: texture,
      })
      return {
        type: 'image',
        texture,
        material,
      }
    } else if (mediaType === 'video') {
      const video = await getVideo(pathUrl(path))
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
      }
    }
    throw Error(`Bad File Extension: ${path}`)
  }

  update(_dt: number, res: UpdateResource) {
    // const d = dt / 10000
    // this.mesh.rotation.y += d
    if (res.isNewPeriod(2)) {
      const mediaData = this.queue.getNext()
      if (mediaData) {
        this.mesh.material = mediaData.material
      }
    }
  }

  release() {
    this.queue.release()
  }
}
