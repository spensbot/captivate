uniform sampler2D tDiffuse;
uniform sampler2D streamTexture;
uniform float hasStream;
uniform float opacity;
varying vec2 vUv;

void main() {
  vec4 baseColor = texture2D(tDiffuse, vUv);

  if (hasStream < 0.5) {
    gl_FragColor = baseColor;
    return;
  }

  vec4 streamColor = texture2D(streamTexture, vUv);
  float blend = clamp(opacity, 0.0, 1.0) * streamColor.a;
  gl_FragColor = mix(baseColor, streamColor, blend);
}
