import * as THREE from 'three'
import LayerBase from './LayerBase'
import {
  textMesh,
  TextMesh_t,
  textMesh_release,
  textOutline,
  TextOutline_t,
  textOutline_release,
} from '../util/text'
import { Spin, Wobble, Strobe } from '../util/animations'
import { colorFromHSV } from '../util/util'
import UpdateResource from '../UpdateResource'
import { TextSpinConfig } from './TextSpinConfig'
import { mapFn } from 'shared/util'

const mapSize = mapFn(1.2, { min: 0.1, max: 2 })

export default class TextSpin extends LayerBase {
  private text: TextMesh_t
  private outline: TextOutline_t
  private spin: Spin = new Spin()
  private wobble: Wobble = new Wobble()
  private strobe: Strobe = new Strobe()

  constructor(config: TextSpinConfig) {
    super()

    const size = mapSize(config.size)

    this.text = textMesh(
      config.text,
      size,
      'helvetiker_bold',
      new THREE.MeshBasicMaterial()
    )

    this.outline = textOutline(
      config.text,
      size,
      'helvetiker_bold',
      new THREE.MeshBasicMaterial()
    )
    this.scene.add(this.text.mesh)
    this.scene.add(this.outline.group)
  }

  update({ dt, params, scene }: UpdateResource): void {
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
