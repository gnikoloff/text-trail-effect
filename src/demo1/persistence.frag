uniform sampler2D velocity;
uniform sampler2D sampler;
uniform float time;
uniform float aspect;
uniform vec2 mousePos;
uniform float noiseFactor;
uniform float noiseScale;
uniform float rgbPersistFactor;
uniform float alphaPersistFactor;

varying vec2 v_uv;

#pragma glslify: snoise3 = require(glsl-noise/simplex/3d)

void main () {
  float a = snoise3(vec3(v_uv * noiseFactor, time * 0.1)) * noiseScale;
  float b = snoise3(vec3(v_uv * noiseFactor, time * 0.1 + 100.0)) * noiseScale;
  vec4 t0 = texture2D(sampler, v_uv + vec2(a, b) + mousePos * 0.005);

  gl_FragColor = vec4(t0.xyz * rgbPersistFactor, alphaPersistFactor);
}
