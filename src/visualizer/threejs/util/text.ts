import * as THREE from 'three'
import { Font, fonts, fallbackFont } from '../fonts/fonts'
import { FontType } from '../fonts/FontType'
import { SVGLoader, StrokeStyle } from 'three/examples/jsm/loaders/SVGLoader'

function getFontSafe(fontType: FontType): Font {
  return fonts[fontType] ?? fallbackFont
}

// Creates a centered Mesh of the given text
export function textMesh(
  text: string,
  size: number,
  fontType: FontType,
  material: THREE.Material
) {
  material.side = THREE.DoubleSide
  let shapes = getFontSafe(fontType).generateShapes(text, size)
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

export type TextMesh_t = ReturnType<typeof textMesh>

export function textMesh_release(text: TextMesh_t) {
  text.geometry.dispose()
  text.material.dispose()
}

export function textBounds(text: string, size: number, fontType: FontType) {
  let shapes = getFontSafe(fontType).generateShapes(text, size)
  let geometry = new THREE.ShapeGeometry(shapes)
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  geometry.dispose()
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
  const shapes = getFontSafe(fontType).generateShapes(text, size)
  for (const shape of shapes) {
    if (shape.holes) {
      for (const hole of shape.holes) {
        holes.push(hole)
      }
    }
  }
  return {
    shapes,
    holes,
  }
}

export function textOutline(
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
  const meshes: THREE.Mesh[] = []
  for (const shape of shapes) {
    const mesh = shapeOrHoleMesh(shape, style, material)
    strokeText.add(mesh)
    meshes.push(mesh)
  }
  for (const hole of holes) {
    const mesh = shapeOrHoleMesh(hole, style, material)
    strokeText.add(mesh)
    meshes.push(mesh)
  }
  return {
    material,
    meshes,
    group: strokeText,
  }
}

export type TextOutline_t = ReturnType<typeof textOutline>

export function textOutline_release(text: TextOutline_t) {
  text.material.dispose()
  text.meshes.forEach((mesh) => mesh.geometry.dispose())
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
