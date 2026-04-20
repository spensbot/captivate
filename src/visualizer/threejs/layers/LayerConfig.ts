import {
  BuiltinVisualizerConfig,
  initBuiltinVisualizerConfig,
  normBuiltinVisCfg,
} from './BuiltinVisualizer'

export type VisualizerContainerType = 'builtin'
export type VisualizerPreviewAspectRatio = '16:9' | '4:3'

export interface ProjectionMappingCorner {
  x: number
  y: number
}

export interface ProjectionMappingRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ProjectionMappingOutput {
  id: string
  name: string
  enabled: boolean
  sourceRect: ProjectionMappingRect
  corners: [
    ProjectionMappingCorner,
    ProjectionMappingCorner,
    ProjectionMappingCorner,
    ProjectionMappingCorner
  ]
}

export interface ProjectionMappingConfig {
  enabled: boolean
  showAlignmentGrid: boolean
  showKeystoneGrid: boolean
  showSelectedOutputGrid: boolean
  activeOutputId: string | null
  outputs: ProjectionMappingOutput[]
}

export interface LayerConfig {
  container: VisualizerContainerType
  previewAspectRatio: VisualizerPreviewAspectRatio
  projectionMapping: ProjectionMappingConfig
  builtin: BuiltinVisualizerConfig
}

export const visualizerContainerTypeList: VisualizerContainerType[] = ['builtin']
export const visualizerPreviewAspectRatioList: VisualizerPreviewAspectRatio[] = [
  '16:9',
  '4:3',
]

export function initLayerConfig(
  container: VisualizerContainerType = 'builtin'
): LayerConfig {
  return {
    container,
    previewAspectRatio: '16:9',
    projectionMapping: initProjectionMappingConfig(),
    builtin: initBuiltinVisualizerConfig(),
  }
}

/** Normalize saved layer JSON (builtin container, projection map, etc.). */
export function normLayerCfg(source: unknown): LayerConfig {
  const defaults = initLayerConfig('builtin')
  const input = (source ?? {}) as {
    previewAspectRatio?: unknown
    projectionMapping?: unknown
    builtin?: unknown
  }

  return {
    container: 'builtin',
    previewAspectRatio: visPreviewRatioOk(input.previewAspectRatio)
      ? input.previewAspectRatio
      : defaults.previewAspectRatio,
    projectionMapping: normProjMapCfg(input.projectionMapping),
    builtin: normBuiltinVisCfg(input.builtin),
  }
}

/** True if `value` is a known visualizer container id. */
export function visContainerType(
  value: unknown
): value is VisualizerContainerType {
  return value === 'builtin'
}

/** Preview aspect string is one we support (16:9 / 4:3). */
export function visPreviewRatioOk(
  value: unknown
): value is VisualizerPreviewAspectRatio {
  return value === '16:9' || value === '4:3'
}

export const visualizerContainerDisplayName: Record<
  VisualizerContainerType,
  string
> = {
  builtin: 'Built-in (Three.js)',
}

export const visualizerPreviewAspectRatioDisplayName: Record<
  VisualizerPreviewAspectRatio,
  string
> = {
  '16:9': '16:9 (Widescreen)',
  '4:3': '4:3 (Classic)',
}

export function initProjectionMappingConfig(): ProjectionMappingConfig {
  const output = createProjectionMappingOutput('Output 1')
  return {
    enabled: false,
    showAlignmentGrid: true,
    showKeystoneGrid: true,
    showSelectedOutputGrid: false,
    activeOutputId: output.id,
    outputs: [output],
  }
}

function clampCorner(value: unknown): ProjectionMappingCorner {
  const input = (value ?? {}) as Partial<ProjectionMappingCorner>
  const xRaw = Number(input.x)
  const yRaw = Number(input.y)
  const x = Number.isFinite(xRaw) ? Math.max(-0.5, Math.min(1.5, xRaw)) : 0
  const y = Number.isFinite(yRaw) ? Math.max(-0.5, Math.min(1.5, yRaw)) : 0
  return { x, y }
}

function clampRect(value: unknown): ProjectionMappingRect {
  const input = (value ?? {}) as Partial<ProjectionMappingRect>
  const xRaw = Number(input.x)
  const yRaw = Number(input.y)
  const widthRaw = Number(input.width)
  const heightRaw = Number(input.height)
  const x = Number.isFinite(xRaw) ? Math.max(0, Math.min(1, xRaw)) : 0
  const y = Number.isFinite(yRaw) ? Math.max(0, Math.min(1, yRaw)) : 0
  const maxWidth = Math.max(0.001, 1 - x)
  const maxHeight = Math.max(0.001, 1 - y)
  const width = Number.isFinite(widthRaw)
    ? Math.max(0.001, Math.min(maxWidth, widthRaw))
    : maxWidth
  const height = Number.isFinite(heightRaw)
    ? Math.max(0.001, Math.min(maxHeight, heightRaw))
    : maxHeight
  return { x, y, width, height }
}

function createProjectionMappingOutput(name: string): ProjectionMappingOutput {
  return {
    id: `pm-out-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`,
    name,
    enabled: true,
    sourceRect: { x: 0, y: 0, width: 1, height: 1 },
    corners: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
  }
}

/** One projection output from saved JSON (corners + crop rect). */
function normProjMapOut(
  value: unknown,
  index: number
): ProjectionMappingOutput {
  const defaults = createProjectionMappingOutput(`Output ${index + 1}`)
  const input = (value ?? {}) as Partial<ProjectionMappingOutput> & {
    corners?: unknown
    sourceRect?: unknown
  }
  const rawCorners = Array.isArray(input.corners) ? input.corners : defaults.corners
  const corners: ProjectionMappingOutput['corners'] = [
    clampCorner(rawCorners[0] ?? defaults.corners[0]),
    clampCorner(rawCorners[1] ?? defaults.corners[1]),
    clampCorner(rawCorners[2] ?? defaults.corners[2]),
    clampCorner(rawCorners[3] ?? defaults.corners[3]),
  ]
  return {
    id:
      typeof input.id === 'string' && input.id.trim().length > 0
        ? input.id
        : defaults.id,
    name:
      typeof input.name === 'string' && input.name.trim().length > 0
        ? input.name.trim()
        : defaults.name,
    enabled: input.enabled !== false,
    sourceRect: clampRect(input.sourceRect ?? defaults.sourceRect),
    corners,
  }
}

/** Full projection-mapping block from saved JSON. */
export function normProjMapCfg(
  source: unknown
): ProjectionMappingConfig {
  const defaults = initProjectionMappingConfig()
  const input = (source ?? {}) as Partial<ProjectionMappingConfig> & {
    activeOutputId?: unknown
    outputs?: unknown
  }
  const rawOutputs = Array.isArray(input.outputs) ? input.outputs : []
  let outputs = rawOutputs
    .map((output, index) => normProjMapOut(output, index))
    .filter((output) => output.enabled)
  if (outputs.length <= 0) {
    outputs = [createProjectionMappingOutput('Output 1')]
  }
  const activeOutputId =
    typeof input.activeOutputId === 'string' &&
    outputs.some((output) => output.id === input.activeOutputId)
      ? input.activeOutputId
      : outputs[0]?.id ?? defaults.activeOutputId
  return {
    enabled: input.enabled === true,
    showAlignmentGrid: input.showAlignmentGrid !== false,
    showKeystoneGrid: input.showKeystoneGrid !== false,
    showSelectedOutputGrid: input.showSelectedOutputGrid === true,
    activeOutputId,
    outputs,
  }
}
