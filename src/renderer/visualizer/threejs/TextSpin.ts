import * as THREE from 'three'
import VisualizerBase, { UpdateResource } from './VisualizerBase'
import {
  textMesh,
  TextMesh_t,
  textMesh_release,
  textOutline,
  TextOutline_t,
  textOutline_release,
} from './text'
import { Spin, Wobble, Strobe } from './animations'
import { colorFromHSV } from './util'

const TEXT = 'FEEL\nWITH\nME'
const SIZE = 1

export default class TextSpin extends VisualizerBase {
  private text: TextMesh_t
  private outline: TextOutline_t
  private spin: Spin = new Spin()
  private wobble: Wobble = new Wobble()
  private strobe: Strobe = new Strobe()

  constructor() {
    super()

    this.text = textMesh(
      TEXT,
      SIZE,
      'helvetiker_bold',
      new THREE.MeshBasicMaterial()
    )

    this.outline = textOutline(
      TEXT,
      SIZE,
      'helvetiker_bold',
      new THREE.MeshBasicMaterial()
    )
    this.scene.add(this.text.mesh)
    this.scene.add(this.outline.group)
  }

  update(dt: number, { params, scene }: UpdateResource): void {
    const epicness = scene.epicness
    this.text.mesh.rotation.y = this.spin.update(dt, epicness)
    const color = colorFromHSV(
      params.hue,
      params.saturation * 1,
      params.brightness *
        (epicness / 2 + 0.5) *
        this.strobe.update(dt, params.strobe)
    )
    this.text.material = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
    })
    this.outline.group.rotation.y = this.wobble.update(dt, epicness)
  }

  dispose() {
    textMesh_release(this.text)
    textOutline_release(this.outline)
  }
}
