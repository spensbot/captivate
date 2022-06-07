import * as THREE from 'three'
import {Vector3} from 'three'
import LayerBase from './LayerBase'
import UpdateResource from '../UpdateResource'
import { zeroArray } from '../../../shared/util'
// import { Range } from '../../../math/range'

// const Y_RANGE: Range = {
//   min: -7,
//   max: 3
// } // units
const STEP = 0.5 // units
const RADIANS = Math.PI/2
const RADIUS = 100 // units

const radiansPerStep = STEP / RADIUS


export interface RunConfig {
  type: 'Run'
}

export function initRunConfig(): RunConfig {
  return {
    type: 'Run'
  }
}

export default class Run extends LayerBase {
  // private config: RunConfig
  private material = new THREE.LineDashedMaterial({ color: 0x00ff00, linewidth: 5})
  private line: THREE.Line

  constructor(_config: RunConfig) {
    super()
    this.line = section(this.material)
    this.scene.add(this.line)
    // this.config = config
  }

  update({}: UpdateResource): void {
    firstRow()
  }

  dispose() {
    this.line.geometry.dispose()
    this.material.dispose()
  }
}

function section(mat: THREE.Material) {
  const points = []
  points.push(new THREE.Vector3(-1, 0, 0))
  points.push(new THREE.Vector3(1, 0, 0))
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  return new THREE.Line(geo, mat)
}

function firstRow(): Vector3[] {
  const n = Math.floor(RADIANS / radiansPerStep)
  

  return zeroArray(n).map(_ => new THREE.Vector3(0,))
}