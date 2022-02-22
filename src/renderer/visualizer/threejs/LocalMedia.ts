import * as THREE from 'three'
import VisualizerBase, { UpdateResource } from './VisualizerBase'
import { loadVideo, pathUrl, releaseVideo, loadImage } from './loaders'
import LoadQueue from './LoadQueue'
import { randomRanged, randomIndexExcludeCurrent } from '../../../shared/util'

export type OrderType = 'Random' | 'Ordered'
export const orderTypes: OrderType[] = ['Ordered', 'Random']

export type ObjectFit = 'Cover' | 'Fit'
export const objectFits: ObjectFit[] = ['Cover', 'Fit']

export interface LocalMediaConfig {
  type: 'LocalMedia'
  order: OrderType
  objectFit: ObjectFit
  paths: string[]
}

const videoExtensions = new Set(['mp4'])
const base = '/Users/spensersaling/Movies/videos/'
const getVideos = () => [
  'balloons.mp4',
  'bonfire.mp4',
  'cowboy.mp4',
  // 'desert woman.mp4',
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
const images: string[] = [
  'blue_city.jpg',
  'city.jpg',
  'forest.jpg',
  'hills.jpg',
  'love.jpg',
  'moon.jpg',
  'mountains.jpg',
  'old_city.jpg',
  'plane.jpg',
  'rave.jpg',
  'rose.jpg',
  'snow.jpg',
  'snowfall.jpg',
  'waterfall.jpg',
]
const imagePaths = images.map((filename) => imageBase + filename)
const paths = videoPaths.concat(imagePaths)

export function initLocalMediaConfig(): LocalMediaConfig {
  return {
    type: 'LocalMedia',
    paths: paths,
    order: 'Random',
    objectFit: 'Cover',
  }
}

interface MediaDataBase {
  width: number
  height: number
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

// All instances of LocalMedia share a LoadQueue. Only one should exist at a time.
// In effect, this allows subsequent LocalMedia visualizers to display immediately & on-demand
//   at the expense of the first media being from the previously active LocalMedia visualizer.
let sharedQueue: LoadQueue<MediaData> | null = null

export default class LocalMedia extends VisualizerBase {
  readonly type = 'LocalMedia'
  config: LocalMediaConfig
  displayPlane: THREE.PlaneGeometry
  mesh: THREE.Mesh
  index: number = 0

  constructor(config: LocalMediaConfig) {
    super()
    this.config = initLocalMediaConfig()
    this.displayPlane = new THREE.PlaneGeometry(1, 1)
    this.mesh = new THREE.Mesh(
      this.displayPlane,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      })
    )
    this.scene.add(this.mesh)
    if (sharedQueue === null) {
      sharedQueue = new LoadQueue<MediaData>(
        3,
        () => this.loadNext(),
        releaseMediaData,
        (mediaData) => {
          this.mesh.material = mediaData.material
        }
      )
    } else {
      sharedQueue.reset(
        () => this.loadNext(),
        (mediaData) => {
          this.mesh.material = mediaData.material
        }
      )
    }
  }

  async loadNext(): Promise<MediaData> {
    const path = this.config.paths[this.index]
    if (this.config.order === 'Random') {
      this.index = randomIndexExcludeCurrent(
        this.config.paths.length,
        this.index
      )
    } else {
      this.index += 1
      if (this.index >= this.config.paths.length) {
        this.index = 0
      }
    }

    const mediaType = getMediaType(path)
    if (mediaType === 'image') {
      const {
        texture,
        bitmap: { width, height },
      } = await loadImage(pathUrl(path))
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: texture,
      })
      return {
        type: 'image',
        texture,
        material,
        width,
        height,
      }
    } else if (mediaType === 'video') {
      const video = await loadVideo(pathUrl(path))
      video.currentTime = randomStartTime(video.duration)
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
        width: video.width,
        height: video.height,
      }
    }
    throw Error(`Bad File Extension: ${path}`)
  }

  update(_dt: number, res: UpdateResource) {
    // const d = dt / 10000
    // this.mesh.rotation.y += d
    if (res.isNewPeriod(2)) {
      if (sharedQueue !== null) {
        const mediaData = sharedQueue.getNext()
        if (mediaData) {
          this.mesh.material = mediaData.material
          this.adjustDisplay(mediaData.width, mediaData.height)
        } else {
          console.warn('loadQueue empty on request')
        }
      } else {
        console.error(
          `LocalMedia sharedQueue is null... That shouldn't be possible`
        )
      }
    }
  }

  adjustDisplay(textureWidth: number, textureHeight: number) {
    if (textureWidth === 0 || textureHeight === 0) return
    this.mesh.geometry.dispose()
    let width = 7
    let height = 7
    const textureAR = textureWidth / textureHeight
    const displayAR = this.camera.aspect
    const visible = this.visibleSizeAtZ(0)
    if (textureAR > displayAR) {
      // Too Wide
      if (this.config.objectFit === 'Cover') {
        height = visible.height
        width = height * textureAR
      } else if (this.config.objectFit === 'Fit') {
        width = visible.width
        height = width / textureAR
      }
    } else {
      // Too Tall
      if (this.config.objectFit === 'Cover') {
        width = visible.width
        height = width / textureAR
      } else if (this.config.objectFit === 'Fit') {
        height = visible.height
        width = height * textureAR
      }
    }
    this.mesh.geometry = new THREE.PlaneGeometry(width, height)
  }

  // resize(width: number, height: number) {
  //   super.resize(width, height)
  //   this.adjustDisplay(this.)
  // }

  dispose() {
    this.displayPlane.dispose()
  }
}

const MIN_PLAY_TIME = 5 // seconds
function randomStartTime(duration: number) {
  if (duration === NaN || duration < MIN_PLAY_TIME) {
    return 0
  } else {
    return randomRanged(0, duration - MIN_PLAY_TIME)
  }
}
