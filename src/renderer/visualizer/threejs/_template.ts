import * as THREE from 'three'
import VisualizerBase, { UpdateResource } from './VisualizerBase'

export interface Config {
  type: ''
}

export function initConfig(): Config {
  return {
    type: '',
  }
}

export default class LocalMedia extends VisualizerBase {
  readonly type = 'LocalMedia'

  constructor() {
    super()
  }

  update(dt: number, {}: UpdateResource) {}
}
