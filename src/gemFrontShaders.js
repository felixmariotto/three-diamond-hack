
export default {

vertex: `
	attribute vec3 islandCenter;

	varying vec2 vUv;
	varying vec2 vCoords;
	varying vec2 cCoords;

	varying vec2 test;

	void main() {

		vUv = uv;

		vec4 v = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		vCoords.x = ( v.x / v.z ) * 0.5 + 0.5;
		vCoords.y = ( v.y / v.z ) * 0.5 + 0.5;

		vec4 c = projectionMatrix * modelViewMatrix * vec4( islandCenter, 1.0 );
		cCoords.x = ( c.x / c.z ) * 0.5 + 0.5;
		cCoords.y = ( c.y / c.z ) * 0.5 + 0.5;

		test = v.xy;
		test /= v.w;
		test = test * 0.5 + 0.5;

		gl_Position = v;

	}
`,

fragment: `
	#define gemSamplingZoom 0.15

	varying vec2 vUv;
	varying vec2 vCoords;
	varying vec2 cCoords;

	varying vec2 test;

	uniform sampler2D u_shiftRT;
	uniform sampler2D u_gemsBackRT;

	void main() {

		vec3 shiftData = texture2D( u_shiftRT, vCoords ).xyz;

		vec2 shift = vec2( shiftData.x * 2.0 - 1.0, shiftData.y * 2.0 - 1.0 );
		shift *= shiftData.z * -0.06;

		vec2 zoomedCoords = ( vCoords * gemSamplingZoom ) + ( cCoords * ( 1.0 - gemSamplingZoom ) );

		vec2 uv = zoomedCoords + shift;

		vec4 texel = texture2D( u_gemsBackRT, uv );

		vec2 coords = test * 10.0;
		coords = fract( coords );

		// gl_FragColor = texel;
		// gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
		gl_FragColor = vec4( coords, 0.0, 1.0 );
	}
`

}