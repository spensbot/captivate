import { Params } from '../../shared/params'
import { TimeState } from '../../shared/TimeState'
import { isNewPeriod } from '../../shared/TimeState'
import { LightScene_t } from '../../shared/Scenes'

interface UpdateData {
  time: TimeState
  params: Params
  scene: LightScene_t
  master: number
}

export default class UpdateResource {
  time: TimeState
  params: Params
  scene: LightScene_t
  master: number
  private lastBeats: number

  constructor(stuff: UpdateData) {
    this.time = stuff.time
    this.params = stuff.params
    this.scene = stuff.scene
    this.master = stuff.master
    this.lastBeats = this.time.beats
  }

  update(stuff: UpdateData) {
    this.lastBeats = this.time.beats
    this.time = stuff.time
    this.params = stuff.params
    this.scene = stuff.scene
    this.master = stuff.master
  }

  isNewPeriod(beatsPerPeriod: number) {
    return isNewPeriod(this.lastBeats, this.time.beats, beatsPerPeriod)
  }
}
