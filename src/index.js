
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

import shiftShaders from './shiftShaders.js';
import gemFrontShaders from './gemFrontShaders.js';
import gemBackShaders from './gemBackShaders.js';
import RenderTargetHelper from 'three-rt-helper';

//

const backgroundColor = new THREE.Color( 0x505050 );
const black = new THREE.Color( 0x00 );

var scene = new THREE.Scene();
scene.background = backgroundColor;

var camera = new THREE.PerspectiveCamera( 70, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const stats = new Stats();
document.body.appendChild( stats.dom );

//

const shiftingRenderTarget = new THREE.WebGLRenderTarget(
	window.innerWidth,
	window.innerHeight,
	{
		minFilter: THREE.LinearFilter,
		magFilter: THREE.NearestFilter,
		format: THREE.RGBAFormat
	}
);

const gemsBackRenderTarget = new THREE.WebGLRenderTarget(
	window.innerWidth * 3,
	window.innerHeight * 3,
	{
		minFilter: THREE.LinearFilter,
		magFilter: THREE.NearestFilter,
		format: THREE.RGBAFormat
	}
);

// const renderTargetHelper = RenderTargetHelper( renderer, gemsBackRenderTarget );
// document.body.append( renderTargetHelper );

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

// const url = './diamond.glb';
const url = './diamond-more.glb';
// const url = './diamonds-lots.glb';

new GLTFLoader().load( url, (glb) => {

	console.time('model preparation');

	/*
	glb.scene.traverse( (obj) => {
		if ( obj.material ) obj.material = new THREE.MeshNormalMaterial();
	})
	scene.add( glb.scene );
	return
	*/

	glb.scene.traverse( (obj) => {

		if ( obj.material ) {

			const frontMesh = obj;
			
			frontMesh.layers.set(1);

			const bb = new THREE.Box3().setFromObject( frontMesh );
			const edge = bb.max.distanceTo( bb.min );

			const posAttrib = frontMesh.geometry.attributes.position;

			let dummyGeom = frontMesh.geometry.clone();

			dummyGeom.deleteAttribute( 'normal' );
			dummyGeom.deleteAttribute( 'uv' );

			console.time('geometry parsing');
			dummyGeom = parseGeometryIslands( dummyGeom );
			console.timeEnd('geometry parsing');

			frontMesh.geometry.computeBoundingBox();
			const baseBB = frontMesh.geometry.boundingBox;
			const baseSize = baseBB.min.distanceTo( baseBB.max );

			const _vec = new THREE.Vector3();
			const _vec2 = new THREE.Vector3();

			frontMesh.geometry.islands = [];

			console.time('get islands');
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
			console.timeEnd('get islands');

			// create index to create the islands in the real geometry

			const dummyToGeomIndex = [];

			console.time('create islands index');

			for ( let i=0 ; i<posAttrib.count ; i++ ) {

				_vec.fromBufferAttribute( posAttrib, i );

				for ( let j=0 ; j<dummyGeom.attributes.position.count ; j++ ) {

					_vec2.fromBufferAttribute( dummyGeom.attributes.position, j );

					if ( _vec.equals( _vec2 ) ) {

						dummyToGeomIndex[ j ] = dummyToGeomIndex[ j ] || [];

						dummyToGeomIndex[ j ].push( i );

					}

				}

			}

			console.timeEnd('create islands index');

			// create the islands in the real geometry

			frontMesh.geometry.islands = [];

			dummyGeom.islands.forEach( (originIsland) => {

				const newIsland = {
					vertices: [],
					boundingSphere: originIsland.boundingSphere.clone()
				};

				originIsland.vertices.forEach( (vertID) => {

					newIsland.vertices.push( ...dummyToGeomIndex[vertID] );

				});

				// reduce island objects size by computing ranges of vertices
				// instead of storing every vertex id.

				newIsland.ranges = [];

				newIsland.vertices
				.sort( (a, b) => a - b )
				.forEach( (vertID) => {

					const rangeID = newIsland.ranges.findIndex( (range) => {

						if (
							vertID + 1 >= range[ 0 ] &&
							vertID - 1 <= range[ range.length - 1 ]
						) {
							return true
						} else {
							return false
						}

					});

					const range = newIsland.ranges[ rangeID ];

					if ( range ) {

						if ( vertID > range[ range.length - 1 ] ) {
							range.push( vertID );
						} else {
							range.unshift( vertID );
						}

						newIsland.ranges[ rangeID ] = [ range[ 0 ], range[ range.length - 1 ] ];

					} else {

						newIsland.ranges.push( [ vertID ] );

					}

				})

				delete newIsland.vertices

				//

				frontMesh.geometry.islands.push( newIsland );

			});

			console.time('create new attributes')

			// add island center attribute

			const islandCenterAttrib = new THREE.BufferAttribute( new Float32Array( posAttrib.count * 3 ), 3 )

			frontMesh.geometry.islands.forEach( (island) => {

				island.ranges.forEach( (range) => {

					for ( let i=range[0]; i<=range[1] ; i++ ) {

						islandCenterAttrib.setXYZ(
							i,
							island.boundingSphere.center.x,
							island.boundingSphere.center.y,
							island.boundingSphere.center.z
						);

					}

				})

			});

			frontMesh.geometry.setAttribute( 'islandCenter', islandCenterAttrib );

			// add island scale attribute

			let scale = new Float32Array( posAttrib.count );

			frontMesh.geometry.setAttribute( 'scale', new THREE.BufferAttribute( scale, 1 ) );

			frontMesh.material = new THREE.ShaderMaterial({
				fragmentShader: shiftShaders.fragment,
				vertexShader: shiftShaders.vertex,
				transparent: true
			});

			console.timeEnd('create new attributes')
			
			//

			const backMesh = obj.clone();
			const frontMesh2 = obj.clone();
			
			backMesh.layers.set(2);
			frontMesh2.layers.set(3);

			backMesh.material = new THREE.ShaderMaterial({
				vertexShader: gemBackShaders.vertex,
				fragmentShader: gemBackShaders.fragment,
				uniforms: {
					'u_map': { value: new THREE.TextureLoader().load('./map.jpg') }
				},
				side: THREE.BackSide
			});

			frontMesh2.material = new THREE.ShaderMaterial({
				vertexShader: gemFrontShaders.vertex,
				fragmentShader: gemFrontShaders.fragment,
				uniforms: {
					'u_shiftRT': { value: shiftingRenderTarget.texture },
					'u_gemsBackRT': { value: gemsBackRenderTarget.texture }
				}
			});

			scene.add( frontMesh, backMesh, frontMesh2 );

		}

	});

	console.timeEnd('model preparation');

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

}

//

renderer.setAnimationLoop( loop );

const clock = new THREE.Clock();

let originalRT;

function loop() {

	// update scale attribute

	scene.children.forEach( (child) => {

		if (
			child.geometry &&
			child.geometry.islands
		) {

			computeIslandsScale( child );

		}

	});

	// STEP 1 : Render image shifting information on a render target.
	// this shifting is used to mimic refraction in the front faces shader.

	// background must be black or shifting will occur in empty areas.
	scene.background = black;

	camera.layers.disableAll();
	camera.layers.enable( 1 );

	originalRT = renderer.getRenderTarget();

	renderer.setRenderTarget( shiftingRenderTarget );
	renderer.clear();
	renderer.render( scene, camera );

	// STEP 2 : Render gemstones backfaces only, to be used later by the
	// front faces material. The gemstones are scaled down in the vertex
	// shader, in order to avoid overlap as much as possible.

	camera.layers.disableAll();
	camera.layers.enable( 2 );

	renderer.setRenderTarget( gemsBackRenderTarget );
	renderer.clear();
	renderer.render( scene, camera );

	// STEP 3 : Render all objects, including gemstones which are
	// displayed with a shader material using the two previous
	// render targets.

	// the gemstones backface color sampling is done according to the
	// downscaling of the previous step

	camera.layers.disableAll();
	camera.layers.enable( 0 );
	camera.layers.enable( 3 );

	renderer.setRenderTarget( originalRT );
	renderer.clear();
	renderer.render( scene, camera );

	//

	// renderTargetHelper.update();

	controls.update();

	stats.update();

};

//

function computeIslandsScale( object ) {

	const scaleAttrib = object.geometry.attributes.scale;

	object.geometry.islands.forEach( (island) => {

		const distToSphere = camera.position.distanceTo( island.boundingSphere.center );

		const screenScale = island.boundingSphere.radius / distToSphere;

		island.ranges.forEach( (range) => {

			for ( let i=range[0] ; i<=range[1]; i++ ) {

				scaleAttrib.setX( i, screenScale );

			}

		});

	});

	scaleAttrib.needsUpdate = true;

}
