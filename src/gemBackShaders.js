
export default {

vertex: `
	#define gemScale 0.25

	attribute vec3 islandCenter;

	varying vec2 vUv;
	varying vec3 vNormal;
	varying vec3 vViewPosition;

	void main() {

		vUv = uv;
		vNormal = normalMatrix * normal;

		vec3 scaleDir = ( position - islandCenter ) * -1.0;
		vec3 pos = position + ( scaleDir * ( 1.0 - gemScale ) );

		vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );
		gl_Position = projectionMatrix * mvPosition;
	}
`,

fragment: `
	uniform sampler2D u_map;

	varying vec2 vUv;
	varying vec3 vNormal;

	void main() {
		vec4 texel = texture2D( u_map, vUv );
		gl_FragColor = texel;
	}
`

}