
export default {

vertex: `
	varying vec3 vNormal;
	varying vec2 vUv;
	varying vec3 vViewPosition;

	void main() {
		vUv = uv;
		vNormal = normalMatrix * normal;
		vViewPosition = ( modelViewMatrix * vec4( position, 1.0 ) ).rgb;
		vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
		gl_Position = projectionMatrix * mvPosition;
	}
`,

fragment: `
	varying vec3 vNormal;
	varying vec2 vUv;
	varying vec3 vViewPosition;

	void main() {
		gl_FragColor = vec4( 1.0, 0.0, 0.0, 0.5 );
	}
`

}