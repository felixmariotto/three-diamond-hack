
export default {

vertex: `
	varying vec2 vUv;

	void main() {
		vUv = uv;
		vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
		gl_Position = projectionMatrix * mvPosition;
	}
`,

fragment: `
	varying vec2 vUv;

	void main() {
		gl_FragColor = vec4( 1.0, vUv.y, 1.0, 1.0 );
	}
`

}