import * as THREE from 'three'

var camera, scene, renderer;
var geometry, material, mesh;
var domRef;

export function init() {

  scene = new THREE.Scene();

  geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
  material = new THREE.MeshNormalMaterial();

  mesh = new THREE.Mesh( geometry, material );
  scene.add( mesh );

  renderer = new THREE.WebGLRenderer( { antialias: true } );
}

export function setDomElement(_domRef) {
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

export function update (dt) {
  mesh.rotation.x += 0.001 * dt;
  mesh.rotation.y += 0.002 * dt;

  if (renderer && scene && camera ){
    renderer.render( scene, camera );
  }
}
