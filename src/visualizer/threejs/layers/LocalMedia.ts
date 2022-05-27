import LayerBase from './LayerBase'
import UpdateResource from '../UpdateResource'
import LocalMediaQueue from '../util/LocalMediaQueue'
import { LocalMediaConfig } from './LocalMediaConfig'

// All instances of LocalMedia share a LoadQueue. Only one should exist at a time.
// In effect, this allows subsequent LocalMedia visualizers to display immediately & on-demand
//   at the expense of the first media being from the previously active LocalMedia visualizer.
let sharedQueue: LocalMediaQueue | null = null

export default class LocalMedia extends LayerBase {
  readonly type = 'LocalMedia'
  config: LocalMediaConfig

  constructor(config: LocalMediaConfig) {
    super()
    if (sharedQueue === null) {
      sharedQueue = new LocalMediaQueue(config)
    }
    this.config = config
    sharedQueue.updateConfig(config)
    sharedQueue.switch()
    this.scene.add(sharedQueue.getMesh())
  }

  update(res: UpdateResource) {
    if (res.isNewPeriod(this.config.period)) {
      if (sharedQueue !== null) {
        sharedQueue.switch()
      } else {
        console.error(
          `LocalMedia sharedQueue is null... That shouldn't be possible`
        )
      }
    }
  }

  resize(width: number, height: number) {
    super.resize(width, height)
    if (sharedQueue) sharedQueue.resize(this.visibleSizeAtZ(0))
  }

  dispose() {
    // We don't need to dispose anything since the video queue sticks around for the life of the app
  }
}
