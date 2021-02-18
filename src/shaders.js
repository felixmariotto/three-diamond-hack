
export default {

vertex: `
	attribute float scale;

	varying vec3 vNormal;
	varying vec2 vUv;
	varying float vScale;
	varying vec3 vViewPosition;

	void main() {
		vScale = scale;
		vUv = uv;
		vNormal = normalMatrix * normal;
		vViewPosition = ( modelViewMatrix * vec4( position, 1.0 ) ).rgb;
		vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
		gl_Position = projectionMatrix * mvPosition;
	}
`,

fragment: `
	#extension GL_OES_standard_derivatives : enable

	varying vec3 vNormal;
	varying vec2 vUv;
	varying float vScale;
	varying vec3 vViewPosition;

	void main() {

		vec3 normal = normalize( vNormal );

		float camAngle = dot( normal, vec3( 0, 0, 1 ) );

		gl_FragColor = vec4( normal, 1.0 );
	}
`

}