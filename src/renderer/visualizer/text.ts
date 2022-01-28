import * as THREE from 'three'
import { fonts } from './fonts'
import { FontType } from './FontType'
import { SVGLoader, StrokeStyle } from 'three/examples/jsm/loaders/SVGLoader'

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

export function textBounds(text: string, size: number, fontType: FontType) {
  let shapes = fonts[fontType].generateShapes(text, size)
  let geometry = new THREE.ShapeGeometry(shapes)
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  if (bb) {
    return {
      width: bb.max.x - bb.min.x,
      height: (bb.max.y - bb.min.y) / 2,
    }
  } else {
    return {
      width: 0,
      height: 0,
    }
  }
}

//Shapes are the font shapes. Paths are the holes (if any)
export function textOutlineShapesAndHoles(
  text: string,
  size: number,
  fontType: FontType
) {
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
  // const shapesAndPaths: Array<THREE.Shape | THREE.Path> = shapes
  // shapesAndPaths.push.apply(shapesAndPaths, holes)
  return {
    shapes: shapes,
    holes: holes,
  }
}

export function textOutlineGroup(
  text: string,
  size: number,
  fontType: FontType,
  material: THREE.Material
) {
  const { shapes, holes } = textOutlineShapesAndHoles(text, size, fontType)
  material.side = THREE.DoubleSide
  const style = SVGLoader.getStrokeStyle(
    0.02,
    new THREE.Color(0xff00ff).getStyle()
  )
  const strokeText = new THREE.Group()
  for (const shape of shapes) {
    strokeText.add(shapeOrHoleMesh(shape, style, material))
  }
  for (const hole of holes) {
    strokeText.add(shapeOrHoleMesh(hole, style, material))
  }
  return {
    material: material,
    group: strokeText,
  }
}

function shapeOrHoleMesh(
  shapeOrHole: THREE.Shape | THREE.Path,
  style: StrokeStyle,
  material: THREE.Material
) {
  const points = shapeOrHole
    .getPoints()
    .map((p) => new THREE.Vector3(p.x, p.y, 0))
  const geometry = SVGLoader.pointsToStroke(points, style)
  return new THREE.Mesh(geometry, material)
}
