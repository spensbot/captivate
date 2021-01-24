import * as THREE from 'three'
import { ReduxStore } from '../redux/store'

var camera: THREE.Camera
var scene: THREE.Scene
var renderer: THREE.Renderer
var geometry: THREE.Geometry
var material: THREE.Material
var mesh: THREE.Mesh
var domRef: any
var _store: ReduxStore

export function init(store: ReduxStore) {
  _store = store

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

export function update (timeState) {
  mesh.rotation.x += 0.001 * timeState.dt;
  mesh.rotation.y += 0.002 * timeState.dt;

  let scale = timeState.phase / timeState.quantum
  scale = 1 - scale
  scale = Math.pow(scale, 3);

  mesh.scale.setScalar(1.5);
  mesh.material.transparent = true;
  mesh.material.opacity = scale;

  if (renderer && scene && camera ){
    renderer.render( scene, camera );
  }
}
