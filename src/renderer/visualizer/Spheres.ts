import * as THREE from 'three'
import { RealtimeState } from '../redux/realtimeStore'
import { ReduxState } from '../redux/store'
import VisualizerBase from './VisualizerBase'
import { random } from '../../util/util'
import { isNewPeriod } from '../../engine/TimeState'
import { Skew } from '../../engine/oscillator'
import { Strobe, colorFromHSV } from './animations'

const RADIUS = 2
const ARRAY = Array(50).fill(0)
const RATIO_MIN = 0.02
const RATIO_MAX = 0.1

export default class _ extends VisualizerBase {
  readonly type = 'Spheres'
  private sphere: THREE.Mesh
  private spheres: THREE.Mesh[]
  private strobe: Strobe = new Strobe()

  constructor() {
    super()
    const geometry = new THREE.SphereGeometry(RADIUS, 40, 40)
    const material = new THREE.MeshBasicMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.5,
    })
    this.sphere = new THREE.Mesh(geometry, material)
    this.scene.add(this.sphere)

    this.spheres = []
    ARRAY.forEach((_) => {
      const r = random(RATIO_MIN, RATIO_MAX) * RADIUS
      const geometry = new THREE.SphereGeometry(r, 15, 15)
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff })
      geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, RADIUS, 0))
      const sphere = new THREE.Mesh(geometry, material)
      sphere.rotation.x = random(100)
      sphere.rotation.y = random(100)
      sphere.rotation.z = random(100)
      this.scene.add(sphere)
      this.spheres.push(sphere)
    })
  }

  update(rs: RealtimeState, _state: ReduxState): void {
    const scenes = _state.scenes.present
    const bombacity = scenes.byId[scenes.active].bombacity

    const params = rs.outputParams

    const color = colorFromHSV(
      params.hue,
      params.saturation / 2,
      params.brightness *
        bombacity *
        this.strobe.update(rs.time.dt, rs.outputParams.strobe)
    )

    this.sphere.material = new THREE.MeshBasicMaterial({
      color: color,
    })

    if (isNewPeriod(rs.time, 1)) {
      this.spheres.forEach((sphere) => {
        sphere.material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
        })
      })
    }

    const dr = (rs.time.dt / 500) * (Skew(bombacity, 0.6) + 0.01)
    this.spheres.forEach((sphere) => {
      sphere.rotation.x += dr
      sphere.rotation.y += dr
      sphere.rotation.z += dr
    })
  }
}
