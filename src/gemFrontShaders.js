
export default {

vertex: `
	attribute vec3 islandCenter;

	varying vec2 vUv;
	varying vec2 vCoords;

	void main() {
		vUv = uv;
		// vec3 pos = position + ( islandCenter * 0.1 );
		vec3 pos = position;
		vec4 v = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
		vCoords.x = ( v.x / v.z ) * 0.5 + 0.5;
		vCoords.y = ( v.y / v.z ) * 0.5 + 0.5;
		gl_Position = v;
	}
`,

fragment: `
	varying vec2 vUv;
	varying vec2 vCoords;

	uniform sampler2D u_shiftRT;
	uniform sampler2D u_gemsBackRT;

	void main() {
		vec3 shiftData = texture2D( u_shiftRT, vCoords ).xyz;

		vec2 shift = vec2( shiftData.x * 2.0 - 1.0, shiftData.y * 2.0 - 1.0 );
		shift *= shiftData.z * -0.2;

		vec2 uv = vCoords + shift;

		vec4 texel = texture2D( u_gemsBackRT, uv );

		gl_FragColor = texel;
	}
`

}