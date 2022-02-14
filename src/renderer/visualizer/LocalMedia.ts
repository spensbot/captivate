import * as THREE from 'three'
import VisualizerBase, { UpdateResource } from './VisualizerBase'

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

function pathUrl(path: string) {
  return `file://` + path
}

export function initLocalMediaConfig(): LocalMediaConfig {
  return {
    type: t,
    paths: getVideos().map((filename) => base + filename),
  }
}

export default class LocalMedia extends VisualizerBase {
  readonly type = t
  config: LocalMediaConfig
  video: HTMLVideoElement
  videoTex: THREE.VideoTexture
  light: THREE.AmbientLight
  canvas: THREE.Mesh
  activeIndex: number = 0

  constructor(config: LocalMediaConfig) {
    super()
    this.config = config
    this.video = document.createElement('video')
    this.videoTex = new THREE.VideoTexture(this.video)
    this.video.muted = true
    this.video.loop = true
    const geometry = new THREE.BoxGeometry(6, 4, 4)
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: this.videoTex,
    })
    this.canvas = new THREE.Mesh(geometry, material)
    this.light = new THREE.AmbientLight(0xffffff, 1)
    this.scene.add(this.canvas)
    this.scene.add(this.light)
    console.log(this.config.paths)
    this.loadNextVideo()
  }

  loadNextVideo() {
    const path = this.config.paths[this.activeIndex]
    if (path !== undefined) {
      try {
        console.log(path)
        const src = pathUrl(path)
        // const source = document.createElement('source')
        // source.onerror = (e) => {
        //   console.log(e)
        // }
        // source.src = src
        // source.type = 'video/mp4'
        // this.video.innerHTML = ''
        // this.video.appendChild(source)
        this.video.src = src
        this.video.onerror = (e) => {
          console.log('Video Error: ', e)
        }
        this.video
          .play()
          .then()
          .catch((err) => {
            console.error('Video Error: ', err)
          })
        this.video.onload = (e) => {
          console.log('video load', e)
        }
      } catch (err) {
        console.error('cannot find video: ', path)
      }
    }

    this.activeIndex += 1
    if (this.activeIndex >= this.config.paths.length) {
      this.activeIndex = 0
    }
  }

  update(dt: number, res: UpdateResource) {
    const d = dt / 10000
    // this.canvas.rotation.y += d
    if (res.isNewPeriod(2)) {
      this.loadNextVideo()
    }
  }
}
