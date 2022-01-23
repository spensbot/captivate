import * as THREE from 'three'
import { RealtimeState } from '../redux/realtimeStore'
import { ReduxState } from '../redux/store'
import VisualizerBase from './VisualizerBase'

export default class _ extends VisualizerBase {
  readonly type = '_'

  constructor() {
    super()
  }

  update(rt: RealtimeState, _state: ReduxState): void {}
}
