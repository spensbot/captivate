uniform vec3 colorMultipler;
uniform float brightnessMultiplier;
uniform vec2 windowSize;
uniform vec2 windowPosition;
uniform sampler2D tDiffuse;

varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(tDiffuse, vUv);
  float level = dot(gl_FragColor.rgb, vec3(0.33, 0.34, 0.33));
  float adjustedLevel = sqrt(level);
  vec4 adjustedColor = vec4(colorMultipler * adjustedLevel, 1);
  gl_FragColor = mix(gl_FragColor, adjustedColor, 1.0);

  float delta = abs(vUv.x - windowPosition.x);
  float mult = windowSize.x - delta / 2.0;
  float windowMultiplier = max(0.0, mult);
  // float windowMultiplier = delta < windowSize.x ? 1.0 : 0.0;

  // float windowMultiplier = 1.0;
  gl_FragColor.rgb *= sqrt(brightnessMultiplier * windowMultiplier);
}