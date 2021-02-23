
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

import shiftShaders from './shiftShaders.js';
import gemFrontShaders from './gemFrontShaders.js';

//

const backgroundColor = new THREE.Color( 0x505050 );
const black = new THREE.Color( 0x00 );

var scene = new THREE.Scene();
scene.background = backgroundColor;

var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const stats = new Stats();
document.body.appendChild( stats.dom );

//

const dpr = window.devicePixelRatio;
const textureSize = 128 * dpr;
const data = new Uint8Array( textureSize * textureSize * 3 );

const shiftingRenderTarget = new THREE.WebGLRenderTarget(
	window.innerWidth,
	window.innerHeight,
	{
		minFilter: THREE.LinearFilter,
		magFilter: THREE.NearestFilter,
		format: THREE.RGBFormat
	}
);

const gemsBackRenderTarget = new THREE.WebGLRenderTarget(
	window.innerWidth,
	window.innerHeight,
	{
		minFilter: THREE.LinearFilter,
		magFilter: THREE.NearestFilter,
		format: THREE.RGBFormat
	}
);

//

const controls = new OrbitControls( camera, renderer.domElement );
camera.position.set( 0, 0, 10 );
camera.lookAt( 0, 0, 0 );

//

const sphere1 = new THREE.Mesh(
	new THREE.IcosahedronGeometry( 1, 5 ),
	new THREE.MeshNormalMaterial()
);

scene.add( sphere1 );

//

const uniforms = {};

const material = new THREE.ShaderMaterial({
	fragmentShader: shiftShaders.fragment,
	vertexShader: shiftShaders.vertex,
	uniforms,
	transparent: true
});

//

new GLTFLoader().load( './diamond.glb', (glb) => {

	glb.scene.traverse( (obj) => {

		if ( obj.material ) {

			const frontMesh = obj;
			const backMesh = obj.clone();
			const frontMesh2 = obj.clone();

			frontMesh.layers.set(1);
			backMesh.layers.set(2);
			frontMesh2.layers.set(3);

			const bb = new THREE.Box3().setFromObject( frontMesh );
			const edge = bb.max.distanceTo( bb.min );

			const posAttrib = frontMesh.geometry.attributes.position;

			let scale = new Float32Array( posAttrib.count );

			let dummyGeom = frontMesh.geometry.clone();

			dummyGeom.deleteAttribute( 'normal' );
			dummyGeom.deleteAttribute( 'uv' );

			dummyGeom = parseGeometryIslands( dummyGeom );

			frontMesh.geometry.computeBoundingBox();
			const baseBB = frontMesh.geometry.boundingBox;
			const baseSize = baseBB.min.distanceTo( baseBB.max );

			const _vec = new THREE.Vector3();
			const _vec2 = new THREE.Vector3();

			frontMesh.geometry.islands = [];

			// expand box 
			dummyGeom.islands.forEach( (island) => {

				const _box = new THREE.Box3();

				const vertices = island.vertices;

				// initialize box
				_vec.fromBufferAttribute( dummyGeom.attributes.position, vertices[0] );
				frontMesh.localToWorld( _vec );

				_box.min.copy( _vec );
				_box.max.copy( _vec );

				for ( let i=1 ; i<vertices.length ; i++ ) {

					_vec.fromBufferAttribute( dummyGeom.attributes.position, vertices[i] );
					frontMesh.localToWorld( _vec );

					_box.expandByPoint( _vec );

				}

				island.boundingSphere = new THREE.Sphere();
				_box.getBoundingSphere( island.boundingSphere );

				// const helper = new THREE.Box3Helper( _box, 0xffff00 );
				// scene.add( helper );

			});

			// create the islands in the real geometry

			const dummyToGeomIndex = [];

			for ( let i=0 ; i<posAttrib.count ; i++ ) {

				_vec.fromBufferAttribute( posAttrib, i );

				for ( let j=0 ; j<dummyGeom.attributes.position.count ; j++ ) {

					_vec2.fromBufferAttribute( dummyGeom.attributes.position, j );

					if ( _vec.distanceTo( _vec2 ) < 1e-4 ) {

						dummyToGeomIndex[ j ] = dummyToGeomIndex[ j ] || [];

						dummyToGeomIndex[ j ].push( i );

					}

				}

			}

			frontMesh.geometry.islands = [];

			dummyGeom.islands.forEach( (originIsland) => {

				const newIsland = {
					vertices: [],
					boundingSphere: originIsland.boundingSphere.clone()
				};

				originIsland.vertices.forEach( (vertID) => {

					newIsland.vertices = newIsland.vertices.concat( dummyToGeomIndex[vertID] );

				});

				frontMesh.geometry.islands.push( newIsland );

			});

			//

			frontMesh.geometry.setAttribute( 'scale', new THREE.BufferAttribute( scale, 1 ) );

			frontMesh.material = material;
			
			//

			backMesh.material = new THREE.MeshBasicMaterial({
				map: new THREE.TextureLoader().load('./map.jpg'),
				side: THREE.BackSide
			});

			frontMesh2.material = new THREE.ShaderMaterial({
				vertexShader: gemFrontShaders.vertex,
				fragmentShader: gemFrontShaders.fragment,
				uniforms: {
					'u_shiftRT': { value: shiftingRenderTarget.texture },
					'u_gemsBackRT': { value: gemsBackRenderTarget.texture },
				}
			});

			scene.add( frontMesh, backMesh, frontMesh2 );

		}

	});

});

//

function parseGeometryIslands( geometry ) {

	geometry = BufferGeometryUtils.mergeVertices( geometry );

	geometry.islands = [];

	let a, b, c;
	let islandIDs;

	const index = geometry.index;

	for ( let i=0 ; i<index.count - 3 ; i+=3 ) {

		// get face vertex indices
		a = index.array[ i ];
		b = index.array[ i + 1 ];
		c = index.array[ i + 2 ];

		islandIDs = getAllIndexes( geometry.islands, a );
		islandIDs = islandIDs.concat( getAllIndexes( geometry.islands, b ) );
		islandIDs = islandIDs.concat( getAllIndexes( geometry.islands, c ) );

		islandIDs = [ ...new Set(islandIDs) ];

		if ( !islandIDs.length ) {

			// create new island
			geometry.islands.push(
				{ vertices: [ a, b, c ] }
			)

		} else {

			const baseIsland = geometry.islands[ islandIDs[0] ];

			// merge islands
			for ( let i=1 ; i<islandIDs.length ; i++ ) {

				const vertsBase = baseIsland.vertices;
				const vertsToMerge = geometry.islands[ islandIDs[i] ].vertices;

				baseIsland.vertices = [ ...new Set([ ...vertsBase, ...vertsToMerge ]) ];

			}

			geometry.islands = geometry.islands.filter( (island, idx) => {
				if ( islandIDs.includes(idx) && idx !== islandIDs[0] ) return false
				else return true
			});

			// add vertices to island if necessary
			[ a, b, c ].forEach( (vertIndex) => {

				if ( !baseIsland.vertices.includes( vertIndex ) ) {

					baseIsland.vertices.push( vertIndex );

				}

			});

		}

	}

	return geometry

}

//

function getAllIndexes( islands, val ) {

	return islands.reduce( ( accu, island, i ) => {

		if ( island.vertices.includes(val) ) accu.push( i );
		
		return accu

	}, [] );

}

//

window.addEventListener( 'resize', onWindowResize );

function onWindowResize() {

	const width = window.innerWidth;
	const height = window.innerHeight;

	camera.aspect = width / height;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
	composer.setSize( window.innerWidth, window.innerHeight );

}

//

renderer.setAnimationLoop( loop );

const clock = new THREE.Clock();

let originalRT;

function loop() {

	// update scale attribute

	scene.children.forEach( (child) => {

		if ( child.geometry.islands ) {

			computeIslandsScale( child );

		}

	});

	// STEP 1 : Render image shifting information in a render target.
	// this shifting is used to mimic refraction, and only applies
	// to object in layer 1, the gems front faces.

	// so that background data in refraction shader is empty
	scene.background = black;

	camera.layers.disableAll();
	camera.layers.enable( 1 );

	originalRT = renderer.getRenderTarget();

	renderer.setRenderTarget( shiftingRenderTarget );
	renderer.clear();
	renderer.render( scene, camera );

	// STEP 2 : Render gemstones backfaces only, to be used later by the
	// front faces material.

	camera.layers.disableAll();
	camera.layers.enable( 2 );

	renderer.setRenderTarget( gemsBackRenderTarget );
	renderer.clear();
	renderer.render( scene, camera );

	// STEP 3 : Render all objects, including gemstones which are
	// displayed with a shader material using the two previous
	// render targets.

	camera.layers.disableAll();
	camera.layers.enable( 0 );
	camera.layers.enable( 3 );

	renderer.setRenderTarget( originalRT );
	renderer.clear();
	renderer.render( scene, camera );

	//

	controls.update();

	stats.update();

};

//

function computeIslandsScale( object ) {

	const scaleAttrib = object.geometry.attributes.scale;

	object.geometry.islands.forEach( (island) => {

		const distToSphere = camera.position.distanceTo( island.boundingSphere.center );

		const screenScale = island.boundingSphere.radius / distToSphere;

		island.vertices.forEach( vertID => scaleAttrib.setX( vertID, screenScale ) );

	});

	scaleAttrib.needsUpdate = true;

}
