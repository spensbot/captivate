import { Params } from '../../../shared/params'
import { TimeState } from '../../../shared/TimeState'
import { isNewPeriod, beatsIn, beatsLeft } from '../../../shared/TimeState'
import { LightScene_t } from '../../scenes/shared/Scenes'
import { Size } from 'features/utils/math/size'
import { Range, rLerp } from 'features/utils/math/range'

interface UpdateData {
  dt: number
  time: TimeState
  params: Params
  scene: LightScene_t
  master: number
  size: Size
}

export default class UpdateResource {
  dt: number
  time: TimeState
  params: Params
  scene: LightScene_t
  master: number
  size: Size
  private lastBeats: number

  constructor(stuff: UpdateData) {
    this.dt = stuff.dt
    this.time = stuff.time
    this.params = stuff.params
    this.scene = stuff.scene
    this.master = stuff.master
    this.size = stuff.size
    this.lastBeats = this.time.beats
  }

  update(stuff: UpdateData) {
    this.dt = stuff.dt
    this.lastBeats = this.time.beats
    this.time = stuff.time
    this.params = stuff.params
    this.scene = stuff.scene
    this.master = stuff.master
    this.size = stuff.size
  }

  isNewPeriod(period: number) {
    return isNewPeriod(this.lastBeats, this.time.beats, period)
  }

  msPerPeriod(beatsPerPeriod: number) {
    return beatsPerPeriod / this.time.bpm * 60000
  }

  beatsIn(period: number) {
    return beatsIn(this.time.beats, period)
  }

  beatsLeft(period: number) {
    return beatsLeft(this.time.beats, period)
  }

  beatsPerFrame() {
    const minutesPerFrame = this.dt / 60000
    return minutesPerFrame * this.time.bpm
  }

  framesLeft(period: number) {
    return this.beatsLeft(period) / this.beatsPerFrame()
  }

  lerpEpicness(range: Range) {
    return rLerp(range, this.scene.epicness)
  }
}
