import * as THREE from 'three'
import { RealtimeState } from '../redux/realtimeStore'

export default class VisualizerBase {
  resize(width: number, height: number) {}

  update() {}

  getRenderData() {}
}
