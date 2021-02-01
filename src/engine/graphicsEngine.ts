import * as THREE from 'three'
import { ReduxStore } from '../redux/store'
import {RealtimeState} from '../redux/realtimeStore'
import { MeshMatcapMaterial } from 'three'

var camera: THREE.Camera
var scene: THREE.Scene
var renderer: THREE.Renderer
var geometry: THREE.Geometry
var material: THREE.Material
var mesh: THREE.Mesh
var domRef: any

export function init() {
  scene = new THREE.Scene();

  geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
  material = new THREE.MeshNormalMaterial();

  mesh = new THREE.Mesh( geometry, material );
  scene.add( mesh );

  renderer = new THREE.WebGLRenderer( { antialias: true } );
}

export function setDomElement(_domRef: any) {
  domRef = _domRef;
  resize();
  domRef.appendChild( renderer.domElement );
}

export function resize () {
  const height = domRef.clientHeight;
  const width = domRef.clientWidth;

  camera = new THREE.PerspectiveCamera( 70, width / height, 0.01, 10 );
  camera.position.z = 1;

  renderer.setSize( width, height );
}

export function update({ time, outputParams }: RealtimeState) {
  const {X, Y, Width, Brightness} = outputParams

  mesh.rotation.x += 0.001 * time.dt;
  mesh.rotation.y += 0.002 * time.dt;

  mesh.scale.setScalar(Width * 3);
  mesh.position.setX(X - 0.5)
  mesh.position.setY(Y - 0.5)
  mesh.material.transparent = true;
  mesh.material.opacity = Brightness;

  if (renderer && scene && camera ){
    renderer.render( scene, camera );
  }
}
