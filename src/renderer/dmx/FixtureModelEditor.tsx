import { useEffect, useState } from 'react'
import styled from 'styled-components'
import NumberField from '../base/NumberField'
import StageLengthField from '../base/StageLengthField'
import Select from '../base/Select'
import { useDispatch } from 'react-redux'
import { updateFixtureType } from '../redux/dmxSlice'
import { useDmxSelector } from '../redux/store'
import {
  FIXTURE_MODEL_MAX_MOVER_BEAM_ANGLE,
  FIXTURE_MODEL_MAX_EMITTERS,
  FIXTURE_MODEL_MAX_WIDTH,
  FIXTURE_MODEL_MIN_MOVER_BEAM_ANGLE,
  FIXTURE_MODEL_MIN_EMITTERS,
  FIXTURE_MODEL_MIN_WIDTH,
  FixtureType,
  PAR_DEFAULT_BOX_DEPTH_M,
  PAR_DEFAULT_BOX_HEIGHT_M,
  PAR_DEFAULT_BOX_WIDTH_M,
  PAR_DEFAULT_CYLINDER_DEPTH_M,
  PAR_DEFAULT_CYLINDER_DIAMETER_M,
  ParCylinderLayoutMode,
  ParRectLayoutMode,
  defaultBodyShapeForKind,
  defaultMoverBeamAngleForModelKind,
  fixtureTypeHasFocusChannel,
  fixedEmitterCountForModelKind,
  washBarLayoutModeName,
  washBarLayoutModes,
  fixtureModelKindName,
  fixtureModelKinds,
  inferFixtureModelKind,
  normalizeFixtureModelConfig,
  buildAutoFittedDefaultCustomEmitters,
} from '../../shared/dmxFixtures'
import { FEET_PER_METER, METERS_PER_FOOT } from '../../shared/stage'
import FixtureEmitterLayoutEditor from './FixtureEmitterLayoutEditor'
import AppModal from '../overlays/AppModal'

interface Props {
  fixtureType: FixtureType
}

export default function FixtureModelEditor({ fixtureType }: Props) {
  const dispatch = useDispatch()
  const [emitterLayoutOpen, setEmitterLayoutOpen] = useState(false)
  const stageUnit = useDmxSelector((state) => state.stage.unit)
  const model = normalizeFixtureModelConfig(fixtureType.model, fixtureType)
  const effectiveKind = model.kind === 'auto' ? inferFixtureModelKind(fixtureType) : model.kind
  const hasFocusChannel = fixtureTypeHasFocusChannel(fixtureType)
  const showMoverBeamAngleField =
    (effectiveKind === 'moverSpot' || effectiveKind === 'moverWash') &&
    !hasFocusChannel
  const fixedEmitterCount = fixedEmitterCountForModelKind(effectiveKind)
  const subFixtureCount = fixtureType.subFixtures.length
  const effectiveSubFixtureCount = subFixtureCount > 0 ? subFixtureCount : 1
  const usesMultiStripWashBar =
    effectiveKind === 'washBar' && model.washBarLayoutMode === 'multiStrip'
  const multiStripEmitterTotal =
    model.washBarRgbCount * 2 +
    model.washBarCoolWhiteCount +
    model.washBarWarmWhiteCount
  const totalEmitters = effectiveSubFixtureCount * model.emittersPerSubFixture
  const isPar = effectiveKind === 'parCan'

  function seedCustomEmittersIfEmpty(
    base: ReturnType<typeof normalizeFixtureModelConfig>
  ): ReturnType<typeof normalizeFixtureModelConfig> {
    if (!base.useCustomEmitterLayout || base.customEmitters.length > 0) {
      return base
    }
    const normalized = normalizeFixtureModelConfig(base, fixtureType)
    const built = buildAutoFittedDefaultCustomEmitters(fixtureType, normalized)
    if (built.length === 0) {
      return base
    }
    return { ...base, customEmitters: built }
  }

  const isParCylinder = isPar && model.bodyShape === 'cylinder'
  const isParBox = isPar && model.bodyShape === 'box'
  const widthUnitLabel = stageUnit === 'ft' ? 'ft' : 'm'
  const widthDisplay =
    stageUnit === 'ft' ? model.width * FEET_PER_METER : model.width
  const widthMinDisplay =
    stageUnit === 'ft'
      ? FIXTURE_MODEL_MIN_WIDTH * FEET_PER_METER
      : FIXTURE_MODEL_MIN_WIDTH
  const widthMaxDisplay =
    stageUnit === 'ft'
      ? FIXTURE_MODEL_MAX_WIDTH * FEET_PER_METER
      : FIXTURE_MODEL_MAX_WIDTH
  const widthLabel =
    effectiveKind === 'washBar'
      ? `Bar Width (${widthUnitLabel})`
      : effectiveKind === 'moverSpot' || effectiveKind === 'moverWash'
      ? `Head Diameter (${widthUnitLabel})`
      : effectiveKind === 'atmosphericFxtr'
      ? `Body Width (${widthUnitLabel})`
      : `Fixture Size (${widthUnitLabel})`
  const bodyHeightDisplay =
    stageUnit === 'ft' ? model.bodyHeight * FEET_PER_METER : model.bodyHeight
  const bodyDepthDisplay =
    stageUnit === 'ft' ? model.bodyDepth * FEET_PER_METER : model.bodyDepth
  const bodyDiameterDisplay =
    stageUnit === 'ft' ? model.bodyDiameter * FEET_PER_METER : model.bodyDiameter
  const bodyDimMinDisplay =
    stageUnit === 'ft' ? 0.04 * FEET_PER_METER : 0.04

  function updateModel(
    updater: (
      current: ReturnType<typeof normalizeFixtureModelConfig>
    ) => ReturnType<typeof normalizeFixtureModelConfig>
  ) {
    const nextModel = updater(model)
    dispatch(
      updateFixtureType({
        ...fixtureType,
        model: normalizeFixtureModelConfig(nextModel, fixtureType),
      })
    )
  }

  useEffect(() => {
    if (!model.useCustomEmitterLayout && emitterLayoutOpen) {
      setEmitterLayoutOpen(false)
    }
  }, [emitterLayoutOpen, model.useCustomEmitterLayout])

  return (
    <Root>
      <Header>Fixture Model</Header>
      <Hint>
        Choose a generic model and map emitters. Emitters are generated per
        subfixture when subfixtures exist.
      </Hint>
      <Row>
        <Label>Type</Label>
        <RowControl>
          <Select
            label="Model Type"
            val={model.kind}
            items={fixtureModelKinds}
            labelForItem={fixtureModelKindName}
            onChange={(kind) =>
              updateModel((current) => {
                const base = {
                  ...current,
                  kind,
                  emittersPerSubFixture: (() => {
                    if (kind === 'auto') return current.emittersPerSubFixture
                    const fixed = fixedEmitterCountForModelKind(kind)
                    if (fixed !== null) return fixed
                    return kind === 'washBar' ? 4 : 1
                  })(),
                  width:
                    kind === 'auto'
                      ? current.width
                      : kind === 'washBar'
                      ? 2.2
                      : kind === 'atmosphericFxtr'
                      ? 0.6
                      : kind === 'parCan'
                      ? defaultBodyShapeForKind('parCan') === 'cylinder'
                        ? PAR_DEFAULT_CYLINDER_DIAMETER_M
                        : PAR_DEFAULT_BOX_WIDTH_M
                      : kind === 'uplight'
                      ? 0.45
                      : 0.6,
                  moverBeamAngleDeg:
                    kind === 'auto'
                      ? current.moverBeamAngleDeg
                      : defaultMoverBeamAngleForModelKind(kind),
                }
                if (kind === 'parCan') {
                  const shape = defaultBodyShapeForKind('parCan')
                  return {
                    ...base,
                    bodyShape: shape,
                    bodyDepth: PAR_DEFAULT_CYLINDER_DEPTH_M,
                    emitterFaceAutoSize: true,
                    parRectLayout: 'grid' as ParRectLayoutMode,
                    parCylinderLayout: 'honeycomb' as ParCylinderLayoutMode,
                    customEmitters: current.useCustomEmitterLayout
                      ? current.customEmitters
                      : [],
                    ...(shape === 'cylinder'
                      ? {
                          width: PAR_DEFAULT_CYLINDER_DIAMETER_M,
                          bodyHeight: PAR_DEFAULT_CYLINDER_DIAMETER_M,
                          bodyDiameter: PAR_DEFAULT_CYLINDER_DIAMETER_M,
                        }
                      : {
                          width: PAR_DEFAULT_BOX_WIDTH_M,
                          bodyHeight: PAR_DEFAULT_BOX_HEIGHT_M,
                          bodyDiameter: Math.max(
                            PAR_DEFAULT_BOX_WIDTH_M,
                            PAR_DEFAULT_BOX_HEIGHT_M
                          ),
                        }),
                  }
                }
                return base
              })
            }
          />
        </RowControl>
      </Row>
      <Fields>
        <NumberField
          val={model.emittersPerSubFixture}
          min={FIXTURE_MODEL_MIN_EMITTERS}
          max={FIXTURE_MODEL_MAX_EMITTERS}
          label={
            fixedEmitterCount === null && !usesMultiStripWashBar
              ? 'Emitters per Subfixture'
              : usesMultiStripWashBar
              ? 'Emitters per Subfixture (Linear mode only)'
              : 'Emitters per Subfixture (fixed)'
          }
          disabled={fixedEmitterCount !== null || usesMultiStripWashBar}
          onChange={(emittersPerSubFixture) =>
            updateModel((current) => ({
              ...current,
              emittersPerSubFixture,
            }))
          }
        />
        {!(isPar && isParCylinder) && (
          <StageLengthField
            val={Number(widthDisplay.toFixed(3))}
            min={Number(widthMinDisplay.toFixed(6))}
            max={Number(widthMaxDisplay.toFixed(6))}
            step={0.1}
            numberType="float"
            label={isParBox ? `Face width (${widthUnitLabel})` : widthLabel}
            stageUnit={stageUnit}
            lengthDraftDisplay="stageCanonical"
            onChange={(displayWidth) =>
              updateModel((current) => ({
                ...current,
                width:
                  stageUnit === 'ft'
                    ? displayWidth * METERS_PER_FOOT
                    : displayWidth,
                emitterFaceAutoSize: false,
              }))
            }
          />
        )}
        <FieldControl>
          <Select
            label="Body Shape"
            val={model.bodyShape}
            items={['box', 'cylinder']}
            labelForItem={(shape) => (shape === 'box' ? 'Box' : 'Round / Cylinder')}
            onChange={(bodyShape) =>
              updateModel((current) => {
                if (!isPar) {
                  return { ...current, bodyShape }
                }
                if (bodyShape === 'box') {
                  return {
                    ...current,
                    bodyShape,
                    width: PAR_DEFAULT_BOX_WIDTH_M,
                    bodyHeight: PAR_DEFAULT_BOX_HEIGHT_M,
                    bodyDepth: PAR_DEFAULT_BOX_DEPTH_M,
                    bodyDiameter: Math.max(
                      PAR_DEFAULT_BOX_WIDTH_M,
                      PAR_DEFAULT_BOX_HEIGHT_M
                    ),
                    emitterFaceAutoSize: true,
                    customEmitters: current.useCustomEmitterLayout
                      ? current.customEmitters
                      : [],
                  }
                }
                return {
                  ...current,
                  bodyShape,
                  width: PAR_DEFAULT_CYLINDER_DIAMETER_M,
                  bodyHeight: PAR_DEFAULT_CYLINDER_DIAMETER_M,
                  bodyDiameter: PAR_DEFAULT_CYLINDER_DIAMETER_M,
                  bodyDepth: PAR_DEFAULT_CYLINDER_DEPTH_M,
                  emitterFaceAutoSize: true,
                  customEmitters: current.useCustomEmitterLayout
                    ? current.customEmitters
                    : [],
                }
              })
            }
          />
        </FieldControl>
        {isPar && (
          <>
            <Row style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
              <ToggleLabel>
                <input
                  type="checkbox"
                  checked={model.emitterFaceAutoSize}
                  onChange={(event) =>
                    updateModel((current) => ({
                      ...current,
                      emitterFaceAutoSize: event.target.checked,
                    }))
                  }
                />
                Auto-expand face size for emitter spacing (when enabled, default
                sizes grow to fit)
              </ToggleLabel>
            </Row>
            {isParBox && (
              <Row style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <Label>Rect. face</Label>
                <RowControl>
                  <Select
                    label="Box layout"
                    val={model.parRectLayout}
                    items={['line', 'grid']}
                    labelForItem={(mode) =>
                      mode === 'line' ? 'Single row' : 'Rows & columns'
                    }
                    onChange={(parRectLayout) =>
                      updateModel((current) => ({
                        ...current,
                        parRectLayout,
                        customEmitters: current.useCustomEmitterLayout
                          ? current.customEmitters
                          : [],
                      }))
                    }
                  />
                </RowControl>
              </Row>
            )}
            {isParCylinder && (
              <Row style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <Label>Round face</Label>
                <RowControl>
                  <Select
                    label="Round layout"
                    val={model.parCylinderLayout}
                    items={['ring', 'honeycomb']}
                    labelForItem={(mode) =>
                      mode === 'ring' ? 'Ring' : 'Honeycomb'
                    }
                    onChange={(parCylinderLayout) =>
                      updateModel((current) => ({
                        ...current,
                        parCylinderLayout,
                        customEmitters: current.useCustomEmitterLayout
                          ? current.customEmitters
                          : [],
                      }))
                    }
                  />
                </RowControl>
              </Row>
            )}
          </>
        )}
        {model.bodyShape === 'box' && (
          <StageLengthField
            val={Number(bodyHeightDisplay.toFixed(3))}
            min={bodyDimMinDisplay}
            max={Number(widthMaxDisplay.toFixed(6))}
            step={0.05}
            numberType="float"
            label={
              isParBox
                ? `Face height (${widthUnitLabel})`
                : `Body Height (${widthUnitLabel})`
            }
            stageUnit={stageUnit}
            lengthDraftDisplay="stageCanonical"
            onChange={(displayHeight) =>
              updateModel((current) => ({
                ...current,
                bodyHeight:
                  stageUnit === 'ft'
                    ? displayHeight * METERS_PER_FOOT
                    : displayHeight,
                emitterFaceAutoSize: false,
              }))
            }
          />
        )}
        <StageLengthField
          val={Number(bodyDepthDisplay.toFixed(3))}
          min={bodyDimMinDisplay}
          max={Number(widthMaxDisplay.toFixed(6))}
          step={0.05}
          numberType="float"
          label={isPar ? `Depth (${widthUnitLabel})` : `Body Depth (${widthUnitLabel})`}
          stageUnit={stageUnit}
          lengthDraftDisplay="stageCanonical"
          onChange={(displayDepth) =>
            updateModel((current) => ({
              ...current,
              bodyDepth:
                stageUnit === 'ft'
                  ? displayDepth * METERS_PER_FOOT
                  : displayDepth,
              emitterFaceAutoSize: false,
            }))
          }
        />
        {model.bodyShape === 'cylinder' && (
          <StageLengthField
            val={Number(bodyDiameterDisplay.toFixed(3))}
            min={bodyDimMinDisplay}
            max={Number(widthMaxDisplay.toFixed(6))}
            step={0.05}
            numberType="float"
            label={
              isParCylinder
                ? `Face diameter (${widthUnitLabel})`
                : `Body Diameter (${widthUnitLabel})`
            }
            stageUnit={stageUnit}
            lengthDraftDisplay="stageCanonical"
            onChange={(displayDiameter) =>
              updateModel((current) => ({
                ...current,
                bodyDiameter:
                  stageUnit === 'ft'
                    ? displayDiameter * METERS_PER_FOOT
                    : displayDiameter,
                emitterFaceAutoSize: false,
              }))
            }
          />
        )}
        {showMoverBeamAngleField && (
          <NumberField
            val={Number(model.moverBeamAngleDeg.toFixed(2))}
            min={FIXTURE_MODEL_MIN_MOVER_BEAM_ANGLE}
            max={FIXTURE_MODEL_MAX_MOVER_BEAM_ANGLE}
            step={0.1}
            numberType="float"
            label="Default Beam Angle (deg)"
            onChange={(moverBeamAngleDeg) =>
              updateModel((current) => ({
                ...current,
                moverBeamAngleDeg,
              }))
            }
          />
        )}
        {effectiveKind === 'washBar' && (
          <Row style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
            <Label>Layout</Label>
            <RowControl>
              <Select
                label="Emitter Layout"
                val={model.washBarLayoutMode}
                items={washBarLayoutModes}
                labelForItem={washBarLayoutModeName}
                onChange={(washBarLayoutMode) =>
                  updateModel((current) => ({
                    ...current,
                    washBarLayoutMode,
                  }))
                }
              />
            </RowControl>
          </Row>
        )}
        {usesMultiStripWashBar && (
          <>
            <NumberField
              val={model.washBarRgbCount}
              min={1}
              max={FIXTURE_MODEL_MAX_EMITTERS}
              label="RGB Emitters per Strip (Top/Bottom)"
              onChange={(washBarRgbCount) =>
                updateModel((current) => ({
                  ...current,
                  washBarRgbCount,
                }))
              }
            />
            <NumberField
              val={model.washBarCoolWhiteCount}
              min={1}
              max={FIXTURE_MODEL_MAX_EMITTERS}
              label="Cool White Emitters (Vertical Strip)"
              onChange={(washBarCoolWhiteCount) =>
                updateModel((current) => ({
                  ...current,
                  washBarCoolWhiteCount,
                }))
              }
            />
            <NumberField
              val={model.washBarWarmWhiteCount}
              min={1}
              max={FIXTURE_MODEL_MAX_EMITTERS}
              label="Warm White Emitters (Center Discs)"
              onChange={(washBarWarmWhiteCount) =>
                updateModel((current) => ({
                  ...current,
                  washBarWarmWhiteCount,
                }))
              }
            />
          </>
        )}
        {effectiveKind === 'atmosphericFxtr' && (
          <>
            <Row style={{ gridColumn: '1 / -1' }}>
              <Label>Effect</Label>
              <RowControl>
                <Select
                  label="Atmosphere Effect"
                  val={model.atmosphereEffect}
                  items={['fog', 'haze', 'co2', 'bubble', 'confetti', 'flame']}
                  labelForItem={(item) =>
                    item === 'co2'
                      ? 'CO2 Jet'
                      : item.charAt(0).toUpperCase() + item.slice(1)
                  }
                  onChange={(atmosphereEffect) =>
                    updateModel((current) => ({
                      ...current,
                      atmosphereEffect,
                    }))
                  }
                />
              </RowControl>
            </Row>
            <Row style={{ gridColumn: '1 / -1' }}>
              <Label>Nozzle</Label>
              <RowControl>
                <Select
                  label="Nozzle Direction"
                  val={model.atmosphereNozzleDirection}
                  items={['up', 'forward']}
                  labelForItem={(item) => (item === 'up' ? 'Up' : 'Forward')}
                  onChange={(atmosphereNozzleDirection) =>
                    updateModel((current) => ({
                      ...current,
                      atmosphereNozzleDirection,
                    }))
                  }
                />
              </RowControl>
            </Row>
          </>
        )}
      </Fields>
      <Hint>
        {usesMultiStripWashBar
          ? `Multi-strip layout: RGB Top ${model.washBarRgbCount}, RGB Bottom ${model.washBarRgbCount}, Cool White ${model.washBarCoolWhiteCount}, Warm White ${model.washBarWarmWhiteCount} (${multiStripEmitterTotal} total emitters).`
          : subFixtureCount > 0
          ? `${subFixtureCount} subfixtures x ${model.emittersPerSubFixture} emitters = ${totalEmitters} total emitters`
          : `No subfixtures assigned. Using ${model.emittersPerSubFixture} emitter(s) for the fixture.`}
      </Hint>
      {usesMultiStripWashBar && (
        <Hint>
          Subfixtures/channels are mapped left-to-right across the strip lanes. This
          supports mixed-channel wash bars where RGB/CW/WW coverage differs.
        </Hint>
      )}
      <Hint>
        Set mover fixtures to `Mover Spot/Beam` or `Mover Wash` to change head look
        and beam spread in the 3D preview.
      </Hint>
      {hasFocusChannel && (
        <Hint>
          Focus channel detected. Beam angle is driven by focus and the default
          beam angle control is hidden.
        </Hint>
      )}
      {fixedEmitterCount !== null && (
        <Hint>
          {effectiveKind === 'moverSpot'
            ? 'Mover Spot/Beam uses one fixed emitter.'
            : `Mover Wash uses a fixed ${fixedEmitterCount}-emitter head layout.`}
        </Hint>
      )}
      <Row>
        <Label>Emitters</Label>
        <ToggleLabel>
          <input
            type="checkbox"
            checked={model.useCustomEmitterLayout}
            onChange={(event) =>
              updateModel((current) => {
                const next = {
                  ...current,
                  useCustomEmitterLayout: event.target.checked,
                }
                if (!event.target.checked) {
                  return next
                }
                return seedCustomEmittersIfEmpty(next)
              })
            }
          />
          Use WYSIWYG custom emitter layout (when off, emitters auto-fill the front face from dimensions and count)
        </ToggleLabel>
      </Row>
      {model.useCustomEmitterLayout && (
        <Row style={{ marginBottom: 0 }}>
          <LayoutEditorButton
            type="button"
            onClick={() => {
              updateModel((current) => seedCustomEmittersIfEmpty(current))
              setEmitterLayoutOpen(true)
            }}
            title="Open the WYSIWYG emitter layout editor in a dedicated modal"
          >
            Open WYSIWYG Emitter Layout Editor
          </LayoutEditorButton>
        </Row>
      )}
      <AppModal
        open={model.useCustomEmitterLayout && emitterLayoutOpen}
        title="WYSIWYG Emitter Layout Editor"
        maxWidth="min(1680px, calc(100vw - 1.5rem))"
        minHeight="min(900px, calc(100vh - 3rem))"
        maxHeight="calc(100vh - 1.5rem)"
        onClose={() => setEmitterLayoutOpen(false)}
        actions={[
          {
            label: 'Done',
            onClick: () => setEmitterLayoutOpen(false),
          },
        ]}
      >
        <FixtureEmitterLayoutEditor
          fixtureType={fixtureType}
          model={model}
          onChange={(nextModel) =>
            updateModel(() => ({
              ...nextModel,
            }))
          }
        />
      </AppModal>
    </Root>
  )
}

const Root = styled.div`
  background-color: ${(props) => props.theme.colors.bg.darker};
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  padding: 0.6rem;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
`

const Header = styled.div`
  font-size: 1rem;
  margin-bottom: 0.3rem;
`

const Hint = styled.div`
  font-size: 0.78rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: 0.45rem;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  width: 100%;
  min-width: 0;
`

const RowControl = styled.div`
  flex: 1 1 10rem;
  min-width: 0;
  max-width: 100%;
`

const FieldControl = styled.div`
  min-width: 0;
  width: 100%;
`

const Label = styled.div`
  font-size: 0.85rem;
  flex: 0 0 auto;
  min-width: 3rem;
`

const ToggleLabel = styled.label`
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
`

const LayoutEditorButton = styled.button`
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.darker};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.28rem;
  padding: 0.28rem 0.5rem;
  cursor: pointer;
  font-size: 0.78rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
`

const Fields = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
  margin-bottom: 0.45rem;
  min-width: 0;
`
