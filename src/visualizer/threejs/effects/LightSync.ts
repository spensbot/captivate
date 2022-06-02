import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import vertexShader from '../shaders/LightSync.vert';
import fragmentShader from '../shaders/LightSync.frag';
import { Uniform } from 'three';
import UpdateResource from '../UpdateResource';
import { Strobe } from '../util/animations';
import { getColors } from 'shared/dmxColors';
import CustomPassShader from './CustomPassShader';
import EffectBase from './EffectBase';
import { LightSyncConfig } from './effectConfigs';

type LightSyncShader = CustomPassShader<{
  tDiffuse: Uniform;
  obeyColor: Uniform;
  colorMultipler: Uniform; // vec3 color
  brightnessMultiplier: Uniform; // float brightness, master, strobe
  windowSize: Uniform; // vec2
  windowPosition: Uniform; // vec2
}>;

export class LightSync extends EffectBase {
  config: LightSyncConfig;
  shader: LightSyncShader;
  pass: ShaderPass;
  strobe: Strobe;

  constructor(config: LightSyncConfig) {
    super();
    this.config = config;
    this.shader = {
      uniforms: {
        tDiffuse: new Uniform(null),
        obeyColor: new Uniform(1.0),
        colorMultipler: new Uniform([0, 0, 0]),
        brightnessMultiplier: new Uniform(1.0),
        windowSize: new Uniform([1, 1]),
        windowPosition: new Uniform([0, 0]),
      },
      vertexShader,
      fragmentShader,
    };
    this.pass = new ShaderPass(this.shader);
    this.strobe = new Strobe();
  }

  update({ dt, params, master }: UpdateResource) {
    let brightnessMultiplier = 1.0;

    if (this.config.obeyMaster) brightnessMultiplier *= master;
    if (this.config.obeyBrightness) brightnessMultiplier *= params.brightness;
    if (this.config.obeyStrobe)
      brightnessMultiplier *= this.strobe.update(dt, params.strobe);

    this.pass.uniforms.brightnessMultiplier.value = brightnessMultiplier;

    const colors = getColors(params);
    this.pass.uniforms.colorMultipler.value = [
      colors.red,
      colors.green,
      colors.blue,
    ];

    this.pass.uniforms.obeyColor.value = this.config.obeyColor;

    if (this.config.obeyPosition) {
      this.pass.uniforms.windowPosition.value = [
        mapGLCoords(params.x),
        mapGLCoords(params.y),
      ];
      this.pass.uniforms.windowSize.value = [
        mapGLSize(params.width),
        mapGLSize(params.height),
      ];
    } else {
      this.pass.uniforms.windowPosition.value = [0, 0];
      this.pass.uniforms.windowSize.value = [1, 1];
    }
  }
}

function mapGLCoords(normalized: number): number {
  return normalized;
  // return normalized * 2 - 1
}

function mapGLSize(normalized: number): number {
  return normalized;
  // return normalized * 2
}
