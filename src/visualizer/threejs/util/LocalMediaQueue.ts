import * as THREE from 'three'
import { pathUrl } from './loaders'
import LoadQueue from './LoadQueue'
import { randomIndexExcludeCurrent } from '../../../shared/util'
import no_media_image from '../../../../assets/no_media.png'
import { LocalMediaConfig } from '../layers/LocalMediaConfig'
import { Size, defaultSize, fit, cover } from '../../../math/size'
import { getMediaData, MediaData, releaseMediaData } from './MediaData'

const MIN_DELTA = 200 // ms

// let loadCount = 0
// let releaseCount = 0

// We can remove this once we figure out the illusive memory leak issue
// setInterval(
//   () => console.log(`Media loaded: ${loadCount} | released: ${releaseCount}`),
//   5000
// )

export default class LocalMediaQueue {
  private index: number = 0
  private mediaData: MediaData | null = null
  private mesh: THREE.Mesh
  private loadQueue: LoadQueue<MediaData>
  private config: LocalMediaConfig
  private size = defaultSize()
  private lastSwitch = 0

  constructor(config: LocalMediaConfig) {
    console.log(`LocalMediaQueue()`)
    this.config = config
    this.mesh = new THREE.Mesh(undefined, undefined)
    this.loadQueue = new LoadQueue<MediaData>(
      3,
      () => {
        return this.loadNext()
      },
      (data) => {
        releaseMediaData(data)
      },
      (mediaData) => this.updateMediaData(mediaData)
    )
  }

  updateConfig(config: LocalMediaConfig) {
    this.config = config
  }

  getMesh() {
    return this.mesh
  }

  private async loadNext(): Promise<MediaData> {
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
    const path = this.config.paths[this.index]
    if (path === undefined) {
      return await getMediaData(no_media_image)
    }
    return await getMediaData(pathUrl(path))
  }

  switch() {
    let delta = Date.now() - this.lastSwitch
    if (delta > MIN_DELTA) {
      let newMediaData = this.loadQueue.getNext()
      if (newMediaData !== null) {
        this.lastSwitch = Date.now()
        this.updateMediaData(newMediaData)
      }
    }
  }

  private updateMediaData(newMediaData: MediaData) {
    this.mediaData = newMediaData
    this.mesh.material = newMediaData.material
    this.resize(this.size)
  }

  resize(size: Size) {
    this.size = size

    if (this.mediaData) {
      this.mesh.geometry.dispose()

      let mediaSize = this.mediaData.size
      let planeSize =
        this.config.objectFit === 'Cover'
          ? cover(mediaSize, size)
          : fit(mediaSize, size)
      this.mesh.geometry = new THREE.PlaneGeometry(
        planeSize.width,
        planeSize.height
      )
    }
  }

  dispose() {
    this.mesh.geometry.dispose()
  }
}
