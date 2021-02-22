
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import shaders from './shaders.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import postprocessing from './postprocessing.js';

//

const backgroundColor = new THREE.Color( 0x505050 );
const black = new THREE.Color( 0x00 );

var scene = new THREE.Scene();
scene.background = backgroundColor;

var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const composer = new EffectComposer( renderer );

const renderPass = new RenderPass( scene, camera );
composer.addPass( renderPass );

//

const refractionPass = new ShaderPass( postprocessing.refractionShader );
composer.addPass( refractionPass );

const dpr = window.devicePixelRatio;
const textureSize = 128 * dpr;
const data = new Uint8Array( textureSize * textureSize * 3 );

const rtTexture = new THREE.WebGLRenderTarget(
	window.innerWidth,
	window.innerHeight,
	{
		minFilter: THREE.LinearFilter,
		magFilter: THREE.NearestFilter,
		format: THREE.RGBFormat
	}
);

refractionPass.uniforms["u_shiftData"].value = rtTexture.texture;

//

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

			frontMesh.layers.set(1);

			const bb = new THREE.Box3().setFromObject( frontMesh );
			const edge = bb.max.distanceTo( bb.min );

			const posAttrib = frontMesh.geometry.attributes.position;

			let scale = new Float32Array( posAttrib.count );

			let dummyGeom = frontMesh.geometry.clone();

			dummyGeom.deleteAttribute( 'normal' );
			dummyGeom.deleteAttribute( 'uv' );

			dummyGeom = parseGeometryIslands( dummyGeom );
			// frontMesh.geometry.computeVertexNormals();

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

				const helper = new THREE.Box3Helper( _box, 0xffff00 );
				scene.add( helper );

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

			scene.add( frontMesh, backMesh );

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

renderer.setAnimationLoop( loop );

const clock = new THREE.Clock();

function loop() {

	// so that background data in refraction shader is empty
	scene.background = black;

	camera.layers.disableAll();
	camera.layers.enable( 1 );

	renderer.setRenderTarget( rtTexture );
	renderer.clear();
	renderer.render( scene, camera );

	//

	scene.background = backgroundColor;

	camera.layers.disableAll();
	camera.layers.enable( 0 );

	composer.render();

	//

	controls.update();

	scene.children.forEach( (child) => {

		if ( child.geometry.islands ) {

			computeIslandsScale( child );

		}

	})

	// refractionPass.uniforms.time.value = clock.getElapsedTime();

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
