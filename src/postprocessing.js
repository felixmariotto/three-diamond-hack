
const refractionShader = {

	uniforms: {
		'tDiffuse': { value: null },
		'opacity': { value: 1.0 },
		'u_shiftData': { value: undefined }
	},

	vertexShader: `
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}
	`,

	fragmentShader: `
		uniform float opacity;
		uniform sampler2D tDiffuse;
		uniform sampler2D u_shiftData;

		varying vec2 vUv;

		void main() {

			vec3 shiftData = texture2D( u_shiftData, vUv ).xyz;

			vec2 shift = vec2( shiftData.x * 2.0 - 1.0, shiftData.y * 2.0 - 1.0 );
			shift *= shiftData.z * -0.2;

			vec2 uv = vUv + shift;

			vec4 texel = texture2D( tDiffuse, uv );

			gl_FragColor = texel;
		}
	`

};

export default {
	refractionShader
};