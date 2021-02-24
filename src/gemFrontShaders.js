
export default {

vertex: `
	attribute vec3 islandCenter;

	varying vec4 vPos;
	varying vec4 cPos;

	varying vec2 vCoords;
	varying vec2 cCoords;

	void main() {

		vPos = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		cPos = projectionMatrix * modelViewMatrix * vec4( islandCenter, 1.0 );

		gl_Position = vPos;

	}
`,

fragment: `
	#define gemSamplingZoom 0.15

	varying vec4 vPos;
	varying vec4 cPos;

	uniform sampler2D u_shiftRT;
	uniform sampler2D u_gemsBackRT;

	void main() {

		vec2 vCoords = vPos.xy;
		vCoords /= vPos.w;
		vCoords = vCoords * 0.5 + 0.5;

		vec2 cCoords = cPos.xy;
		cCoords /= cPos.w;
		cCoords = cCoords * 0.5 + 0.5;

		vec3 shiftData = texture2D( u_shiftRT, vCoords ).xyz;

		// get shifting direction according to face normal
		vec2 shift = vec2( shiftData.x * 2.0 - 1.0, shiftData.y * 2.0 - 1.0 );

		// scale according to gem size
		shift *= shiftData.z * -0.06;

		vec2 zoomedCoords = ( vCoords * gemSamplingZoom ) + ( cCoords * ( 1.0 - gemSamplingZoom ) );

		vec2 uv = zoomedCoords + shift;

		vec3 texel = texture2D( u_gemsBackRT, zoomedCoords ).xyz;
		vec3 texel2 = texture2D( u_gemsBackRT, vCoords ).xyz;

		texel = mix( texel, texel2, 0.5 );

		gl_FragColor = vec4( texel, 1.0 );
		// gl_FragColor = vec4( fract(vCoords.xy * 100.0), 0.0, 1.0 );
	}
`

}