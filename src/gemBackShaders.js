
export default {

vertex: `
	#define scaleToCenter 0.65
	#define gemScale 0.25

	attribute vec3 islandCenter;

	varying vec2 vUv;
	varying vec3 vViewPosition;

	void main() {

		vUv = uv;

		vec3 scaleDir = ( position - islandCenter ) * -1.0;
		vec3 scaledPos = position + ( scaleDir * ( 1.0 - gemScale ) );

		vec4 mvPosition = modelViewMatrix * vec4( scaledPos, 1.0 );

		gl_Position = projectionMatrix * mvPosition;

		// scale objects towards the center of the view
		gl_Position.x *= scaleToCenter;
		gl_Position.y *= scaleToCenter;
		
	}
`,

fragment: `
	uniform sampler2D u_map;

	varying vec2 vUv;

	void main() {
		vec4 texel = texture2D( u_map, vUv );
		gl_FragColor = texel;
	}
`

}