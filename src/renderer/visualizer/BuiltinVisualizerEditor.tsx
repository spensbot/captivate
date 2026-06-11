import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
  type CSSProperties,
} from 'react'
import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import { useActiveLightScene } from '../redux/store'
import { realtimeStore } from '../redux/realtimeStore'
import {
  BuiltinEffectType,
  BuiltinEffectLinkSource,
  BuiltinGeneratorType,
  BuiltinCameraEffectType,
  BuiltinLayerSourceType,
  BuiltinVisualizerConfig,
  builtinBlendDisplayName,
  builtinBlendModeList,
  builtinCameraEffectDisplayName,
  builtinCameraEffectTypeList,
  builtinEffectDisplayName,
  builtinEffectLinkSourceDisplayName,
  builtinEffectLinkSourceList,
  builtinEffectTypeList,
  builtinGeneratorDisplayName,
  builtinGeneratorTypeList,
  builtinLayerSourceDisplayName,
  builtinLayerSourceTypeList,
  createBuiltinCameraEffect,
  createBuiltinEffect,
  createBuiltinLayer,
  isMediaFileSourceType,
  layerUsesVisBackdropLayout,
  normBuiltinVisCfg,
  proceduralLayerControlSupport,
  type BuiltinMediaFitMode,
} from '../../visualizer/threejs/layers/BuiltinVisualizer'
import { visSplitIdx } from '../scenes/splitUiVisibility'
import {
  getLocalDirectories,
  getLocalFilepaths,
  listProjectMPresets,
  listProjectMPresetsInDirectory,
  visNdiList,
  readTextFile,
} from '../ipcHandler'
import { loadFile, saveFile } from '../autosave'
import { setBaseParams } from '../redux/controlSlice'
import { openAppAlert } from '../overlays/appDialogService'
import BusyModal from '../overlays/BusyModal'
import useStandardBusy from '../hooks/useStandardBusy'
import { ProjectMPresetOption } from '../../shared/projectm'
import AppModal from '../overlays/AppModal'
import {
  sumBuiltinVisSliders,
  VisualSliderParam,
} from './visualSliderAssignments'
import { defaultOutputParams } from '../../shared/params'

interface Props {
  config: BuiltinVisualizerConfig
  onChange: (newConfig: BuiltinVisualizerConfig) => void
}

const layerCreateGeneratorTypes = builtinGeneratorTypeList.filter(
  (generator) => generator !== 'customModule'
)
const effectCreateTypes = builtinEffectTypeList.filter(
  (type) => type !== 'customModule'
)
const SHAPE_QUANTITY_GENERATORS: BuiltinGeneratorType[] = [
  'spheres',
  'cubes',
  'triangles',
  'particles',
]
const VISUALIZER_SCENE_SCHEMA = 'captivate.visualizer.scene'
const VISUALIZER_SCENE_VERSION = 1
const PROJECTM_PRESET_DIRECTORY_STORAGE_KEY =
  'captivate.visualizer.projectmPresetDirectory'
const INLINE_PROJECTM_PRESET_PAGE_SIZE = 10
const LIVE_PARAMS_THROTTLE_MS = 120

function shallowEqualNumberRecord(
  a: { [key: string]: number | undefined },
  b: { [key: string]: number | undefined }
) {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    if (a[key] !== b[key]) return false
  }
  return true
}

function loadStoredProjectMPresetDirectory() {
  try {
    return window.localStorage.getItem(PROJECTM_PRESET_DIRECTORY_STORAGE_KEY) ?? ''
  } catch (_err) {
    return ''
  }
}

function readOutputParamsSnapshot(splitIndex: number) {
  return (
    realtimeStore.getState().splitStates[splitIndex]?.outputParams ??
    defaultOutputParams()
  )
}

function useThrottledOutputParams(splitIndex: number, intervalMs = LIVE_PARAMS_THROTTLE_MS) {
  const [params, setParams] = useState<{ [key: string]: number | undefined }>(() =>
    readOutputParamsSnapshot(splitIndex)
  )

  useEffect(() => {
    let disposed = false
    let lastCommitAt = 0
    let timer: number | null = null

    const commit = () => {
      if (disposed) return
      const next = readOutputParamsSnapshot(splitIndex)
      setParams((current) =>
        shallowEqualNumberRecord(current, next) ? current : next
      )
      lastCommitAt = performance.now()
    }

    const unsubscribe = realtimeStore.subscribe(() => {
      const now = performance.now()
      const elapsed = now - lastCommitAt
      if (elapsed >= intervalMs) {
        commit()
        return
      }
      if (timer !== null) return
      const waitMs = Math.max(0, intervalMs - elapsed)
      timer = window.setTimeout(() => {
        timer = null
        commit()
      }, waitMs)
    })

    commit()

    return () => {
      disposed = true
      unsubscribe()
      if (timer !== null) {
        window.clearTimeout(timer)
      }
    }
  }, [splitIndex, intervalMs])

  return params
}

type LayerLinkKey =
  | 'densityLinkSource'
  | 'quantityLinkSource'
  | 'varietyLinkSource'
  | 'speedLinkSource'
  | 'scaleLinkSource'
  | 'hueShiftLinkSource'
  | 'mixLinkSource'
  | 'depthLinkSource'
  | 'positionXLinkSource'
  | 'positionYLinkSource'
  | 'rotateXLinkSource'
  | 'rotateYLinkSource'

type EffectLinkKey = 'linkSource' | 'lightAzimuthLinkSource'

type LinkPickerState =
  | {
      kind: 'layer'
      title: string
      description: string
      index: number
      key: LayerLinkKey
    }
  | {
      kind: 'effect'
      title: string
      description: string
      index: number
      key: EffectLinkKey
    }

export default function BuiltinVisualizerEditor({ config, onChange }: Props) {
  const dispatch = useDispatch()
  const visualizerSplitIndex = useActiveLightScene((scene) =>
    visSplitIdx(scene.splitScenes)
  )
  const visualizerBaseParams = useActiveLightScene(
    (scene) => scene.splitScenes[visualizerSplitIndex]?.baseParams ?? {}
  )
  const visualizerOutputParams = useThrottledOutputParams(visualizerSplitIndex)
  const availableLinkSources = builtinEffectLinkSourceList

  const syncLinkedSetpoint = (
    linkSource: BuiltinEffectLinkSource,
    value: number,
    min: number,
    max: number
  ) => {
    const key = toVisualSliderParam(linkSource)
    if (key === null || visualizerSplitIndex < 0) {
      return
    }
    dispatch(
      setBaseParams({
        splitIndex: visualizerSplitIndex,
        params: {
          [key]: toRangeRatio(value, min, max),
        },
      })
    )
  }

  const patch = (next: Partial<BuiltinVisualizerConfig>) => {
    onChange({
      ...config,
      ...next,
    })
  }
  const [moduleBusy, setModuleBusy] = useState(false)
  const { busy, busyMessage, startBusy, stopBusy } = useStandardBusy()
  const [codeEditor, setCodeEditor] = useState<{
    layerIndex: number
    moduleName: string
    code: string
  } | null>(null)
  const [linkPicker, setLinkPicker] = useState<LinkPickerState | null>(null)
  const visualSliderAssignmentSummary = useMemo(
    () => sumBuiltinVisSliders(config),
    [config]
  )
  const hasProjectMLayers = useMemo(
    () => config.layers.some((layer) => layer.sourceType === 'projectM'),
    [config.layers]
  )
  const [projectMPresetOptions, setProjectMPresetOptions] = useState<
    ProjectMPresetOption[]
  >([])
  const [projectMPresetLoading, setProjectMPresetLoading] = useState(false)
  const [projectMPresetMessage, setProjectMPresetMessage] = useState('')
  const [projectMPresetDirectory, setProjectMPresetDirectory] = useState(
    () => loadStoredProjectMPresetDirectory()
  )
  const [projectMPresetQueryByLayer, setProjectMPresetQueryByLayer] = useState<
    Record<string, string>
  >({})
  const [projectMPresetPageByLayer, setProjectMPresetPageByLayer] = useState<
    Record<string, number>
  >({})
  const inlineProjectMScanSeqRef = useRef(0)
  const inlineProjectMAutoLoadedDirectoryRef = useRef<string | null>(null)
  const [ndiSourcesScan, setNdiSourcesScan] = useState<{
    sources: string[]
    loading: boolean
    hint: string
  }>({ sources: [], loading: false, hint: '' })

  const refreshInlineProjectMPresets = useCallback(async (
    directoryOverride?: string,
    options?: { immediateBusy?: boolean }
  ) => {
    const scanSeq = ++inlineProjectMScanSeqRef.current
    const busyRequestId = startBusy(
      {
        title: 'projectM Presets',
        message: 'Loading projectM presets...',
      },
      { immediate: options?.immediateBusy === true }
    )
    setProjectMPresetLoading(true)
    try {
      const selectedDirectory =
        typeof directoryOverride === 'string' ? directoryOverride.trim() : ''
      const result =
        selectedDirectory.length > 0
          ? await listProjectMPresetsInDirectory(selectedDirectory)
          : await listProjectMPresets()
      if (scanSeq !== inlineProjectMScanSeqRef.current) {
        return null
      }
      setProjectMPresetOptions(result.presets)
      setProjectMPresetMessage(result.message)
      return result
    } catch (error) {
      if (scanSeq !== inlineProjectMScanSeqRef.current) {
        return null
      }
      setProjectMPresetOptions([])
      setProjectMPresetMessage(
        error instanceof Error
          ? error.message
          : 'Failed to load projectM presets.'
      )
      return null
    } finally {
      if (scanSeq === inlineProjectMScanSeqRef.current) {
        setProjectMPresetLoading(false)
      }
      stopBusy(busyRequestId)
    }
  }, [startBusy, stopBusy])

  const chooseInlineProjectMDirectory = useCallback(async () => {
    try {
      const directories = await getLocalDirectories('Select projectM preset directory')
      const selected = directories[0]
      if (typeof selected !== 'string' || selected.trim().length <= 0) {
        return
      }
      inlineProjectMAutoLoadedDirectoryRef.current = selected.trim()
      setProjectMPresetDirectory(selected)
      await refreshInlineProjectMPresets(selected, { immediateBusy: true })
    } catch (_error) {
      // User cancelled.
    }
  }, [refreshInlineProjectMPresets])

  useEffect(() => {
    if (!hasProjectMLayers) {
      inlineProjectMAutoLoadedDirectoryRef.current = null
      return
    }
    const directoryKey = projectMPresetDirectory.trim()
    if (inlineProjectMAutoLoadedDirectoryRef.current === directoryKey) {
      return
    }
    inlineProjectMAutoLoadedDirectoryRef.current = directoryKey
    void refreshInlineProjectMPresets(projectMPresetDirectory)
  }, [
    hasProjectMLayers,
    projectMPresetDirectory,
    refreshInlineProjectMPresets,
  ])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PROJECTM_PRESET_DIRECTORY_STORAGE_KEY,
        projectMPresetDirectory.trim()
      )
    } catch (_err) {
      // Ignore storage write failures.
    }
  }, [projectMPresetDirectory])

  const saveSceneToFile = async () => {
    if (moduleBusy) return
    setModuleBusy(true)
    startBusy({
      title: 'Visualizer',
      message: 'Saving visualizer scene...',
    })
    try {
      const payload = JSON.stringify(
        {
          schema: VISUALIZER_SCENE_SCHEMA,
          version: VISUALIZER_SCENE_VERSION,
          exportedAt: new Date().toISOString(),
          scene: config,
        },
        null,
        2
      )
      const saveResult = await saveFile('Save Visualizer Scene', payload, [
        {
          name: 'Captivate Visualizer Scene',
          extensions: ['captivate-visscene', 'json'],
        },
      ])
      if (saveResult === null) {
        return
      }
    } catch (err) {
      if (!isCancelledDialogError(err)) {
        void openAppAlert({
          title: 'Visualizer Scene',
          message: `Failed to save visualizer scene: ${String(err)}`,
          level: 'error',
          source: 'Visualizer',
        })
      }
    } finally {
      stopBusy()
      setModuleBusy(false)
    }
  }

  const importSceneFromFile = async () => {
    if (moduleBusy) return
    setModuleBusy(true)
    startBusy({
      title: 'Visualizer',
      message: 'Importing visualizer scene...',
    })
    try {
      const loaded = await loadFile('Import Visualizer Scene', [
        {
          name: 'Captivate Visualizer Scene',
          extensions: ['captivate-visscene', 'json'],
        },
      ])
      if (loaded === null) {
        return
      }
      const parsed = JSON.parse(loaded.content) as
        | {
            schema?: unknown
            version?: unknown
            scene?: unknown
          }
        | BuiltinVisualizerConfig
      const source =
        typeof parsed === 'object' &&
        parsed !== null &&
        'schema' in parsed &&
        parsed.schema === VISUALIZER_SCENE_SCHEMA &&
        Number((parsed as { version?: unknown }).version) ===
          VISUALIZER_SCENE_VERSION
          ? (parsed as { scene?: unknown }).scene
          : parsed
      onChange(normBuiltinVisCfg(source))
    } catch (err) {
      if (!isCancelledDialogError(err)) {
        void openAppAlert({
          title: 'Visualizer Scene',
          message: `Failed to import visualizer scene: ${String(err)}`,
          level: 'error',
          source: 'Visualizer',
        })
      }
    } finally {
      stopBusy()
      setModuleBusy(false)
    }
  }

  const openLayerCodeEditor = (layerIndex: number) => {
    const layer = config.layers[layerIndex]
    if (!layer || layer.generator !== 'customModule') {
      return
    }
    setCodeEditor({
      layerIndex,
      moduleName: layer.customModuleName,
      code: layer.customModuleCode,
    })
  }

  const applyLayerCodeEditor = () => {
    if (codeEditor === null) {
      return
    }
    const moduleName = codeEditor.moduleName.trim()
    updateLayer(config, patch, codeEditor.layerIndex, {
      customModuleName:
        moduleName.length > 0 ? moduleName : `Custom Generator ${codeEditor.layerIndex + 1}`,
      customModuleCode: codeEditor.code,
    })
    setCodeEditor(null)
  }

  const openLayerCodeFile = async (layerIndex: number) => {
    const layer = config.layers[layerIndex]
    if (!layer || layer.generator !== 'customModule') {
      return
    }

    try {
      startBusy({
        title: 'Visualizer',
        message: 'Opening custom generator code...',
      })
      const filepaths = await getLocalFilepaths('Open Custom Generator Code', [
        {
          name: 'JavaScript / TypeScript',
          extensions: ['js', 'mjs', 'cjs', 'ts', 'txt'],
        },
      ])
      if (filepaths.length === 0) {
        return
      }
      const filepath = filepaths[0]
      const code = await readTextFile(filepath)
      const fileName = basenameWithoutExt(filepath)
      updateLayer(config, patch, layerIndex, {
        customModuleName:
          fileName.length > 0 ? fileName : layer.customModuleName,
        customModuleCode: code,
      })
    } catch (err) {
      if (!isCancelledDialogError(err)) {
        void openAppAlert({
          title: 'Custom Generator',
          message: `Failed to open custom generator code: ${String(err)}`,
          level: 'error',
          source: 'Visualizer',
        })
      }
    } finally {
      stopBusy()
    }
  }

  const saveLayerCodeFile = async (layerIndex: number) => {
    const layer = config.layers[layerIndex]
    if (!layer || layer.generator !== 'customModule') {
      return
    }

    try {
      startBusy({
        title: 'Visualizer',
        message: 'Saving custom generator code...',
      })
      const codeSaveResult = await saveFile(
        `Save Custom Generator Code (${layer.customModuleName || `layer-${layerIndex + 1}`})`,
        layer.customModuleCode,
        [
          {
            name: 'JavaScript / TypeScript',
            extensions: ['js', 'mjs', 'cjs', 'ts', 'txt'],
          },
        ]
      )
      if (codeSaveResult === null) {
        return
      }
    } catch (err) {
      if (!isCancelledDialogError(err)) {
        void openAppAlert({
          title: 'Custom Generator',
          message: `Failed to save custom generator code: ${String(err)}`,
          level: 'error',
          source: 'Visualizer',
        })
      }
    } finally {
      stopBusy()
    }
  }

  const openLayerLinkPicker = (
    layerIndex: number,
    key: LayerLinkKey,
    title: string
  ) => {
    const layer = config.layers[layerIndex]
    if (!layer) return
    setLinkPicker({
      kind: 'layer',
      title,
      description: `Assign ${title.toLowerCase()} to a visual slider.`,
      index: layerIndex,
      key,
    })
  }

  const openEffectLinkPicker = (
    effectIndex: number,
    key: EffectLinkKey = 'linkSource',
    title?: string,
    description?: string
  ) => {
    const effect = config.effects[effectIndex]
    if (!effect) return
    const isAzimuth = key === 'lightAzimuthLinkSource'
    setLinkPicker({
      kind: 'effect',
      title:
        title ??
        (isAzimuth
          ? `Effect ${effectIndex + 1} Rim Light Azimuth Link`
          : `Effect ${effectIndex + 1} Amount Link`),
      description:
        description ??
        (isAzimuth
          ? 'Assign rim light azimuth to a visual slider.'
          : 'Assign this effect amount to a visual slider.'),
      index: effectIndex,
      key,
    })
  }

  const currentPickerSource: BuiltinEffectLinkSource =
    linkPicker === null
      ? 'none'
      : linkPicker.kind === 'layer'
      ? config.layers[linkPicker.index]?.[linkPicker.key] ?? 'none'
      : linkPicker.kind === 'effect'
      ? linkPicker.key === 'linkSource'
        ? config.effects[linkPicker.index]?.linkSource ?? 'none'
        : config.effects[linkPicker.index]?.lightAzimuthLinkSource ?? 'none'
      : 'none'

  const applyPickerSource = (source: BuiltinEffectLinkSource) => {
    if (linkPicker === null) {
      return
    }
    if (linkPicker.kind === 'layer') {
      updateLayer(config, patch, linkPicker.index, {
        [linkPicker.key]: source,
      })
    } else if (linkPicker.key === 'linkSource') {
      updateEffect(config, patch, linkPicker.index, {
        linkSource: source,
      })
    } else {
      updateEffect(config, patch, linkPicker.index, {
        lightAzimuthLinkSource: source,
      })
    }
  }

  return (
    <Root>
      <HeaderRow>
        <Title>Built-in 3D Visualizer</Title>
        <ToggleRow>
          <SmallButton onClick={() => void importSceneFromFile()} disabled={moduleBusy}>
            Import Scene
          </SmallButton>
          <SmallButton onClick={() => void saveSceneToFile()} disabled={moduleBusy}>
            Save Scene
          </SmallButton>
        </ToggleRow>
        <ToggleRow>
          <Toggle>
            <input
              type="checkbox"
              checked={config.shuffleCameraEffects}
              onChange={(event) =>
                patch({ shuffleCameraEffects: event.target.checked })
              }
            />
            Shuffle Camera Effects
          </Toggle>
        </ToggleRow>
      </HeaderRow>

      <BodyScroll>
        <ColumnsScroller>
          <Columns>
            <Column>
          <ColumnHeader>
            <span>Generated Layers</span>
            <SmallButton
              onClick={() =>
                patch({
                  layers: [
                    ...config.layers,
                    createBuiltinLayer(
                      layerCreateGeneratorTypes[
                        config.layers.length % layerCreateGeneratorTypes.length
                      ],
                      config.layers.length
                    ),
                  ],
                })
              }
            >
              + Layer
            </SmallButton>
          </ColumnHeader>
          <ColumnBody>
            {config.layers.map((layer, index) => (
              <Card key={layer.id}>
                <CardTop>
                  <LayerTitle>{`Layer ${index + 1}`}</LayerTitle>
                  <SmallButton
                    onClick={() => {
                      const layers = config.layers.filter((_, i) => i !== index)
                      patch({ layers })
                    }}
                  >
                    Remove
                  </SmallButton>
                </CardTop>
                <FieldRow>
                  <Label>Source</Label>
                  <Select
                    value={layer.sourceType}
                    onChange={(event) =>
                      updateLayer(config, patch, index, {
                        sourceType: event.target.value as BuiltinLayerSourceType,
                      })
                    }
                  >
                    {builtinLayerSourceTypeList.map((sourceType) => (
                      <option key={sourceType} value={sourceType}>
                        {builtinLayerSourceDisplayName[sourceType]}
                      </option>
                    ))}
                  </Select>
                </FieldRow>
                {layer.sourceType === 'procedural' && (
                  <>
                    <FieldRow>
                      <Label>Generator</Label>
                      <Select
                        value={layer.generator}
                        onChange={(event) =>
                          updateLayer(config, patch, index, {
                            generator: event.target.value as BuiltinGeneratorType,
                          })
                        }
                      >
                        {builtinGeneratorTypeList.map((generator) => (
                          <option key={generator} value={generator}>
                            {builtinGeneratorDisplayName[generator]}
                          </option>
                        ))}
                      </Select>
                    </FieldRow>
                    {layer.generator.startsWith('legacy') && (
                      <HelperText>
                        Classic Captivate 1.03 tribute generator.
                      </HelperText>
                    )}
                    {(layer.generator === 'legacyTextParticles' ||
                      layer.generator === 'legacyTextSpin') && (
                      <FieldRow>
                        <Label>Text</Label>
                        <Input
                          value={layer.text}
                          onChange={(event) =>
                            updateLayer(config, patch, index, {
                              text: event.target.value,
                            })
                          }
                          placeholder="Captivate"
                        />
                      </FieldRow>
                    )}
                    {layer.generator === 'importedModel' && (
                      <>
                        <FieldRow>
                          <Label>Model File</Label>
                          <Input
                            value={layer.source}
                            onChange={(event) =>
                              updateLayer(config, patch, index, {
                                source: event.target.value,
                              })
                            }
                            placeholder="Local .obj or .stl path"
                          />
                          <SmallButton
                            onClick={() =>
                              void browseModelFile((value) =>
                                updateLayer(config, patch, index, { source: value })
                              )
                            }
                          >
                            Browse
                          </SmallButton>
                        </FieldRow>
                        <HelperText>
                          Imported models use OBJ/STL and behave like procedural 3D layers.
                        </HelperText>
                      </>
                    )}
                    {layer.generator === 'customModule' && (
                      <>
                        <FieldRow>
                          <Label>Module Name</Label>
                          <Input
                            value={layer.customModuleName}
                            onChange={(event) =>
                              updateLayer(config, patch, index, {
                                customModuleName: event.target.value,
                              })
                            }
                            placeholder="Custom Generator"
                          />
                        </FieldRow>
                        <FieldColumn>
                          <CodeLabel>Module Code</CodeLabel>
                          <CodeButtonRow>
                            <SmallButton onClick={() => openLayerCodeEditor(index)}>
                              Edit Code
                            </SmallButton>
                            <SmallButton onClick={() => void openLayerCodeFile(index)}>
                              Open File
                            </SmallButton>
                            <SmallButton onClick={() => void saveLayerCodeFile(index)}>
                              Save File
                            </SmallButton>
                          </CodeButtonRow>
                        </FieldColumn>
                      </>
                    )}
                  </>
                )}
                {layer.sourceType === 'projectM' &&
                  (() => {
                    const query = (
                      projectMPresetQueryByLayer[layer.id] ?? ''
                    )
                      .trim()
                      .toLowerCase()
                    const filteredPresetOptions =
                      query.length <= 0
                        ? projectMPresetOptions
                        : projectMPresetOptions.filter((option) =>
                            option.label.toLowerCase().includes(query)
                          )
                    const presetPageCount = Math.max(
                      1,
                      Math.ceil(
                        filteredPresetOptions.length /
                          INLINE_PROJECTM_PRESET_PAGE_SIZE
                      )
                    )
                    const presetPage = Math.min(
                      Math.max(0, projectMPresetPageByLayer[layer.id] ?? 0),
                      Math.max(0, presetPageCount - 1)
                    )
                    const pagedPresetOptions = filteredPresetOptions.slice(
                      presetPage * INLINE_PROJECTM_PRESET_PAGE_SIZE,
                      (presetPage + 1) * INLINE_PROJECTM_PRESET_PAGE_SIZE
                    )
                    const selectedPresetLabel =
                      projectMPresetOptions.find(
                        (option) => option.path === layer.source
                      )?.label ??
                      (layer.source.trim().length > 0
                        ? labelFromPresetPath(layer.source)
                        : 'Runtime Default')

                    return (
                      <ProjectMInlineBrowser>
                        <FieldRow>
                          <Label>Preset</Label>
                          <ProjectMInlineCurrent title={layer.source || 'Runtime Default'}>
                            {selectedPresetLabel}
                          </ProjectMInlineCurrent>
                        </FieldRow>
                        <ProjectMInlineActions>
                          <ProjectMPresetActionButton
                            type="button"
                            onClick={chooseInlineProjectMDirectory}
                          >
                            Directory...
                          </ProjectMPresetActionButton>
                          <ProjectMPresetActionButton
                            type="button"
                            onClick={() =>
                              void refreshInlineProjectMPresets(projectMPresetDirectory)
                            }
                            disabled={projectMPresetLoading}
                          >
                            {projectMPresetLoading ? '...' : 'Reload'}
                          </ProjectMPresetActionButton>
                          <ProjectMPresetActionButton
                            type="button"
                            onClick={() =>
                              updateLayer(config, patch, index, {
                                source: '',
                              })
                            }
                          >
                            Runtime Default
                          </ProjectMPresetActionButton>
                        </ProjectMInlineActions>
                        <ProjectMInlineDirectory title={projectMPresetDirectory}>
                          {projectMPresetDirectory.trim().length > 0
                            ? `Preset Directory: ${projectMPresetDirectory}`
                            : 'Preset Directory: Auto-discovered runtime presets'}
                        </ProjectMInlineDirectory>
                        <ProjectMInlineSearch
                          type="text"
                          placeholder="Search presets..."
                          value={projectMPresetQueryByLayer[layer.id] ?? ''}
                          onChange={(event) => {
                            const value = event.target.value
                            setProjectMPresetQueryByLayer((current) => ({
                              ...current,
                              [layer.id]: value,
                            }))
                            setProjectMPresetPageByLayer((current) => ({
                              ...current,
                              [layer.id]: 0,
                            }))
                          }}
                        />
                        <ProjectMInlineMeta>
                          {filteredPresetOptions.length} preset
                          {filteredPresetOptions.length === 1 ? '' : 's'} found
                        </ProjectMInlineMeta>
                        <ProjectMInlinePager>
                          <ProjectMPresetActionButton
                            type="button"
                            onClick={() =>
                              setProjectMPresetPageByLayer((current) => ({
                                ...current,
                                [layer.id]: Math.max(0, presetPage - 1),
                              }))
                            }
                            disabled={presetPage <= 0}
                          >
                            Prev
                          </ProjectMPresetActionButton>
                          <ProjectMInlineMeta>{`Page ${presetPage + 1} / ${presetPageCount}`}</ProjectMInlineMeta>
                          <ProjectMPresetActionButton
                            type="button"
                            onClick={() =>
                              setProjectMPresetPageByLayer((current) => ({
                                ...current,
                                [layer.id]: Math.min(
                                  Math.max(0, presetPageCount - 1),
                                  presetPage + 1
                                ),
                              }))
                            }
                            disabled={presetPage >= presetPageCount - 1}
                          >
                            Next
                          </ProjectMPresetActionButton>
                        </ProjectMInlinePager>
                        <ProjectMInlineList>
                          {pagedPresetOptions.map((option) => (
                            <ProjectMInlineListItem key={option.path}>
                              <ProjectMInlinePresetButton
                                type="button"
                                $selected={option.path === layer.source}
                                onClick={() =>
                                  updateLayer(config, patch, index, {
                                    source: option.path,
                                  })
                                }
                                title={option.path}
                              >
                                {option.label}
                              </ProjectMInlinePresetButton>
                            </ProjectMInlineListItem>
                          ))}
                          {pagedPresetOptions.length <= 0 && (
                            <ProjectMInlineListItem>
                              <ProjectMInlineEmpty>
                                {projectMPresetLoading
                                  ? 'Loading presets...'
                                  : 'No presets match this filter.'}
                              </ProjectMInlineEmpty>
                            </ProjectMInlineListItem>
                          )}
                        </ProjectMInlineList>
                        {projectMPresetMessage.trim().length > 0 && (
                          <ProjectMInlineMessage title={projectMPresetMessage}>
                            {projectMPresetMessage}
                          </ProjectMInlineMessage>
                        )}
                      </ProjectMInlineBrowser>
                    )
                  })()}
                {layer.sourceType !== 'procedural' &&
                  layer.sourceType !== 'projectM' && (
                    <FieldRow>
                      <Label>
                        {layer.sourceType === 'ndiStream' ? 'NDI source' : 'Path/URL'}
                      </Label>
                      <Input
                        value={layer.source}
                        onChange={(event) =>
                          updateLayer(config, patch, index, {
                            source: event.target.value,
                          })
                        }
                        placeholder={
                          layer.sourceType === 'ndiStream'
                            ? 'Exact NDI source name (from Scan)'
                            : layer.sourceType === 'rtspStream'
                            ? 'rtsp://...'
                            : layer.sourceType === 'videoFile'
                            ? 'Local video path or URL'
                            : 'Local image path or URL'
                        }
                      />
                      {layer.sourceType === 'ndiStream' && (
                        <SmallButton
                          type="button"
                          disabled={ndiSourcesScan.loading}
                          onClick={() => {
                            void (async () => {
                              setNdiSourcesScan({
                                sources: [],
                                loading: true,
                                hint: '',
                              })
                              try {
                                const res = await visNdiList()
                                const hint =
                                  res.sources.length === 0 && res.error.trim().length === 0
                                    ? 'No NDI sources found on the network.'
                                    : res.error
                                setNdiSourcesScan({
                                  sources: res.sources,
                                  loading: false,
                                  hint,
                                })
                              } catch (error) {
                                setNdiSourcesScan({
                                  sources: [],
                                  loading: false,
                                  hint:
                                    error instanceof Error
                                      ? error.message
                                      : 'NDI scan failed.',
                                })
                              }
                            })()
                          }}
                        >
                          {ndiSourcesScan.loading ? 'Scanning…' : 'Scan network'}
                        </SmallButton>
                      )}
                      {(layer.sourceType === 'imageFile' ||
                        layer.sourceType === 'videoFile') && (
                        <SmallButton
                          onClick={() =>
                            void browseMediaFile(layer.sourceType, (value) =>
                              updateLayer(config, patch, index, { source: value })
                            )
                          }
                        >
                          Browse
                        </SmallButton>
                      )}
                    </FieldRow>
                  )}
                {layer.sourceType === 'ndiStream' &&
                  ndiSourcesScan.sources.length > 0 && (
                    <FieldRow>
                      <Label>Pick discovered</Label>
                      <Select
                        aria-label="Choose a discovered NDI source"
                        value={
                          ndiSourcesScan.sources.includes(layer.source)
                            ? layer.source
                            : ''
                        }
                        onChange={(event) => {
                          const value = event.target.value
                          if (value.length > 0) {
                            updateLayer(config, patch, index, { source: value })
                          }
                        }}
                      >
                        <option value="">—</option>
                        {ndiSourcesScan.sources.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </Select>
                    </FieldRow>
                  )}
                {layer.sourceType === 'ndiStream' &&
                  ndiSourcesScan.hint.trim().length > 0 && (
                    <ProjectMInlineMessage title={ndiSourcesScan.hint}>
                      {ndiSourcesScan.hint}
                    </ProjectMInlineMessage>
                  )}
                {layer.sourceType !== 'procedural' &&
                  layer.sourceType !== 'projectM' &&
                  layer.sourceType !== 'ndiStream' &&
                  layer.sourceType !== 'rtspStream' && (
                  <FieldRow>
                    <Label>Fit</Label>
                    <Select
                      value={layer.mediaFit}
                      onChange={(event) =>
                        updateLayer(config, patch, index, {
                          mediaFit: event.target.value as BuiltinMediaFitMode,
                        })
                      }
                    >
                      <option value="fill">Fill screen</option>
                      <option value="object3d">3D object</option>
                    </Select>
                  </FieldRow>
                )}
                {layer.sourceType === 'procedural' &&
                  proceduralLayerControlSupport[layer.generator].density && (
                    <SliderRow>
                      <MiniLabel>Density</MiniLabel>
                      <LinkedRange
                        min={0}
                        max={1}
                        step={0.01}
                        value={layer.density}
                        manualCursorValue={resolveLinkedUnitSliderSetpoint(
                          layer.density,
                          layer.densityLinkSource,
                          visualizerBaseParams
                        )}
                        liveValue={resolveLinkedUnitSliderValue(
                          layer.density,
                          layer.densityLinkSource,
                          visualizerOutputParams
                        )}
                        showLiveCursor={layer.densityLinkSource !== 'none'}
                        onChange={(event) =>
                          (() => {
                            const next = to01(event.target.value)
                            updateLayer(config, patch, index, {
                              density: next,
                            })
                            syncLinkedSetpoint(layer.densityLinkSource, next, 0, 1)
                          })()
                        }
                      />
                      <LinkAssignButton
                        type="button"
                        title="Assign to visual slider"
                        onClick={() =>
                          openLayerLinkPicker(index, 'densityLinkSource', `Layer ${index + 1} Density`)
                        }
                      >
                        ...
                      </LinkAssignButton>
                    </SliderRow>
                  )}
                {layer.sourceType === 'procedural' && (
                  <SliderRow>
                    <MiniLabel>Color</MiniLabel>
                    <LinkedRange
                      min={0}
                      max={1}
                      step={0.01}
                      value={layer.hueShift}
                      manualCursorValue={resolveLinkedUnitSliderSetpoint(
                        layer.hueShift,
                        layer.hueShiftLinkSource,
                        visualizerBaseParams
                      )}
                      liveValue={resolveLinkedUnitSliderValue(
                        layer.hueShift,
                        layer.hueShiftLinkSource,
                        visualizerOutputParams
                      )}
                      showLiveCursor={layer.hueShiftLinkSource !== 'none'}
                      onChange={(event) =>
                        (() => {
                          const next = to01(event.target.value)
                          updateLayer(config, patch, index, {
                            hueShift: next,
                          })
                          syncLinkedSetpoint(layer.hueShiftLinkSource, next, 0, 1)
                        })()
                      }
                    />
                    <LinkAssignButton
                      type="button"
                      title="Assign to visual slider"
                      onClick={() =>
                        openLayerLinkPicker(index, 'hueShiftLinkSource', `Layer ${index + 1} Color`)
                      }
                    >
                      ...
                    </LinkAssignButton>
                  </SliderRow>
                )}
                {layer.sourceType === 'procedural' &&
                  SHAPE_QUANTITY_GENERATORS.includes(layer.generator) && (
                    <>
                      <SliderRow>
                        <MiniLabel>Quantity</MiniLabel>
                        <LinkedRange
                          min={0}
                          max={1}
                          step={0.01}
                          value={layer.quantity}
                          manualCursorValue={resolveLinkedUnitSliderSetpoint(
                            layer.quantity,
                            layer.quantityLinkSource,
                            visualizerBaseParams
                          )}
                          liveValue={resolveLinkedUnitSliderValue(
                            layer.quantity,
                            layer.quantityLinkSource,
                            visualizerOutputParams
                          )}
                          showLiveCursor={layer.quantityLinkSource !== 'none'}
                          onChange={(event) =>
                            (() => {
                              const next = to01(event.target.value)
                              updateLayer(config, patch, index, {
                                quantity: next,
                              })
                              syncLinkedSetpoint(layer.quantityLinkSource, next, 0, 1)
                            })()
                          }
                        />
                        <LinkAssignButton
                          type="button"
                          title="Assign to visual slider"
                          onClick={() =>
                            openLayerLinkPicker(index, 'quantityLinkSource', `Layer ${index + 1} Quantity`)
                          }
                        >
                          ...
                        </LinkAssignButton>
                      </SliderRow>
                      <SliderRow>
                        <MiniLabel>Variety</MiniLabel>
                        <LinkedRange
                          min={0}
                          max={1}
                          step={0.01}
                          value={layer.variety}
                          manualCursorValue={resolveLinkedUnitSliderSetpoint(
                            layer.variety,
                            layer.varietyLinkSource,
                            visualizerBaseParams
                          )}
                          liveValue={resolveLinkedUnitSliderValue(
                            layer.variety,
                            layer.varietyLinkSource,
                            visualizerOutputParams
                          )}
                          showLiveCursor={layer.varietyLinkSource !== 'none'}
                          onChange={(event) =>
                            (() => {
                              const next = to01(event.target.value)
                              updateLayer(config, patch, index, {
                                variety: next,
                              })
                              syncLinkedSetpoint(layer.varietyLinkSource, next, 0, 1)
                            })()
                          }
                        />
                        <LinkAssignButton
                          type="button"
                          title="Assign to visual slider"
                          onClick={() =>
                            openLayerLinkPicker(index, 'varietyLinkSource', `Layer ${index + 1} Variety`)
                          }
                        >
                          ...
                        </LinkAssignButton>
                      </SliderRow>
                    </>
                  )}
                {layer.sourceType !== 'projectM' && (
                  <>
                    {layer.sourceType === 'procedural' &&
                      proceduralLayerControlSupport[layer.generator].speed && (
                      <SliderRow>
                        <MiniLabel>Speed</MiniLabel>
                        <LinkedRange
                          min={0}
                          max={1}
                          step={0.01}
                          value={layer.speed}
                          manualCursorValue={resolveLinkedUnitSliderSetpoint(
                            layer.speed,
                            layer.speedLinkSource,
                            visualizerBaseParams
                          )}
                          liveValue={resolveLinkedUnitSliderValue(
                            layer.speed,
                            layer.speedLinkSource,
                            visualizerOutputParams
                          )}
                          showLiveCursor={layer.speedLinkSource !== 'none'}
                          onChange={(event) =>
                            (() => {
                              const next = to01(event.target.value)
                              updateLayer(config, patch, index, {
                                speed: next,
                              })
                              syncLinkedSetpoint(layer.speedLinkSource, next, 0, 1)
                            })()
                          }
                        />
                        <LinkAssignButton
                          type="button"
                          title="Assign to visual slider"
                          onClick={() =>
                            openLayerLinkPicker(index, 'speedLinkSource', `Layer ${index + 1} Speed`)
                          }
                        >
                          ...
                        </LinkAssignButton>
                      </SliderRow>
                    )}
                    {(layer.sourceType === 'procedural'
                      ? proceduralLayerControlSupport[layer.generator].scale
                      : !layerUsesVisBackdropLayout(layer)) && (
                      <SliderRow>
                        <MiniLabel
                          title={
                            isMediaFileSourceType(layer.sourceType) &&
                            layer.mediaFit === 'object3d'
                              ? 'Scales the image/video in 3D space (minimum = very small, maximum = full viewport width at this depth)'
                              : undefined
                          }
                        >
                          Scale
                        </MiniLabel>
                        <LinkedRange
                          min={0}
                          max={1}
                          step={0.01}
                          value={layer.scale}
                          manualCursorValue={resolveLinkedUnitSliderSetpoint(
                            layer.scale,
                            layer.scaleLinkSource,
                            visualizerBaseParams
                          )}
                          liveValue={resolveLinkedUnitSliderValue(
                            layer.scale,
                            layer.scaleLinkSource,
                            visualizerOutputParams
                          )}
                          showLiveCursor={layer.scaleLinkSource !== 'none'}
                          onChange={(event) =>
                            (() => {
                              const next = to01(event.target.value)
                              updateLayer(config, patch, index, {
                                scale: next,
                              })
                              syncLinkedSetpoint(layer.scaleLinkSource, next, 0, 1)
                            })()
                          }
                        />
                        <LinkAssignButton
                          type="button"
                          title="Assign to visual slider"
                          onClick={() =>
                            openLayerLinkPicker(index, 'scaleLinkSource', `Layer ${index + 1} Scale`)
                          }
                        >
                          ...
                        </LinkAssignButton>
                      </SliderRow>
                    )}
                    {!layerUsesVisBackdropLayout(layer) ? (
                    <>
                    <SliderRow>
                      <MiniLabel>Depth</MiniLabel>
                      <LinkedRange
                        min={0}
                        max={1}
                        step={0.01}
                        value={layer.depth}
                        manualCursorValue={resolveLinkedUnitSliderSetpoint(
                          layer.depth,
                          layer.depthLinkSource,
                          visualizerBaseParams
                        )}
                        liveValue={resolveLinkedUnitSliderValue(
                          layer.depth,
                          layer.depthLinkSource,
                          visualizerOutputParams
                        )}
                        showLiveCursor={layer.depthLinkSource !== 'none'}
                        onChange={(event) =>
                          (() => {
                            const next = to01(event.target.value)
                            updateLayer(config, patch, index, {
                              depth: next,
                            })
                            syncLinkedSetpoint(layer.depthLinkSource, next, 0, 1)
                          })()
                        }
                      />
                      <LinkAssignButton
                        type="button"
                        title="Assign to visual slider"
                        onClick={() =>
                          openLayerLinkPicker(index, 'depthLinkSource', `Layer ${index + 1} Depth`)
                        }
                      >
                        ...
                      </LinkAssignButton>
                    </SliderRow>
                    <SliderRow>
                      <MiniLabel>Pos X</MiniLabel>
                      <LinkedRange
                        min={-1}
                        max={1}
                        step={0.01}
                        value={layer.positionX}
                        manualCursorValue={resolveLinkedSignedSliderSetpoint(
                          layer.positionX,
                          layer.positionXLinkSource,
                          visualizerBaseParams
                        )}
                        liveValue={resolveLinkedSignedSliderValue(
                          layer.positionX,
                          layer.positionXLinkSource,
                          visualizerOutputParams
                        )}
                        showLiveCursor={layer.positionXLinkSource !== 'none'}
                        onChange={(event) =>
                          (() => {
                            const next = toSigned(event.target.value)
                            updateLayer(config, patch, index, {
                              positionX: next,
                            })
                            syncLinkedSetpoint(layer.positionXLinkSource, next, -1, 1)
                          })()
                        }
                      />
                      <LinkAssignButton
                        type="button"
                        title="Assign to visual slider"
                        onClick={() =>
                          openLayerLinkPicker(index, 'positionXLinkSource', `Layer ${index + 1} Move X`)
                        }
                      >
                        ...
                      </LinkAssignButton>
                    </SliderRow>
                    <SliderRow>
                      <MiniLabel>Pos Y</MiniLabel>
                      <LinkedRange
                        min={-1}
                        max={1}
                        step={0.01}
                        value={layer.positionY}
                        manualCursorValue={resolveLinkedSignedSliderSetpoint(
                          layer.positionY,
                          layer.positionYLinkSource,
                          visualizerBaseParams
                        )}
                        liveValue={resolveLinkedSignedSliderValue(
                          layer.positionY,
                          layer.positionYLinkSource,
                          visualizerOutputParams
                        )}
                        showLiveCursor={layer.positionYLinkSource !== 'none'}
                        onChange={(event) =>
                          (() => {
                            const next = toSigned(event.target.value)
                            updateLayer(config, patch, index, {
                              positionY: next,
                            })
                            syncLinkedSetpoint(layer.positionYLinkSource, next, -1, 1)
                          })()
                        }
                      />
                      <LinkAssignButton
                        type="button"
                        title="Assign to visual slider"
                        onClick={() =>
                          openLayerLinkPicker(index, 'positionYLinkSource', `Layer ${index + 1} Move Y`)
                        }
                      >
                        ...
                      </LinkAssignButton>
                    </SliderRow>
                    <SliderRow>
                      <MiniLabel>Rot X</MiniLabel>
                      <LinkedRange
                        min={-1}
                        max={1}
                        step={0.01}
                        value={layer.rotateX}
                        manualCursorValue={resolveLinkedSignedSliderSetpoint(
                          layer.rotateX,
                          layer.rotateXLinkSource,
                          visualizerBaseParams
                        )}
                        liveValue={resolveLinkedSignedSliderValue(
                          layer.rotateX,
                          layer.rotateXLinkSource,
                          visualizerOutputParams
                        )}
                        showLiveCursor={layer.rotateXLinkSource !== 'none'}
                        onChange={(event) =>
                          (() => {
                            const next = toSigned(event.target.value)
                            updateLayer(config, patch, index, {
                              rotateX: next,
                            })
                            syncLinkedSetpoint(layer.rotateXLinkSource, next, -1, 1)
                          })()
                        }
                      />
                      <LinkAssignButton
                        type="button"
                        title="Assign to visual slider"
                        onClick={() =>
                          openLayerLinkPicker(index, 'rotateXLinkSource', `Layer ${index + 1} Rotate X`)
                        }
                      >
                        ...
                      </LinkAssignButton>
                    </SliderRow>
                    <SliderRow>
                      <MiniLabel>Rot Y</MiniLabel>
                      <LinkedRange
                        min={-1}
                        max={1}
                        step={0.01}
                        value={layer.rotateY}
                        manualCursorValue={resolveLinkedSignedSliderSetpoint(
                          layer.rotateY,
                          layer.rotateYLinkSource,
                          visualizerBaseParams
                        )}
                        liveValue={resolveLinkedSignedSliderValue(
                          layer.rotateY,
                          layer.rotateYLinkSource,
                          visualizerOutputParams
                        )}
                        showLiveCursor={layer.rotateYLinkSource !== 'none'}
                        onChange={(event) =>
                          (() => {
                            const next = toSigned(event.target.value)
                            updateLayer(config, patch, index, {
                              rotateY: next,
                            })
                            syncLinkedSetpoint(layer.rotateYLinkSource, next, -1, 1)
                          })()
                        }
                      />
                      <LinkAssignButton
                        type="button"
                        title="Assign to visual slider"
                        onClick={() =>
                          openLayerLinkPicker(index, 'rotateYLinkSource', `Layer ${index + 1} Rotate Y`)
                        }
                      >
                        ...
                      </LinkAssignButton>
                    </SliderRow>
                    </>
                    ) : null}
                  </>
                )}
                <Toggle>
                  <input
                    type="checkbox"
                    checked={layer.enabled}
                    onChange={(event) =>
                      updateLayer(config, patch, index, {
                        enabled: event.target.checked,
                      })
                    }
                  />
                  Enabled
                </Toggle>
              </Card>
            ))}
          </ColumnBody>
            </Column>

            <Column>
          <ColumnHeader>
            <span>Effects (Stacked)</span>
            <SmallButton
              onClick={() =>
                patch({
                  effects: [
                    ...config.effects,
                    createBuiltinEffect(
                      effectCreateTypes[
                        config.effects.length % effectCreateTypes.length
                      ]
                    ),
                  ],
                })
              }
            >
              + Effect
            </SmallButton>
          </ColumnHeader>
          <ColumnBody>
            {config.effects.map((effect, index) => (
              <Card key={effect.id}>
                {(() => {
                  const liveLink = getLiveEffectLinkValue(
                    effect.linkSource,
                    visualizerOutputParams
                  )
                  const liveAmount =
                    effect.linkSource === 'none'
                      ? Math.min(1, Math.max(0, effect.amount))
                      : liveLink
                  return (
                    <>
                      <CardTop>
                        <Select
                          value={effect.type}
                          onChange={(event) =>
                            updateEffect(config, patch, index, {
                              type: event.target.value as BuiltinEffectType,
                            })
                          }
                        >
                          {builtinEffectTypeList.map((type) => (
                            <option key={type} value={type}>
                              {builtinEffectDisplayName[type]}
                            </option>
                          ))}
                        </Select>
                        <SmallButton
                          onClick={() => {
                            const effects = config.effects.filter((_, i) => i !== index)
                            patch({ effects })
                          }}
                        >
                          Remove
                        </SmallButton>
                      </CardTop>
                      {effect.type === 'customModule' && (
                        <>
                          <FieldRow>
                            <Label>Module Name</Label>
                            <Input
                              value={effect.customModuleName}
                              onChange={(event) =>
                                updateEffect(config, patch, index, {
                                  customModuleName: event.target.value,
                                })
                              }
                              placeholder="Custom Effect"
                            />
                          </FieldRow>
                          <FieldColumn>
                            <CodeLabel>Module Code</CodeLabel>
                            <CodeArea
                              value={effect.customModuleCode}
                              onChange={(event) =>
                                updateEffect(config, patch, index, {
                                  customModuleCode: event.target.value,
                                })
                              }
                              spellCheck={false}
                              placeholder={`({
  name: 'Pulse Bloom',
  apply: ({ amount, beatPulse, setEffectAmount, getEffectAmount }) => {
    const current = getEffectAmount('bloom')
    setEffectAmount('bloom', current + beatPulse * amount)
  }
})`}
                            />
                          </FieldColumn>
                        </>
                      )}
                      <SliderRow>
                        <MiniLabel>Amount</MiniLabel>
                        <LinkedRange
                          min={0}
                          max={1}
                          step={0.01}
                          value={effect.amount}
                          manualCursorValue={resolveLinkedUnitSliderSetpoint(
                            effect.amount,
                            effect.linkSource,
                            visualizerBaseParams
                          )}
                          liveValue={resolveLinkedEffectSliderValue(
                            effect.amount,
                            effect.linkSource,
                            visualizerOutputParams
                          )}
                          showLiveCursor={effect.linkSource !== 'none'}
                          onChange={(event) =>
                            (() => {
                              const next = to01(event.target.value)
                              updateEffect(config, patch, index, {
                                amount: next,
                              })
                              syncLinkedSetpoint(effect.linkSource, next, 0, 1)
                            })()
                          }
                        />
                        <LinkAssignButton
                          type="button"
                          title="Assign to visual slider"
                          onClick={() => openEffectLinkPicker(index, 'linkSource')}
                        >
                          ...
                        </LinkAssignButton>
                      </SliderRow>
                      {effect.type === 'rimLight' && (
                        <SliderRow>
                          <MiniLabel>Azimuth</MiniLabel>
                          <LinkedRange
                            min={0}
                            max={1}
                            step={0.01}
                            value={effect.lightAzimuth}
                            manualCursorValue={resolveLinkedUnitSliderSetpoint(
                              effect.lightAzimuth,
                              effect.lightAzimuthLinkSource,
                              visualizerBaseParams
                            )}
                            liveValue={resolveLinkedUnitSliderValue(
                              effect.lightAzimuth,
                              effect.lightAzimuthLinkSource,
                              visualizerOutputParams
                            )}
                            showLiveCursor={effect.lightAzimuthLinkSource !== 'none'}
                            onChange={(event) =>
                              (() => {
                                const next = to01(event.target.value)
                                updateEffect(config, patch, index, {
                                  lightAzimuth: next,
                                })
                                syncLinkedSetpoint(
                                  effect.lightAzimuthLinkSource,
                                  next,
                                  0,
                                  1
                                )
                              })()
                            }
                          />
                          <LinkAssignButton
                            type="button"
                            title="Assign azimuth to visual slider"
                            onClick={() =>
                              openEffectLinkPicker(
                                index,
                                'lightAzimuthLinkSource',
                                `Effect ${index + 1} Rim Light Azimuth`,
                                'Assign rim light azimuth to a visual slider.'
                              )
                            }
                          >
                            ...
                          </LinkAssignButton>
                        </SliderRow>
                      )}
                      {effect.linkSource !== 'none' && (
                        <LiveValue>{`Live: ${(liveAmount * 100).toFixed(0)}%`}</LiveValue>
                      )}
                      <Toggle>
                        <input
                          type="checkbox"
                          checked={effect.enabled}
                          onChange={(event) =>
                            updateEffect(config, patch, index, {
                              enabled: event.target.checked,
                            })
                          }
                        />
                        Enabled
                      </Toggle>
                    </>
                  )
                })()}
              </Card>
            ))}
          </ColumnBody>
            </Column>

            <Column>
          <ColumnHeader>
            <span>Camera Effects</span>
            <SmallButton
              onClick={() =>
                patch({
                  cameraEffects: [
                    ...config.cameraEffects,
                    createBuiltinCameraEffect(
                      builtinCameraEffectTypeList[
                        config.cameraEffects.length %
                          builtinCameraEffectTypeList.length
                      ]
                    ),
                  ],
                })
              }
            >
              + Camera FX
            </SmallButton>
          </ColumnHeader>
          <ColumnBody>
            {config.cameraEffects.map((effect, index) => (
              <Card key={effect.id}>
                <CardTop>
                  <Select
                    value={effect.type}
                    onChange={(event) =>
                      updateCameraEffect(config, patch, index, {
                        type: event.target.value as BuiltinCameraEffectType,
                      })
                    }
                  >
                    {builtinCameraEffectTypeList.map((type) => (
                      <option key={type} value={type}>
                        {builtinCameraEffectDisplayName[type]}
                      </option>
                    ))}
                  </Select>
                  <SmallButton
                    onClick={() => {
                      patch({
                        cameraEffects: config.cameraEffects.filter(
                          (_, i) => i !== index
                        ),
                      })
                    }}
                  >
                    Remove
                  </SmallButton>
                </CardTop>
                <FieldRow>
                  <Label>Duration (beats)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={32}
                    step={1}
                    value={effect.durationBeats}
                    onChange={(event) =>
                      updateCameraEffect(config, patch, index, {
                        durationBeats: Math.max(
                          1,
                          Math.min(32, Math.round(Number(event.target.value) || 1))
                        ),
                      })
                    }
                  />
                </FieldRow>
                <Toggle>
                  <input
                    type="checkbox"
                    checked={effect.enabled}
                    onChange={(event) =>
                      updateCameraEffect(config, patch, index, {
                        enabled: event.target.checked,
                      })
                    }
                  />
                  Enabled
                </Toggle>
              </Card>
            ))}
          </ColumnBody>
            </Column>
          </Columns>
        </ColumnsScroller>

        <BlendScroller>
          <BlendRow>
            <BlendHeader>Layer Blending / Mix</BlendHeader>
            <BlendBody>
              {config.layers.map((layer, index) => (
                <BlendItem key={layer.id}>
                  <BlendName>{`Layer ${index + 1}`}</BlendName>
                  <Select
                    style={{ width: '9.2rem', flex: '0 0 auto' }}
                    value={layer.blend}
                    onChange={(event) =>
                      updateLayer(config, patch, index, {
                        blend: event.target.value as typeof layer.blend,
                      })
                    }
                  >
                    {builtinBlendModeList.map((blend) => (
                      <option key={blend} value={blend}>
                        {builtinBlendDisplayName[blend]}
                      </option>
                    ))}
                  </Select>
                  <LinkedRange
                    style={{ flex: '1 1 auto', minWidth: 0 }}
                    min={0}
                    max={1}
                    step={0.01}
                    value={layer.mix}
                    manualCursorValue={resolveLinkedUnitSliderSetpoint(
                      layer.mix,
                      layer.mixLinkSource,
                      visualizerBaseParams
                    )}
                    liveValue={resolveLinkedUnitSliderValue(
                      layer.mix,
                      layer.mixLinkSource,
                      visualizerOutputParams
                    )}
                    showLiveCursor={layer.mixLinkSource !== 'none'}
                    onChange={(event) =>
                      (() => {
                        const next = to01(event.target.value)
                        updateLayer(config, patch, index, {
                          mix: next,
                        })
                        syncLinkedSetpoint(layer.mixLinkSource, next, 0, 1)
                      })()
                    }
                  />
                  <LinkAssignButton
                    type="button"
                    title="Assign to visual slider"
                    onClick={() =>
                      openLayerLinkPicker(index, 'mixLinkSource', `Layer ${index + 1} Mix`)
                    }
                  >
                    ...
                  </LinkAssignButton>
                </BlendItem>
              ))}
            </BlendBody>
          </BlendRow>
        </BlendScroller>
      </BodyScroll>

      {codeEditor !== null && (
        <ModalBackdrop onClick={() => setCodeEditor(null)}>
          <ModalCard onClick={(event) => event.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Custom Generator Module</ModalTitle>
            </ModalHeader>
            <FieldRow>
              <Label>Module Name</Label>
              <Input
                value={codeEditor.moduleName}
                onChange={(event) =>
                  setCodeEditor({
                    ...codeEditor,
                    moduleName: event.target.value,
                  })
                }
                placeholder="custom-generator"
              />
            </FieldRow>
            <CodeArea
              value={codeEditor.code}
              onChange={(event) =>
                setCodeEditor({
                  ...codeEditor,
                  code: event.target.value,
                })
              }
              spellCheck={false}
            />
            <ModalActions>
              <SmallButton onClick={() => setCodeEditor(null)}>Close</SmallButton>
              <SmallButton onClick={applyLayerCodeEditor}>Apply</SmallButton>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}
      <AppModal
        open={linkPicker !== null}
        title={linkPicker?.title ?? 'Assign Visual Slider'}
        message={linkPicker?.description}
        maxWidth="28rem"
        onClose={() => setLinkPicker(null)}
        actions={[
          {
            label: 'Close',
            onClick: () => setLinkPicker(null),
          },
        ]}
      >
        <LinkPickerList>
          {availableLinkSources.map((source) => (
            <LinkPickerItem key={source}>
              <LinkPickerButton
                type="button"
                $selected={source === currentPickerSource}
                onClick={() => {
                  applyPickerSource(source)
                  setLinkPicker(null)
                }}
              >
                {source === 'none'
                  ? 'None'
                  : visualSliderAssignmentSummary.labelsBySlider[source as VisualSliderParam] ??
                    builtinEffectLinkSourceDisplayName[source]}
              </LinkPickerButton>
            </LinkPickerItem>
          ))}
        </LinkPickerList>
      </AppModal>
      <BusyModal
        open={busy !== null}
        title={busy?.title ?? 'Visualizer'}
        message={busyMessage}
        progress={busy?.progress}
      />
    </Root>
  )
}

interface LinkedRangeProps {
  min: number
  max: number
  step?: number
  value: number
  manualCursorValue?: number
  liveValue?: number
  showLiveCursor?: boolean
  onChange: ChangeEventHandler<HTMLInputElement>
  style?: CSSProperties
}

function LinkedRange({
  min,
  max,
  step = 0.01,
  value,
  manualCursorValue = value,
  liveValue = value,
  showLiveCursor = false,
  onChange,
  style,
}: LinkedRangeProps) {
  const manualRatio = toRangeRatio(manualCursorValue, min, max)
  const liveRatio = toRangeRatio(liveValue, min, max)

  return (
    <LinkedRangeShell style={style}>
      <Range type="range" min={min} max={max} step={step} value={value} onChange={onChange} />
      <LinkedRangeRail>
        {showLiveCursor && <LinkedRangeCursor $ratio={liveRatio} $variant="live" />}
        <LinkedRangeCursor $ratio={manualRatio} $variant="manual" />
      </LinkedRangeRail>
    </LinkedRangeShell>
  )
}

async function browseMediaFile(
  sourceType: BuiltinLayerSourceType,
  onSelected: (value: string) => void
) {
  const filters: Electron.FileFilter[] =
    sourceType === 'imageFile'
      ? [
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'],
          },
        ]
      : sourceType === 'projectM'
      ? [
          {
            name: 'projectM Presets',
            extensions: ['milk', 'prjm', 'preset'],
          },
        ]
      : [
          {
            name: 'Videos',
            extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'],
          },
        ]

  try {
    const paths = await getLocalFilepaths('Select Media Source', filters)
    if (paths.length > 0) {
      onSelected(paths[0])
    }
  } catch (_err) {}
}

async function browseModelFile(onSelected: (value: string) => void) {
  try {
    const paths = await getLocalFilepaths('Select 3D Model', [
      {
        name: '3D Models',
        extensions: ['obj', 'stl'],
      },
    ])
    if (paths.length > 0) {
      onSelected(paths[0])
    }
  } catch (_err) {}
}

function basenameWithoutExt(filepath: string) {
  const normalized = filepath.replace(/\\/g, '/')
  const raw = normalized.split('/').pop() ?? ''
  const withoutExt = raw.replace(/\.[^.]+$/, '')
  return withoutExt.trim()
}

function labelFromPresetPath(presetPath: string) {
  const normalized = presetPath.replace(/\\/g, '/')
  const filename = normalized.split('/').pop() ?? normalized
  const withoutExtension = filename.replace(/\.[^.]+$/, '')
  return withoutExtension.length > 0 ? withoutExtension : presetPath
}

function updateLayer(
  config: BuiltinVisualizerConfig,
  patch: (next: Partial<BuiltinVisualizerConfig>) => void,
  index: number,
  next: Partial<BuiltinVisualizerConfig['layers'][number]>
) {
  const layers = [...config.layers]
  const previous = layers[index]
  const sourceTypeChanged =
    next.sourceType !== undefined && next.sourceType !== previous.sourceType
  layers[index] = {
    ...previous,
    ...next,
    ...(sourceTypeChanged ? { source: '' } : {}),
  }
  patch({ layers })
}

function updateEffect(
  config: BuiltinVisualizerConfig,
  patch: (next: Partial<BuiltinVisualizerConfig>) => void,
  index: number,
  next: Partial<BuiltinVisualizerConfig['effects'][number]>
) {
  const effects = [...config.effects]
  effects[index] = {
    ...effects[index],
    ...next,
  }
  patch({ effects })
}

function updateCameraEffect(
  config: BuiltinVisualizerConfig,
  patch: (next: Partial<BuiltinVisualizerConfig>) => void,
  index: number,
  next: Partial<BuiltinVisualizerConfig['cameraEffects'][number]>
) {
  const cameraEffects = [...config.cameraEffects]
  cameraEffects[index] = {
    ...cameraEffects[index],
    ...next,
  }
  patch({ cameraEffects })
}

function to01(value: string) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.min(1, Math.max(0, numeric))
}

function toSigned(value: string) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.min(1, Math.max(-1, numeric))
}

function getLiveEffectLinkValue(
  linkSource: BuiltinVisualizerConfig['effects'][number]['linkSource'],
  outputParams: { [key: string]: number | undefined }
) {
  const match = /^visSlider([1-8])$/.exec(linkSource)
  if (match !== null) {
    const key = `visSlider${match[1]}`
    return clampNumber01(outputParams[key])
  }
  return 1
}

function toVisualSliderParam(
  linkSource: BuiltinEffectLinkSource
): VisualSliderParam | null {
  if (/^visSlider[1-8]$/.test(linkSource)) {
    return linkSource as VisualSliderParam
  }
  return null
}

function getLinkedSetpointValue(
  linkSource: BuiltinEffectLinkSource,
  baseParams: { [key: string]: number | undefined }
) {
  const match = /^visSlider([1-8])$/.exec(linkSource)
  if (match !== null) {
    const key = `visSlider${match[1]}`
    return clampNumber01(baseParams[key])
  }
  return 0.5
}

function resolveLinkedUnitSliderSetpoint(
  manualValue: number,
  linkSource: BuiltinEffectLinkSource,
  baseParams: { [key: string]: number | undefined }
) {
  if (linkSource === 'none') {
    return clampNumber01(manualValue)
  }
  return getLinkedSetpointValue(linkSource, baseParams)
}

function resolveLinkedSignedSliderSetpoint(
  manualValue: number,
  linkSource: BuiltinEffectLinkSource,
  baseParams: { [key: string]: number | undefined }
) {
  if (linkSource === 'none') {
    return clampSignedNumber(manualValue)
  }
  return getLinkedSetpointValue(linkSource, baseParams) * 2 - 1
}

function resolveLinkedUnitSliderValue(
  manualValue: number,
  linkSource: BuiltinEffectLinkSource,
  outputParams: { [key: string]: number | undefined }
) {
  if (linkSource === 'none') {
    return clampNumber01(manualValue)
  }
  return getLiveEffectLinkValue(linkSource, outputParams)
}

function resolveLinkedSignedSliderValue(
  manualValue: number,
  linkSource: BuiltinEffectLinkSource,
  outputParams: { [key: string]: number | undefined }
) {
  if (linkSource === 'none') {
    return clampSignedNumber(manualValue)
  }
  return getLiveEffectLinkValue(linkSource, outputParams) * 2 - 1
}

function resolveLinkedEffectSliderValue(
  manualValue: number,
  linkSource: BuiltinEffectLinkSource,
  outputParams: { [key: string]: number | undefined }
) {
  if (linkSource === 'none') {
    return clampNumber01(manualValue)
  }
  return getLiveEffectLinkValue(linkSource, outputParams)
}

function clampNumber01(value: number | undefined) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0.5
  return Math.min(1, Math.max(0, numeric))
}

function clampSignedNumber(value: number | undefined) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.min(1, Math.max(-1, numeric))
}

function toRangeRatio(value: number, min: number, max: number) {
  const span = max - min
  if (!Number.isFinite(span) || span <= 0) {
    return 0.5
  }
  const ratio = (value - min) / span
  return Math.min(1, Math.max(0, ratio))
}

function isCancelledDialogError(err: unknown) {
  const message = String(err ?? '').toLowerCase()
  return message.includes('cancel')
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 0 0 0.4rem 0;
`

const BodyScroll = styled.div`
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(18rem, 1fr) auto;
  gap: 0.55rem;
  min-width: 0;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
  padding: 0 0 0.5rem 0;
  scrollbar-gutter: stable both-edges;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`

const HeaderRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.8rem;
`

const Title = styled.div`
  font-size: 1rem;
  font-weight: 700;
`

const ToggleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.8rem;
`

const Toggle = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const Label = styled.div`
  font-size: 0.72rem;
  color: ${(props) => props.theme.colors.text.secondary};
  min-width: 4.3rem;
`

const MiniLabel = styled.div`
  font-size: 0.67rem;
  color: ${(props) => props.theme.colors.text.secondary};
  min-width: 3.2rem;
`

const HelperText = styled.div`
  font-size: 0.65rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin: -0.2rem 0 0.1rem 4.7rem;
`

const Input = styled.input`
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  width: 100%;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  padding: 0.26rem 0.38rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
`

const Select = styled.select`
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  width: 100%;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  padding: 0.22rem 0.32rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
`

const ColumnsScroller = styled.div`
  grid-row: 1;
  width: 100%;
  min-width: 0;
  min-height: 18rem;
  max-height: 100%;
  overflow-x: auto;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`

const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(16.5rem, 1fr));
  gap: 0.65rem;
  min-width: 50rem;
  min-height: 18rem;
  height: 100%;
  padding-right: 0.15rem;
`

const Column = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${(props) => props.theme.colors.bg.darker};
`

const ColumnHeader = styled.div`
  padding: 0.38rem 0.45rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  font-size: 0.8rem;
`

const ColumnBody = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.42rem;
  padding: 0.42rem;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`

const Card = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.3rem;
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
`

const CardTop = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
`

const LayerTitle = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: ${(props) => props.theme.colors.text.primary};
`

const FieldRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
`

const FieldColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
`

const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
`

const LinkAssignButton = styled.button`
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.25rem;
  padding: 0.05rem 0.4rem;
  font-size: 0.78rem;
  line-height: 1;
  cursor: pointer;
  flex: 0 0 auto;
`

const SmallButton = styled.button`
  flex-shrink: 0;
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.25rem;
  padding: 0.16rem 0.34rem;
  font-size: 0.72rem;
  cursor: pointer;
`

const Range = styled.input`
  width: 100%;
  height: 1.1rem;
  margin: 0;
  background: transparent;
  -webkit-appearance: none;
  appearance: none;
  position: relative;
  z-index: 2;
  cursor: pointer;

  &:focus {
    outline: none;
  }

  &::-webkit-slider-runnable-track {
    height: 0.28rem;
    background: transparent;
    border: none;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 0.95rem;
    height: 0.95rem;
    border-radius: 999px;
    background: transparent;
    border: none;
    margin-top: -0.34rem;
  }

  &::-moz-range-track {
    height: 0.28rem;
    background: transparent;
    border: none;
  }

  &::-moz-range-thumb {
    width: 0.95rem;
    height: 0.95rem;
    border-radius: 999px;
    background: transparent;
    border: none;
  }
`

const LinkedRangeShell = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
`

const LinkedRangeRail = styled.div`
  position: absolute;
  left: 0.2rem;
  right: 0.2rem;
  top: 50%;
  height: 0.25rem;
  transform: translateY(-50%);
  border-radius: 999px;
  background: #0007;
  pointer-events: none;
`

const LinkedRangeCursor = styled.div<{ $ratio: number; $variant: 'manual' | 'live' }>`
  position: absolute;
  top: 50%;
  left: ${(props) => `${props.$ratio * 100}%`};
  width: ${(props) => (props.$variant === 'manual' ? '0.58rem' : '0.48rem')};
  height: ${(props) => (props.$variant === 'manual' ? '0.58rem' : '0.48rem')};
  border-radius: 999px;
  transform: translate(-50%, -50%);
  box-sizing: border-box;
  background: ${(props) => (props.$variant === 'manual' ? 'transparent' : '#fffa')};
  border: ${(props) => (props.$variant === 'manual' ? '2px solid #fff' : '1px solid #101820')};
  box-shadow: ${(props) =>
    props.$variant === 'manual' ? '0 0 0.2rem #0008' : '0 0 0.16rem #0007'};
  opacity: ${(props) => (props.$variant === 'manual' ? 0.95 : 0.92)};
  /* Rail uses pointer-events: none, but descendants still hit-test by default and sit above the range input. */
  pointer-events: none;
`

const CodeLabel = styled.div`
  font-size: 0.66rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const CodeButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`

const CodeArea = styled.textarea`
  width: 100%;
  min-height: 7.4rem;
  resize: vertical;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  padding: 0.34rem 0.4rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 0.66rem;
  line-height: 1.35;
`

const LiveValue = styled.div`
  margin: -0.1rem 0 0.1rem 3.5rem;
  font-size: 0.64rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const ProjectMInlineBrowser = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 0.35rem;
  padding: 0.45rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  background: rgba(6, 6, 6, 0.88);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 2px 12px rgba(0, 0, 0, 0.35);
`

const ProjectMPresetActionButton = styled.button`
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: linear-gradient(180deg, #242424 0%, #161616 100%);
  color: #f0f0f0;
  border-radius: 0.28rem;
  padding: 0.16rem 0.38rem;
  font-size: 0.72rem;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);

  &:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.34);
    background: #2a2a2a;
    color: #fff;
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`

const ProjectMInlineCurrent = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 0.28rem;
  padding: 0.2rem 0.34rem;
  background: #0f0f0f;
  color: #ececec;
  font-size: 0.7rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
`

const ProjectMInlineActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.28rem;
`

const ProjectMInlineDirectory = styled.div`
  font-size: 0.63rem;
  color: #b8b8b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ProjectMInlineSearch = styled.input`
  display: block;
  min-width: 0;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.28rem;
  padding: 0.22rem 0.36rem;
  background: #050505;
  color: #f0f0f0;
  font-size: 0.7rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);

  &::placeholder {
    color: rgba(255, 255, 255, 0.42);
  }

  &:focus {
    outline: none;
    border-color: rgba(120, 180, 255, 0.55);
    box-shadow: inset 0 0 0 1px rgba(120, 180, 255, 0.2);
  }
`

const ProjectMInlineMeta = styled.div`
  font-size: 0.63rem;
  color: #b0b0b0;
`

const ProjectMInlinePager = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.3rem;
  min-width: 0;
`

const ProjectMInlineList = styled.div`
  max-height: 8.4rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.32rem;
  padding: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.28) #000000;
  background: #000000;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.65);
`

const ProjectMInlineListItem = styled.div`
  display: block;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  &:nth-child(odd) {
    background: #181818;
  }

  &:nth-child(even) {
    background: #262626;
  }

  &:last-child {
    border-bottom: none;
  }
`

const ProjectMInlinePresetButton = styled.button<{ $selected: boolean }>`
  width: 100%;
  text-align: left;
  border: none;
  background: ${(props) =>
    props.$selected ? 'rgba(90, 150, 255, 0.38)' : 'transparent'};
  color: ${(props) => (props.$selected ? '#ffffff' : '#e6e6e6')};
  border-radius: 0;
  padding: 0.22rem 0.38rem;
  font-size: 0.66rem;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.25;
  box-shadow: ${(props) =>
    props.$selected ? 'inset 3px 0 0 #7eb8ff' : 'none'};

  &:hover {
    background: ${(props) =>
      props.$selected
        ? 'rgba(100, 165, 255, 0.48)'
        : 'rgba(255, 255, 255, 0.07)'};
  }
`

const ProjectMInlineEmpty = styled.div`
  font-size: 0.65rem;
  color: #aeaeae;
  padding: 0.38rem 0.36rem;
  background: transparent;
`

const ProjectMInlineMessage = styled.div`
  font-size: 0.62rem;
  color: #c0c0c0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const BlendScroller = styled.div`
  grid-row: 2;
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`

const BlendRow = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  padding: 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 50rem;
  min-height: 8rem;
  max-height: min(26vh, 16rem);
  overflow: auto;
`

const BlendHeader = styled.div`
  font-size: 0.8rem;
`

const BlendBody = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.36rem;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`

const BlendItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.4rem;
`

const BlendName = styled.div`
  width: 4.8rem;
  flex: 0 0 auto;
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: #0009;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
`

const ModalCard = styled.div`
  width: min(56rem, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);
  background: ${(props) => props.theme.colors.bg.primary};
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.45rem;
  padding: 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  overflow: auto;
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
`

const ModalTitle = styled.div`
  font-size: 0.92rem;
  font-weight: 700;
`

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.4rem;
`

const LinkPickerList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const LinkPickerItem = styled.li`
  display: block;
`

const LinkPickerButton = styled.button<{ $selected: boolean }>`
  width: 100%;
  border: 1px solid
    ${(props) => (props.$selected ? '#7ed6a5' : props.theme.colors.divider)};
  background: ${(props) =>
    props.$selected ? 'rgba(56, 112, 78, 0.45)' : props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.3rem;
  padding: 0.38rem 0.5rem;
  text-align: left;
  cursor: pointer;
`
