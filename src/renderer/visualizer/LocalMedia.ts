import * as THREE from 'three'
import VisualizerBase, { UpdateResource } from './VisualizerBase'
import { getVideo, pathUrl, releaseVideo, getImageTexture } from './loaders'

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

export default class LocalMedia extends VisualizerBase {
  readonly type = t
  config: LocalMediaConfig
  video: HTMLVideoElement | null = null
  light: THREE.AmbientLight
  canvas: THREE.Mesh
  activeIndex: number = 0
  activeImageIndex: number = 0

  constructor(config: LocalMediaConfig) {
    super()
    this.config = initLocalMediaConfig()
    console.log('this.config.paths', this.config.paths)
    const geometry = new THREE.BoxGeometry(7, 4, 4)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    })
    this.canvas = new THREE.Mesh(geometry, material)
    this.light = new THREE.AmbientLight(0xffffff, 1)
    this.scene.add(this.canvas)
    this.scene.add(this.light)
    this.loadNextVideo()
  }

  loadNextVideo() {
    const path = this.config.paths[this.activeIndex]

    this.activeIndex += 1
    if (this.activeIndex >= this.config.paths.length) {
      this.activeIndex = 0
    }

    getVideo(pathUrl(path))
      .then((video) => {
        if (this.video) releaseVideo(this.video)
        if (this.video) this.video.remove()
        this.video = video
        const videoTexture = new THREE.VideoTexture(video)
        this.canvas.material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          map: videoTexture,
        })
      })
      .catch((err) => console.error('Video Error', err))
  }

  loadNextImage() {
    const path = this.config.imagePaths[this.activeImageIndex]

    this.activeImageIndex += 1
    if (this.activeImageIndex >= this.config.imagePaths.length) {
      this.activeImageIndex = 0
    }
    getImageTexture(pathUrl(path))
      .then((imageTexture) => {
        this.canvas.material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          map: imageTexture,
        })
      })
      .catch((err) => console.error('Image Error', err))
  }

  update(_dt: number, res: UpdateResource) {
    // const d = dt / 10000
    // this.canvas.rotation.y += d
    if (res.isNewPeriod(2)) {
      this.loadNextImage()
    }
  }

  release() {
    if (this.video) releaseVideo(this.video)
  }
}
