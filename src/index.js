
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

//

var scene = new THREE.Scene();
scene.background = new THREE.Color( 0x505050 );

var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls( camera, renderer.domElement );
camera.position.set( 0, 0, 10 );
camera.lookAt( 0, 0, 0 );

//

const mesh = new THREE.Mesh(
	new THREE.BoxGeometry(),
	new THREE.MeshNormalMaterial()
);

scene.add( mesh );

//

renderer.setAnimationLoop( loop );

function loop() {
	renderer.render( scene, camera );
	controls.update();
};
