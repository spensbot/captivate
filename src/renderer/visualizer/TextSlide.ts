import * as THREE from 'three'
import { RealtimeState } from '../redux/realtimeStore'
import { ReduxState } from '../redux/store'
import VisualizerBase from './VisualizerBase'
import { textMesh, textOutlineMesh } from './text'
import { Spin, Wobble, Strobe, colorFromHSV } from './animations'

const TEXT = 'FEEL WITH ME'
const SIZE = 1

export default class TextSlide extends VisualizerBase {
  readonly type = 'Text'
  particle: THREE.Texture | null = null
  text: THREE.Mesh
  outline: THREE.Group
  spin: Spin = new Spin()
  wobble: Wobble = new Wobble()
  strobe: Strobe = new Strobe()

  constructor() {
    super()

    // this.scene.background = new THREE.Color(0x000000)

    const text = textMesh(
      TEXT,
      SIZE,
      'helvetiker_bold',
      new THREE.MeshBasicMaterial()
    )
    this.text = text.mesh
    const outline = textOutlineMesh(
      TEXT,
      SIZE,
      'helvetiker_bold',
      new THREE.MeshBasicMaterial()
    )
    this.outline = outline.group
    this.scene.add(this.text)
    this.scene.add(this.outline)
  }

  update(_rt: RealtimeState, _state: ReduxState): void {
    const dt = _rt.time.dt
    const params = _rt.outputParams
    const scenes = _state.scenes.present
    const bombacity = scenes.byId[scenes.active].bombacity
    this.text.rotation.y = this.spin.update(dt, bombacity)
    const color = colorFromHSV(
      params.hue,
      params.saturation * 1,
      params.brightness *
        (bombacity / 2 + 0.5) *
        this.strobe.update(dt, _rt.outputParams.strobe)
    )
    this.text.material = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
    })
    this.outline.rotation.y = this.wobble.update(dt, bombacity)
  }
}
