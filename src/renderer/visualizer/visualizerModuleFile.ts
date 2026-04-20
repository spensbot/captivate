import {
  BuiltinCameraEffectType,
  BuiltinEffectLinkSource,
  BuiltinEffectType,
  BuiltinGeneratorType,
  BuiltinLayerItem,
  BuiltinVisualizerConfig,
  builtinBlendModeList,
  builtinCameraEffectTypeList,
  builtinEffectLinkSourceList,
  builtinEffectTypeList,
  builtinGeneratorTypeList,
  createBuiltinCameraEffect,
  createBuiltinEffect,
  createBuiltinLayer,
} from '../../visualizer/threejs/layers/BuiltinVisualizer'

const VISUALIZER_MODULE_SCHEMA = 'captivate.visualizer.modules'
const VISUALIZER_MODULE_VERSION = 1

type BuiltinProceduralGeneratorType = Exclude<BuiltinGeneratorType, 'customModule'>
type BuiltinRenderableEffectType = Exclude<BuiltinEffectType, 'customModule'>

interface VisualizerGeneratorModule {
  name: string
  generator?: BuiltinGeneratorType
  code?: string
  enabled?: boolean
  density?: number
  speed?: number
  scale?: number
  mix?: number
  blend?: BuiltinLayerItem['blend']
  hueShift?: number
  hueShiftLinkSource?: BuiltinEffectLinkSource
  depth?: number
  depthLinkSource?: BuiltinEffectLinkSource
  positionX?: number
  positionXLinkSource?: BuiltinEffectLinkSource
  positionY?: number
  positionYLinkSource?: BuiltinEffectLinkSource
  rotateX?: number
  rotateXLinkSource?: BuiltinEffectLinkSource
  rotateY?: number
  rotateYLinkSource?: BuiltinEffectLinkSource
  text?: string
}

interface VisualizerEffectModule {
  name: string
  type?: BuiltinEffectType
  code?: string
  enabled?: boolean
  amount?: number
  linkSource?: BuiltinEffectLinkSource
}

interface VisualizerTransitionModule {
  name: string
  type: BuiltinCameraEffectType
  enabled?: boolean
  durationBeats?: number
}

interface VisualizerModuleFileV1 {
  schema: typeof VISUALIZER_MODULE_SCHEMA
  version: typeof VISUALIZER_MODULE_VERSION
  exportedAt: string
  generators: VisualizerGeneratorModule[]
  effects: VisualizerEffectModule[]
  transitions: VisualizerTransitionModule[]
}

export interface ParsedVisualizerModules {
  generators: VisualizerGeneratorModule[]
  effects: VisualizerEffectModule[]
  transitions: VisualizerTransitionModule[]
}

export function serializeVisualizerModuleFile(config: BuiltinVisualizerConfig) {
  const builtinGeneratorTypes = Array.from(
    new Set(
      config.layers
        .filter((layer) => layer.sourceType === 'procedural')
        .filter((layer) => layer.generator !== 'customModule')
        .map((layer) => layer.generator)
    )
  )
  const builtinEffectTypes = Array.from(
    new Set(
      config.effects
        .filter((effect) => effect.type !== 'customModule')
        .map((effect) => effect.type)
    )
  )
  const customGeneratorModules = config.layers
    .filter((layer) => layer.sourceType === 'procedural')
    .filter((layer) => layer.generator === 'customModule')
    .filter((layer) => layer.customModuleCode.trim().length > 0)
    .map((layer, index) => ({
      name:
        layer.customModuleName.trim().length > 0
          ? layer.customModuleName.trim()
          : `Custom Generator ${index + 1}`,
      generator: 'customModule' as BuiltinGeneratorType,
      code: layer.customModuleCode,
      enabled: layer.enabled,
      density: layer.density,
      speed: layer.speed,
      scale: layer.scale,
      mix: layer.mix,
      blend: layer.blend,
      hueShift: layer.hueShift,
      hueShiftLinkSource: layer.hueShiftLinkSource,
      depth: layer.depth,
      depthLinkSource: layer.depthLinkSource,
      positionX: layer.positionX,
      positionXLinkSource: layer.positionXLinkSource,
      positionY: layer.positionY,
      positionYLinkSource: layer.positionYLinkSource,
      rotateX: layer.rotateX,
      rotateXLinkSource: layer.rotateXLinkSource,
      rotateY: layer.rotateY,
      rotateYLinkSource: layer.rotateYLinkSource,
      text: layer.text,
    }))
  const customEffectModules = config.effects
    .filter((effect) => effect.type === 'customModule')
    .filter((effect) => effect.customModuleCode.trim().length > 0)
    .map((effect, index) => ({
      name:
        effect.customModuleName.trim().length > 0
          ? effect.customModuleName.trim()
          : `Custom Effect ${index + 1}`,
      type: 'customModule' as BuiltinEffectType,
      code: effect.customModuleCode,
      enabled: effect.enabled,
      amount: effect.amount,
      linkSource: effect.linkSource,
    }))

  const file: VisualizerModuleFileV1 = {
    schema: VISUALIZER_MODULE_SCHEMA,
    version: VISUALIZER_MODULE_VERSION,
    exportedAt: new Date().toISOString(),
    generators: [
      ...builtinGeneratorTypes.map((generator, index) => ({
        name: `Generator Module ${index + 1}`,
        generator,
        code: createGeneratorModuleCode(generator as BuiltinProceduralGeneratorType),
      })),
      ...customGeneratorModules,
    ],
    effects: [
      ...builtinEffectTypes.map((type, index) => ({
        name: `Effect Module ${index + 1}`,
        type,
        code: createEffectModuleCode(type as BuiltinRenderableEffectType),
      })),
      ...customEffectModules,
    ],
    transitions: config.cameraEffects.map((transition, index) => ({
      name: `Transition ${index + 1}`,
      type: transition.type,
      enabled: transition.enabled,
      durationBeats: transition.durationBeats,
    })),
  }
  return JSON.stringify(file, null, 2)
}

export function parseVisualizerModuleFile(raw: string): ParsedVisualizerModules {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Visualizer module file is not valid JSON.')
  }

  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('Visualizer module file has an invalid structure.')
  }
  const input = parsed as {
    schema?: unknown
    version?: unknown
    generators?: unknown
    effects?: unknown
    transitions?: unknown
    generatorModules?: unknown
    effectModules?: unknown
    transitionModules?: unknown
  }

  if (input.schema !== VISUALIZER_MODULE_SCHEMA) {
    throw new Error('Unsupported visualizer module schema.')
  }
  if (Number(input.version) !== VISUALIZER_MODULE_VERSION) {
    throw new Error('Unsupported visualizer module version.')
  }

  const generatorInput = Array.isArray(input.generators)
    ? input.generators
    : Array.isArray(input.generatorModules)
    ? input.generatorModules
    : []
  const effectInput = Array.isArray(input.effects)
    ? input.effects
    : Array.isArray(input.effectModules)
    ? input.effectModules
    : []
  const transitionInput = Array.isArray(input.transitions)
    ? input.transitions
    : Array.isArray(input.transitionModules)
    ? input.transitionModules
    : []

  return {
    generators: generatorInput
      .map((item) => normalizeGeneratorModule(item))
      .filter((item): item is VisualizerGeneratorModule => item !== null),
    effects: effectInput
      .map((item) => normalizeEffectModule(item))
      .filter((item): item is VisualizerEffectModule => item !== null),
    transitions: transitionInput
      .map((item) => normalizeTransitionModule(item))
      .filter((item): item is VisualizerTransitionModule => item !== null),
  }
}

export function applyVisualizerModulesToConfig(
  config: BuiltinVisualizerConfig,
  modules: ParsedVisualizerModules
) {
  const layers = [...config.layers]
  for (let i = 0; i < modules.generators.length; i++) {
    const source = modules.generators[i]
    const codeSpec = parseGeneratorModuleCode(source.code)
    const resolvedGeneratorFromCode =
      codeSpec?.kind === 'builtin' ? codeSpec.generator : undefined
    const isCustomGenerator =
      codeSpec?.kind === 'custom' || source.generator === 'customModule'
    const generator = isCustomGenerator
      ? 'customModule'
      : resolvedGeneratorFromCode ?? source.generator ?? builtinGeneratorTypeList[0]
    if (!builtinGeneratorTypeList.includes(generator)) {
      continue
    }
    const layer = createBuiltinLayer(generator, layers.length)
    const defaults =
      codeSpec?.kind === 'builtin' || codeSpec?.kind === 'custom'
        ? codeSpec.defaults
        : undefined
    if (isCustomGenerator) {
      layer.customModuleName =
        source.name?.trim().length > 0
          ? source.name.trim()
          : codeSpec?.kind === 'custom' && codeSpec.name?.trim().length
          ? codeSpec.name.trim()
          : layer.customModuleName
      layer.customModuleCode = typeof source.code === 'string' ? source.code : ''
    }
    layer.enabled = source.enabled ?? layer.enabled
    layer.density = clamp01(source.density ?? defaults?.density, layer.density)
    layer.speed = clamp01(source.speed ?? defaults?.speed, layer.speed)
    layer.scale = clamp01(source.scale ?? defaults?.scale, layer.scale)
    layer.mix = clamp01(source.mix ?? defaults?.mix, layer.mix)
    layer.blend = builtinBlendModeList.includes(
      source.blend ?? defaults?.blend ?? layer.blend
    )
      ? ((source.blend ?? defaults?.blend) as BuiltinLayerItem['blend'])
      : layer.blend
    layer.hueShift = clamp01(source.hueShift ?? defaults?.hueShift, layer.hueShift)
    layer.hueShiftLinkSource = normalizeLinkSource(
      source.hueShiftLinkSource ?? defaults?.hueShiftLinkSource,
      layer.hueShiftLinkSource
    )
    layer.depth = clamp01(source.depth ?? defaults?.depth, layer.depth)
    layer.depthLinkSource = normalizeLinkSource(
      source.depthLinkSource ?? defaults?.depthLinkSource,
      layer.depthLinkSource
    )
    layer.positionX = clampSigned(source.positionX ?? defaults?.positionX, layer.positionX)
    layer.positionXLinkSource = normalizeLinkSource(
      source.positionXLinkSource ?? defaults?.positionXLinkSource,
      layer.positionXLinkSource
    )
    layer.positionY = clampSigned(source.positionY ?? defaults?.positionY, layer.positionY)
    layer.positionYLinkSource = normalizeLinkSource(
      source.positionYLinkSource ?? defaults?.positionYLinkSource,
      layer.positionYLinkSource
    )
    layer.rotateX = clampSigned(source.rotateX ?? defaults?.rotateX, layer.rotateX)
    layer.rotateXLinkSource = normalizeLinkSource(
      source.rotateXLinkSource ?? defaults?.rotateXLinkSource,
      layer.rotateXLinkSource
    )
    layer.rotateY = clampSigned(source.rotateY ?? defaults?.rotateY, layer.rotateY)
    layer.rotateYLinkSource = normalizeLinkSource(
      source.rotateYLinkSource ?? defaults?.rotateYLinkSource,
      layer.rotateYLinkSource
    )
    const nextText = source.text ?? defaults?.text
    if (typeof nextText === 'string' && nextText.trim().length > 0) {
      layer.text = nextText.trim()
    }
    layers.push(layer)
  }

  const effects = [...config.effects]
  for (let i = 0; i < modules.effects.length; i++) {
    const source = modules.effects[i]
    const codeSpec = parseEffectModuleCode(source.code)
    const resolvedTypeFromCode = codeSpec?.kind === 'builtin' ? codeSpec.type : undefined
    const isCustomEffect =
      codeSpec?.kind === 'custom' || source.type === 'customModule'
    const type = isCustomEffect
      ? 'customModule'
      : resolvedTypeFromCode ?? source.type ?? builtinEffectTypeList[0]
    if (!builtinEffectTypeList.includes(type)) {
      continue
    }
    const effect = createBuiltinEffect(type)
    const defaults =
      codeSpec?.kind === 'builtin' || codeSpec?.kind === 'custom'
        ? codeSpec.defaults
        : undefined
    if (isCustomEffect) {
      effect.customModuleName =
        source.name?.trim().length > 0
          ? source.name.trim()
          : codeSpec?.kind === 'custom' && codeSpec.name?.trim().length
          ? codeSpec.name.trim()
          : effect.customModuleName
      effect.customModuleCode = typeof source.code === 'string' ? source.code : ''
    }
    effect.enabled = source.enabled ?? effect.enabled
    effect.amount = clamp01(source.amount ?? defaults?.amount, effect.amount)
    effect.linkSource = normalizeLinkSource(
      source.linkSource ?? defaults?.linkSource,
      effect.linkSource
    )
    effects.push(effect)
  }

  const cameraEffects = [...config.cameraEffects]
  for (let i = 0; i < modules.transitions.length; i++) {
    const source = modules.transitions[i]
    const transition = createBuiltinCameraEffect(source.type)
    transition.enabled = source.enabled ?? transition.enabled
    transition.durationBeats = clampInt(source.durationBeats, 1, 32, transition.durationBeats)
    cameraEffects.push(transition)
  }

  return {
    ...config,
    layers,
    effects,
    cameraEffects,
  }
}

function normalizeGeneratorModule(value: unknown): VisualizerGeneratorModule | null {
  if (value === null || typeof value !== 'object') {
    return null
  }
  const source = value as {
    name?: unknown
    generator?: unknown
    code?: unknown
    enabled?: unknown
    density?: unknown
    speed?: unknown
    scale?: unknown
    mix?: unknown
    blend?: unknown
    hueShift?: unknown
    hueShiftLinkSource?: unknown
    depth?: unknown
    depthLinkSource?: unknown
    positionX?: unknown
    positionXLinkSource?: unknown
    positionY?: unknown
    positionYLinkSource?: unknown
    rotateX?: unknown
    rotateXLinkSource?: unknown
    rotateY?: unknown
    rotateYLinkSource?: unknown
    text?: unknown
  }
  const parsedCode = parseGeneratorModuleCode(
    typeof source.code === 'string' ? source.code : undefined
  )
  const resolvedGenerator =
    parsedCode?.kind === 'builtin'
      ? parsedCode.generator
      : parsedCode?.kind === 'custom'
      ? 'customModule'
      : source.generator
  if (
    resolvedGenerator !== undefined &&
    !builtinGeneratorTypeList.includes(resolvedGenerator as BuiltinGeneratorType)
  ) {
    return null
  }
  const parsedName =
    parsedCode?.kind === 'custom' && typeof parsedCode.name === 'string'
      ? parsedCode.name.trim()
      : ''
  return {
    name:
      typeof source.name === 'string' && source.name.trim().length > 0
        ? source.name.trim()
        : parsedName.length > 0
        ? parsedName
        : `Generator`,
    generator: resolvedGenerator as BuiltinGeneratorType | undefined,
    code: typeof source.code === 'string' ? source.code : undefined,
    enabled: source.enabled !== false,
    density: clamp01(source.density, 0.55),
    speed: clamp01(source.speed, 0.5),
    scale: clamp01(source.scale, 0.55),
    mix: clamp01(source.mix, 0.72),
    blend: builtinBlendModeList.includes(source.blend as BuiltinLayerItem['blend'])
      ? (source.blend as BuiltinLayerItem['blend'])
      : 'alpha',
    hueShift: clamp01(source.hueShift, 0),
    hueShiftLinkSource: normalizeLinkSource(source.hueShiftLinkSource, 'none'),
    depth: clamp01(source.depth, 0.5),
    depthLinkSource: normalizeLinkSource(source.depthLinkSource, 'none'),
    positionX: clampSigned(source.positionX, 0),
    positionXLinkSource: normalizeLinkSource(source.positionXLinkSource, 'none'),
    positionY: clampSigned(source.positionY, 0),
    positionYLinkSource: normalizeLinkSource(source.positionYLinkSource, 'none'),
    rotateX: clampSigned(source.rotateX, 0),
    rotateXLinkSource: normalizeLinkSource(source.rotateXLinkSource, 'none'),
    rotateY: clampSigned(source.rotateY, 0),
    rotateYLinkSource: normalizeLinkSource(source.rotateYLinkSource, 'none'),
    text:
      typeof source.text === 'string' && source.text.trim().length > 0
        ? source.text.trim()
        : 'Captivate',
  }
}

function normalizeEffectModule(value: unknown): VisualizerEffectModule | null {
  if (value === null || typeof value !== 'object') {
    return null
  }
  const source = value as {
    name?: unknown
    type?: unknown
    code?: unknown
    enabled?: unknown
    amount?: unknown
    linkSource?: unknown
  }
  const parsedCode = parseEffectModuleCode(
    typeof source.code === 'string' ? source.code : undefined
  )
  const resolvedType =
    parsedCode?.kind === 'builtin'
      ? parsedCode.type
      : parsedCode?.kind === 'custom'
      ? 'customModule'
      : source.type
  if (
    resolvedType !== undefined &&
    !builtinEffectTypeList.includes(resolvedType as BuiltinEffectType)
  ) {
    return null
  }
  const parsedName =
    parsedCode?.kind === 'custom' && typeof parsedCode.name === 'string'
      ? parsedCode.name.trim()
      : ''
  return {
    name:
      typeof source.name === 'string' && source.name.trim().length > 0
        ? source.name.trim()
        : parsedName.length > 0
        ? parsedName
        : `Effect`,
    type: resolvedType as BuiltinEffectType | undefined,
    code: typeof source.code === 'string' ? source.code : undefined,
    enabled: source.enabled !== false,
    amount: clamp01(source.amount, 0.5),
    linkSource: normalizeLinkSource(source.linkSource, 'none'),
  }
}

function normalizeTransitionModule(value: unknown): VisualizerTransitionModule | null {
  if (value === null || typeof value !== 'object') {
    return null
  }
  const source = value as {
    name?: unknown
    type?: unknown
    enabled?: unknown
    durationBeats?: unknown
  }
  if (
    !builtinCameraEffectTypeList.includes(source.type as BuiltinCameraEffectType)
  ) {
    return null
  }
  return {
    name:
      typeof source.name === 'string' && source.name.trim().length > 0
        ? source.name.trim()
        : `Transition`,
    type: source.type as BuiltinCameraEffectType,
    enabled: source.enabled !== false,
    durationBeats: clampInt(source.durationBeats, 1, 32, 4),
  }
}

function normalizeLinkSource(
  source: unknown,
  fallback: BuiltinEffectLinkSource
): BuiltinEffectLinkSource {
  return builtinEffectLinkSourceList.includes(source as BuiltinEffectLinkSource)
    ? (source as BuiltinEffectLinkSource)
    : fallback
}

function createGeneratorModuleCode(generator: BuiltinProceduralGeneratorType) {
  const defaults = createBuiltinLayer(generator, 0)
  return `({
  generator: '${generator}',
  defaults: {
    density: ${defaults.density},
    speed: ${defaults.speed},
    scale: ${defaults.scale},
    mix: ${defaults.mix},
    blend: '${defaults.blend}',
    hueShift: ${defaults.hueShift},
    hueShiftLinkSource: '${defaults.hueShiftLinkSource}',
    depth: ${defaults.depth},
    depthLinkSource: '${defaults.depthLinkSource}',
    positionX: ${defaults.positionX},
    positionXLinkSource: '${defaults.positionXLinkSource}',
    positionY: ${defaults.positionY},
    positionYLinkSource: '${defaults.positionYLinkSource}',
    rotateX: ${defaults.rotateX},
    rotateXLinkSource: '${defaults.rotateXLinkSource}',
    rotateY: ${defaults.rotateY},
    rotateYLinkSource: '${defaults.rotateYLinkSource}',
    text: '${escapeStringForCode(defaults.text)}'
  }
})`
}

function createEffectModuleCode(type: BuiltinRenderableEffectType) {
  const defaults = createBuiltinEffect(type)
  return `({
  type: '${type}',
  defaults: {
    amount: ${defaults.amount},
    linkSource: '${defaults.linkSource}'
  }
})`
}

type ParsedGeneratorModuleCode =
  | {
      kind: 'builtin'
      generator: BuiltinProceduralGeneratorType
      defaults?: Partial<BuiltinLayerItem>
    }
  | {
      kind: 'custom'
      name?: string
      defaults?: Partial<BuiltinLayerItem>
    }

function parseGeneratorModuleCode(code: string | undefined):
  | ParsedGeneratorModuleCode
  | undefined {
  if (typeof code !== 'string' || code.trim().length === 0) {
    return undefined
  }
  const parsed = evaluateModuleCode(code)
  if (parsed === null || typeof parsed !== 'object') {
    return undefined
  }
  const source = parsed as {
    generator?: unknown
    name?: unknown
    kind?: unknown
    defaults?: unknown
    build?: unknown
    onBuild?: unknown
    create?: unknown
    update?: unknown
    onUpdate?: unknown
    frame?: unknown
  }
  const defaults =
    source.defaults !== null && typeof source.defaults === 'object'
      ? (source.defaults as Partial<BuiltinLayerItem>)
      : undefined
  const hasRuntimeHooks =
    typeof source.build === 'function' ||
    typeof source.onBuild === 'function' ||
    typeof source.create === 'function' ||
    typeof source.update === 'function' ||
    typeof source.onUpdate === 'function' ||
    typeof source.frame === 'function'
  const generator = source.generator as BuiltinGeneratorType | undefined
  const isCustom =
    source.kind === 'custom' || generator === 'customModule' || hasRuntimeHooks
  if (isCustom) {
    return {
      kind: 'custom',
      name: typeof source.name === 'string' ? source.name : undefined,
      defaults,
    }
  }
  if (!builtinGeneratorTypeList.includes(generator as BuiltinGeneratorType)) {
    return undefined
  }
  return {
    kind: 'builtin',
    generator: generator as BuiltinProceduralGeneratorType,
    defaults,
  }
}

type ParsedEffectModuleCode =
  | {
      kind: 'builtin'
      type: BuiltinRenderableEffectType
      defaults?: {
        amount?: unknown
        linkSource?: unknown
      }
    }
  | {
      kind: 'custom'
      name?: string
      defaults?: {
        amount?: unknown
        linkSource?: unknown
      }
    }

function parseEffectModuleCode(code: string | undefined):
  | ParsedEffectModuleCode
  | undefined {
  if (typeof code !== 'string' || code.trim().length === 0) {
    return undefined
  }
  const parsed = evaluateModuleCode(code)
  if (parsed === null || typeof parsed !== 'object') {
    return undefined
  }
  const source = parsed as {
    type?: unknown
    name?: unknown
    kind?: unknown
    defaults?: unknown
    apply?: unknown
    onFrame?: unknown
    update?: unknown
  }
  const defaults =
    source.defaults !== null && typeof source.defaults === 'object'
      ? (source.defaults as { amount?: unknown; linkSource?: unknown })
      : undefined
  const hasRuntimeHooks =
    typeof source.apply === 'function' ||
    typeof source.onFrame === 'function' ||
    typeof source.update === 'function'
  const type = source.type as BuiltinEffectType | undefined
  const isCustom = source.kind === 'custom' || type === 'customModule' || hasRuntimeHooks
  if (isCustom) {
    return {
      kind: 'custom',
      name: typeof source.name === 'string' ? source.name : undefined,
      defaults,
    }
  }
  if (!builtinEffectTypeList.includes(type as BuiltinEffectType)) {
    return undefined
  }
  return {
    kind: 'builtin',
    type: type as BuiltinRenderableEffectType,
    defaults,
  }
}

function evaluateModuleCode(code: string): unknown {
  try {
    return Function(`"use strict"; return (${code});`)()
  } catch {
    return undefined
  }
}

function escapeStringForCode(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function clamp01(value: unknown, fallback: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(1, Math.max(0, numeric))
}

function clampSigned(value: unknown, fallback: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(1, Math.max(-1, numeric))
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, Math.round(numeric)))
}
