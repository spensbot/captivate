import { Params } from '../../shared/params'
import { TimeState } from '../../shared/TimeState'
import { isNewPeriod, beatsIn, beatsLeft } from '../../shared/TimeState'
import { Size } from 'math/size'
import { Range, rLerp } from 'math/range'
import { AudioEngineMetrics } from '../../shared/audioEngine'

interface UpdateScene {
  epicness: number
}

interface UpdateData {
  dt: number
  time: TimeState
  params: Params
  scene: UpdateScene
  master: number
  size: Size
  audio: AudioEngineMetrics
}

export default class UpdateResource {
  dt: number
  time: TimeState
  params: Params
  scene: UpdateScene
  master: number
  size: Size
  audio: AudioEngineMetrics
  private lastBeats: number

  constructor(stuff: UpdateData) {
    this.dt = stuff.dt
    this.time = stuff.time
    this.params = stuff.params
    this.scene = stuff.scene
    this.master = stuff.master
    this.size = stuff.size
    this.audio = stuff.audio
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
    this.audio = stuff.audio
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
