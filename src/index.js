
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

const _vec1 = new THREE.Vector3();
const _vec2 = new THREE.Vector3();
const _vec3 = new THREE.Vector3();

new GLTFLoader().load( './diamond.glb', (glb) => {

	glb.scene.traverse( (obj) => {

		if ( obj.material ) {

			const frontMesh = obj;
			const backMesh = obj.clone();

			const posAttrib = frontMesh.geometry.attributes.position;

			let newUVs = new Float32Array( posAttrib.count * 2 );

			frontMesh.geometry.setAttribute( 'uv2', new THREE.BufferAttribute( newUVs, 2 ) );

			const uv2Attrib = frontMesh.geometry.attributes.uv2;

			for ( let i=0 ; i<posAttrib.count ; i+=3 ) {

				const vec1 = getVectorAt( posAttrib, i, _vec1 );
				const vec2 = getVectorAt( posAttrib, i + 1, _vec2 );
				const vec3 = getVectorAt( posAttrib, i + 2, _vec3 );

				vec1.dist = vec1.distanceTo( vec2 ) + vec1.distanceTo( vec3 );
				vec2.dist = vec2.distanceTo( vec1 ) + vec2.distanceTo( vec3 );
				vec3.dist = vec3.distanceTo( vec2 ) + vec3.distanceTo( vec1 );

				const arr = [ vec1, vec2, vec3 ]
				.map( (vec, id) => {
					vec.id = id
					return vec
				})
				.sort( (a,b) => a.dist - b.dist );

				const baseDist = arr[1].distanceTo( arr[2] );
				const distTo1 = arr[0].distanceTo( arr[1] );
				const distTo2 = arr[0].distanceTo( arr[2] );

				const u = distTo1 / baseDist;
				const v = distTo2 / baseDist;

				uv2Attrib.setXY( i + arr[0].id, u, v );
				uv2Attrib.setXY( i + arr[1].id, 0, 0 );
				uv2Attrib.setXY( i + arr[2].id, 0, 1 );

			}

			setTimeout( () => {
				uv2Attrib.needsUpdate = true;
			}, 100 )

			console.log( frontMesh.geometry.attributes )

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

function getVectorAt( attribute, index, target ) {
	target.x = attribute.getX( index );
	target.y = attribute.getY( index );
	target.z = attribute.getZ( index );
	return target
}

//

renderer.setAnimationLoop( loop );

function loop() {
	renderer.render( scene, camera );
	controls.update();
};
