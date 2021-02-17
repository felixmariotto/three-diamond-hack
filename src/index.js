
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import shaders from './shaders.js';

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

const uniforms = {};

const material = new THREE.ShaderMaterial({
	fragmentShader: shaders.fragment,
	vertexShader: shaders.vertex,
	uniforms,
	transparent: true
});

//

new GLTFLoader().load( './diamond.glb', (glb) => {

	glb.scene.traverse( (obj) => {

		if ( obj.material ) {

			const frontMesh = obj;
			const backMesh = obj.clone();

			frontMesh.material = material;
			backMesh.material = new THREE.MeshBasicMaterial({
				map: new THREE.TextureLoader().load('./map.jpg'),
				side: THREE.BackSide
			});

			scene.add( frontMesh, backMesh );

		}

	});

});

//

renderer.setAnimationLoop( loop );

function loop() {
	renderer.render( scene, camera );
	controls.update();
};
