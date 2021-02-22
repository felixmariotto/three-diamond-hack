
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

			vec4 texel = texture2D( tDiffuse, vUv );
			vec4 inputTexel = opacity * texel;

			vec3 shiftData = texture2D( u_shiftData, vUv ).xyz;

			gl_FragColor = vec4( vec3( shiftData.x, 1.0, 1.0 ), 1.0 );
		}
	`

};

export default {
	refractionShader
};