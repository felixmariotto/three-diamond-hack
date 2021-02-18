
export default {

vertex: `
	attribute vec2 uv2;

	varying vec3 vNormal;
	varying vec2 vUv;
	varying vec2 vUv2;
	varying vec3 vViewPosition;

	void main() {
		vUv2 = uv2;
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
	varying vec2 vUv2;
	varying vec3 vViewPosition;

	void main() {

		vec3 normal = normalize( vNormal );

		float camAngle = dot( normal, vec3( 0, 0, 1 ) );

		vec2 flatNormal = normalize( vec2( normal.x, normal.y ) );

		vec2 diff = dFdx( vUv2 );

		float diffAmount = diff.x + diff.y;

		gl_FragColor = vec4( vec3( diffAmount ), 1.0 );
		// gl_FragColor = vec4( vUv2.x, vUv2.y, 0.0, 1.0 );
	}
`

}