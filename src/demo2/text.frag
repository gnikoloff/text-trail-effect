uniform sampler2D sampler;
uniform vec3 color;

varying vec2 v_uv;

void main () {
  vec4 texColor = texture2D(sampler, v_uv);
  if (texColor.a < 0.9) {
    discard;
  } else {
    gl_FragColor = vec4(color, 1.0);
  }
}
