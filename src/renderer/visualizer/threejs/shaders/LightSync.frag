uniform float opacity;
uniform float brightness;
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(tDiffuse, vUv);
  gl_FragColor.xyz *= brightness;
}