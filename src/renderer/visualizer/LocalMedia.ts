import * as THREE from 'three'
import VisualizerBase, { UpdateResource } from './VisualizerBase'
import { getVideo, pathUrl } from './loaders'

const t = 'LocalMedia'

export interface LocalMediaConfig {
  type: 'LocalMedia'
  paths: string[]
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

export function initLocalMediaConfig(): LocalMediaConfig {
  return {
    type: t,
    paths: getVideos().map((filename) => base + filename),
  }
}

export default class LocalMedia extends VisualizerBase {
  readonly type = t
  config: LocalMediaConfig
  light: THREE.AmbientLight
  canvas: THREE.Mesh
  activeIndex: number = 0

  constructor(config: LocalMediaConfig) {
    super()
    this.config = config
    console.log(this.config.paths)
    const geometry = new THREE.BoxGeometry(6, 4, 4)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    })
    this.canvas = new THREE.Mesh(geometry, material)
    this.light = new THREE.AmbientLight(0xffffff, 1)
    this.scene.add(this.canvas)
    this.scene.add(this.light)
  }

  loadNextVideo() {
    const path = this.config.paths[this.activeIndex]

    this.activeIndex += 1
    if (this.activeIndex >= this.config.paths.length) {
      this.activeIndex = 0
    }

    getVideo(pathUrl(path))
      .then((video) => {
        const videoTexture = new THREE.VideoTexture(video)
        this.canvas.material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          map: videoTexture,
        })
      })
      .catch((err) => console.error('Video Error', err))
  }

  update(_dt: number, res: UpdateResource) {
    // const d = dt / 10000
    // this.canvas.rotation.y += d
    if (res.isNewPeriod(2)) {
      this.loadNextVideo()
    }
  }
}
