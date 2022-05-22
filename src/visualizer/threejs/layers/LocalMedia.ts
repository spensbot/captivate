import * as THREE from 'three'
import LayerBase from './LayerBase'
import { loadVideo, pathUrl, releaseVideo, loadImage } from '../util/loaders'
import LoadQueue from '../util/LoadQueue'
import { randomRanged, randomIndexExcludeCurrent } from '../../../shared/util'
import UpdateResource from '../UpdateResource'
import no_media_image from '../../../../assets/no_media.png'
import {
  imageExtensions,
  videoExtensions,
  LocalMediaConfig,
} from './LocalMediaConfig'

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

export default class LocalMedia extends LayerBase {
  readonly type = 'LocalMedia'
  config: LocalMediaConfig
  displayPlane: THREE.PlaneGeometry
  mesh: THREE.Mesh
  index: number = 0
  lastMediaData: MediaData | null = null

  constructor(config: LocalMediaConfig) {
    super()
    this.config = config
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
        (mediaData) => this.updateMediaData(mediaData)
      )
    } else {
      sharedQueue.reset(
        () => this.loadNext(),
        (mediaData) => this.updateMediaData(mediaData)
      )
    }
  }

  async loadNext(): Promise<MediaData> {
    const path = this.config.paths[this.index]
    if (path === undefined) {
      const {
        texture,
        bitmap: { width, height },
      } = await loadImage(no_media_image)
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
    }
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
        width: video.videoWidth,
        height: video.videoHeight,
      }
    }
    throw Error(`Bad File Extension: ${path}`)
  }

  update(_dt: number, res: UpdateResource) {
    // const d = dt / 10000
    // this.mesh.rotation.y += d
    if (res.isNewPeriod(this.config.period)) {
      if (sharedQueue !== null) {
        const mediaData = sharedQueue.getNext()
        if (mediaData) {
          this.updateMediaData(mediaData)
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

  updateMediaData(newMediaData: MediaData) {
    this.lastMediaData = newMediaData
    this.mesh.material = newMediaData.material
    this.adjustDisplay(newMediaData.width, newMediaData.height)
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

  resize(width: number, height: number) {
    super.resize(width, height)
    if (this.lastMediaData) {
      this.adjustDisplay(this.lastMediaData.width, this.lastMediaData.height)
    }
  }

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
