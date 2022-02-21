import { AdaptiveToneMappingPass } from 'three/examples/jsm/postprocessing/AdaptiveToneMappingPass.js'
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js'
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js'
// import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { ClearPass } from 'three/examples/jsm/postprocessing/ClearPass.js'
// import { CubeTexturePass } from 'three/examples/jsm/postprocessing/CubeTexturePass.js'
import { DotScreenPass } from 'three/examples/jsm/postprocessing/DotScreenPass.js'
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js'
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js'
import { HalftonePass } from 'three/examples/jsm/postprocessing/HalftonePass.js'
import { LUTPass } from 'three/examples/jsm/postprocessing/LUTPass.js'
// import { MaskPass } from 'three/examples/jsm/postprocessing/MaskPass.js'
// import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
// import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
// import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js'
// import { SSRPass } from 'three/examples/jsm/postprocessing/SSRPass.js'
// import { SavePass } from 'three/examples/jsm/postprocessing/SavePass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { EffectType } from './EffectTypes'
import { Pass } from 'three/examples/jsm/postprocessing/Pass'
import { Vector2 } from 'three'

const effectCache: { [key in EffectType]: Pass } = {
  Glitch: new GlitchPass(),
  AdaptiveToneMapping: new AdaptiveToneMappingPass(),
  Afterimage: new AfterimagePass(),
  Bloom: new BloomPass(),
  // Bokeh: new BokehPass(),
  Clear: new ClearPass(),
  // CubeTexture: new CubeTexturePass(),
  DotScreen: new DotScreenPass(),
  Film: new FilmPass(),
  Halftone: new HalftonePass(1, 1, {}),
  LUT: new LUTPass({}),
  // Mask: new MaskPass(),
  // Outline: new OutlinePass(),
  // SAOPass: new SAOPass(),
  SMAA: new SMAAPass(1, 1),
  // SSAO: new SSAOPass(),
  // SSR: new SSRPass({}),
  // Save: new SavePass(),
  UnrealBloom: new UnrealBloomPass(new Vector2(1, 1), 0.5, 1, 0.5),
}

export default effectCache
