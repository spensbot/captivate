uniform vec3 colorMultipler;
uniform float brightnessMultiplier;
uniform vec2 windowSize;
uniform vec2 windowPosition;
uniform sampler2D tDiffuse;

varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(tDiffuse, vUv);
  gl_FragColor.xyz *= brightnessMultiplier;
}