
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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

			const bb = new THREE.Box3().setFromObject( frontMesh );
			const edge = bb.max.distanceTo( bb.min );

			const posAttrib = frontMesh.geometry.attributes.position;

			let scale = new Float32Array( posAttrib.count * 2 );

			frontMesh.geometry.setAttribute( 'scale', new THREE.BufferAttribute( scale, 1 ) );

			frontMesh.material = material;

			frontMesh.geometry = parseGeometryIslands( frontMesh.geometry );

			//

			backMesh.material = new THREE.MeshBasicMaterial({
				map: new THREE.TextureLoader().load('./map.jpg'),
				side: THREE.BackSide
			});

			scene.add( frontMesh, backMesh );

		}

	});

});

//

function parseGeometryIslands( geometry ) {

	if ( !geometry.index ) {
		geometry = BufferGeometryUtils.mergeVertices( geometry );
	}

	geometry.islands = [];

	const triVec1 = new THREE.Vector3();
	const triVec2 = new THREE.Vector3();
	const triVec3 = new THREE.Vector3();
	const _vec = new THREE.Vector3();
	let a, b, c, islandID;

	const index = geometry.index;

	for ( let i=0 ; i<index.count - 3 ; i+=3 ) {

		a = index.array[ i ];
		b = index.array[ i + 1 ];
		c = index.array[ i + 2 ];

		// get id of the island including one of the vertices
		islandID = geometry.islands.findIndex( (island) => {
			return (
				island.vertices.includes( a ) ||
				island.vertices.includes( b ) ||
				island.vertices.includes( c )
			)
		});

		if ( islandID < 0 ) {

			// create new island
			geometry.islands.push(
				{ vertices: [ a, b, c ] }
			)

		} else {

			// add vertices to island if necessary
			[ a, b, c ].forEach( (vertIndex) => {

				if ( !geometry.islands[ islandID ].vertices.includes( vertIndex ) ) {

					geometry.islands[ islandID ].vertices.push( vertIndex );

				}

			})
			

		}

	}

	// merge islands
	( function recursiveMergeIslands() {

		let baseIslandVerts, testIslandVerts;

		for ( let i=0 ; i<geometry.islands.length ; i++ ) {

			for ( let j=i+1 ; j<geometry.islands.length ; j++ ) {

				baseIslandVerts = geometry.islands[ i ].vertices;
				testIslandVerts = geometry.islands[ j ].vertices;

				if ( baseIslandVerts.some( r => testIslandVerts.indexOf(r) >= 0 ) ) {
					
					// then merge the islands and call this function again

					baseIslandVerts = baseIslandVerts.concat( testIslandVerts );

					baseIslandVerts = baseIslandVerts.concat( testIslandVerts.filter( (item) => {
						baseIslandVerts.indexOf(item) < 0
					}));

					geometry.islands.splice( j, 1 );

					recursiveMergeIslands();

				}

			}

		}

	})()

	console.log( geometry );

	return geometry

}

//

renderer.setAnimationLoop( loop );

function loop() {
	renderer.render( scene, camera );
	controls.update();
};
