import * as THREE from 'three'
import { fonts, fontTypes, Font, FontType } from './fonts'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader'

// Creates a centered Mesh of the given text
export function textMesh(
  text: string,
  size: number,
  fontType: FontType,
  material: THREE.Material
) {
  material.side = THREE.DoubleSide
  let shapes = fonts[fontType].generateShapes(text, size)
  let geometry = new THREE.ShapeGeometry(shapes)
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  const width = bb ? bb.max.x - bb.min.x : 0
  geometry.translate(-width, size, 0)
  const mesh = new THREE.Mesh(geometry, material)
  return {
    geometry: geometry,
    material: material,
    mesh: mesh,
  }
}

export function textOutlineMesh(
  text: string,
  size: number,
  fontType: FontType,
  material: THREE.Material
) {
  material.side = THREE.DoubleSide
  const holes = []
  const shapes = fonts[fontType].generateShapes(text, size)
  for (const shape of shapes) {
    if (shape.holes) {
      for (const hole of shape.holes) {
        holes.push(hole)
      }
    }
  }
  console.log(`shapes.length: ${shapes.length} | holes.length:${holes.length}`)
  //@ts-ignore: Three.js examples recommend this: https://github.com/mrdoob/three.js/blob/master/examples/webgl_geometry_text_stroke.html
  shapes.push.apply(shapes, holes)
  const style = SVGLoader.getStrokeStyle(
    0.02,
    new THREE.Color(0xff00ff).getStyle()
  )
  const strokeText = new THREE.Group()
  for (const shape of shapes) {
    const points = shape.getPoints().map((p) => new THREE.Vector3(p.x, p.y, 0))
    const geometry = SVGLoader.pointsToStroke(points, style)
    strokeText.add(new THREE.Mesh(geometry, material))
  }
  return {
    material: material,
    group: strokeText,
  }
}
