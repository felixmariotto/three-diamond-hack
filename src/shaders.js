
export default {

vertex: `
	attribute float scale;

	varying vec3 vNormal;
	// varying vec2 vUv;
	varying float vScale;
	varying vec3 vViewPosition;

	void main() {
		vScale = scale;
		// vUv = uv;
		vNormal = normalMatrix * normal;
		vViewPosition = ( modelViewMatrix * vec4( position, 1.0 ) ).rgb;
		vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
		gl_Position = projectionMatrix * mvPosition;
	}
`,

fragment: `
	#extension GL_OES_standard_derivatives : enable

	varying vec3 vNormal;
	// varying vec2 vUv;
	varying float vScale;
	varying vec3 vViewPosition;

	void main() {

		vec3 normal = normalize( vNormal ) * 0.5 + 0.5;

		vec2 screenDir = vec2( normal.x, normal.y );

		gl_FragColor = vec4( vec3( screenDir, vScale ), 1.0 );

		// gl_FragColor = vec4( vec3( vScale ), 1.0 );
	}
`

}