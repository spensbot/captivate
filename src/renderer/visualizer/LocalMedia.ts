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
const paths = getVideos().map((filename) => base + filename)

const imageBase = `/Users/spensersaling/Pictures/`
const images = [
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

export function initLocalMediaConfig(): LocalMediaConfig {
  return {
    type: t,
    paths: paths,
    imagePaths: imagePaths,
  }
}

interface VideoData {
  video: HTMLVideoElement
  videoTexture: THREE.VideoTexture
  videoMaterial: THREE.MeshBasicMaterial
}

function releaseVideoData(vd: VideoData) {
  releaseVideo(vd.video)
  vd.videoMaterial.dispose()
  vd.videoTexture.dispose()
}

export default class LocalMedia extends VisualizerBase {
  readonly type = t
  config: LocalMediaConfig
  light: THREE.AmbientLight
  mesh: THREE.Mesh
  vIndex: number = 0
  iIndex: number = 0
  vQueue: LoadQueue<VideoData>

  constructor(config: LocalMediaConfig) {
    super()
    this.config = initLocalMediaConfig()
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(7, 4, 4),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      })
    )
    this.light = new THREE.AmbientLight(0xffffff, 1)
    this.scene.add(this.mesh)
    this.scene.add(this.light)
    this.vQueue = new LoadQueue<VideoData>(
      3,
      () => this.getNextVideo(),
      releaseVideoData,
      (videoData) => {
        this.mesh.material = videoData.videoMaterial
      }
    )
  }

  async getNextVideo(): Promise<VideoData> {
    const path = this.config.paths[this.vIndex]

    this.vIndex += 1
    if (this.vIndex >= this.config.paths.length) {
      this.vIndex = 0
    }

    const video = await getVideo(pathUrl(path))
    const videoTexture = new THREE.VideoTexture(video)

    return {
      video: video,
      videoTexture: videoTexture,
      videoMaterial: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: videoTexture,
      }),
    }
  }

  loadNextImage() {
    const path = this.config.imagePaths[this.iIndex]

    this.iIndex += 1
    if (this.iIndex >= this.config.imagePaths.length) {
      this.iIndex = 0
    }
    getImageTexture(pathUrl(path))
      .then((imageTexture) => {
        this.mesh.material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          map: imageTexture,
        })
      })
      .catch((err) => console.error('Image Error', err))
  }

  update(_dt: number, res: UpdateResource) {
    // const d = dt / 10000
    // this.mesh.rotation.y += d
    if (res.isNewPeriod(2)) {
      const videoData = this.vQueue.getNext()
      if (videoData) {
        this.mesh.material = videoData.videoMaterial
      }
    }
  }

  release() {
    this.vQueue.release()
  }
}
