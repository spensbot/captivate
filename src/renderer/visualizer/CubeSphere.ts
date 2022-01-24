import * as THREE from 'three'
import VisualizerBase, { UpdateResource } from './VisualizerBase'
import { random } from '../../util/util'
import { Vector3 } from 'three'

const ARRAY = Array(20).fill(0)

class RandomCube {
  mesh: THREE.Mesh
  axis: Vector3

  constructor(scene: THREE.Scene) {
    const size = 3 //random(5, 5)
    const geometry = new THREE.BoxGeometry(size, size, size)
    this.mesh = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial())
    this.mesh.rotation.x = random(100)
    this.mesh.rotation.y = random(100)
    this.mesh.rotation.z = random(100)
    const x = random(-3, 3)
    const y = random(-2, 2)
    geometry.translate(0, 0, 0)
    this.axis = new Vector3(x, y, 0).normalize()
    scene.add(this.mesh)
  }

  update({ time }: UpdateResource) {
    this.mesh.rotateOnAxis(this.axis, time.dt / 10000)
  }
}

export default class CubeSphere extends VisualizerBase {
  readonly type = 'Cubes'
  private cubes: RandomCube[]

  constructor() {
    super()
    this.cubes = ARRAY.map((_) => new RandomCube(this.scene))
  }

  update(res: UpdateResource): void {
    this.cubes.forEach((cube) => cube.update(res))
  }
}
