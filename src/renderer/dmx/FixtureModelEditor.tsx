import styled from 'styled-components'
import NumberField from '../base/NumberField'
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
  defaultMoverBeamAngleForModelKind,
  fixtureTypeHasFocusChannel,
  fixedEmitterCountForModelKind,
  fixtureModelKindName,
  fixtureModelKinds,
  inferFixtureModelKind,
  normalizeFixtureModelConfig,
} from '../../shared/dmxFixtures'
import { FEET_PER_METER, METERS_PER_FOOT } from '../../shared/stage'

interface Props {
  fixtureType: FixtureType
}

export default function FixtureModelEditor({ fixtureType }: Props) {
  const dispatch = useDispatch()
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
  const totalEmitters = effectiveSubFixtureCount * model.emittersPerSubFixture
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
      : `Fixture Size (${widthUnitLabel})`

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

  return (
    <Root>
      <Header>Fixture Model</Header>
      <Hint>
        Choose a generic model and map emitters. Emitters are generated per
        subfixture when subfixtures exist.
      </Hint>
      <Row>
        <Label>Type</Label>
        <Select
          label="Model Type"
          val={model.kind}
          items={fixtureModelKinds}
          labelForItem={fixtureModelKindName}
          onChange={(kind) =>
            updateModel((current) => ({
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
                  : kind === 'parCan' || kind === 'uplight'
                  ? 0.45
                  : 0.6,
              moverBeamAngleDeg:
                kind === 'auto'
                  ? current.moverBeamAngleDeg
                  : defaultMoverBeamAngleForModelKind(kind),
            }))
          }
          style={{ minWidth: '12rem' }}
        />
      </Row>
      <Fields>
        <NumberField
          val={model.emittersPerSubFixture}
          min={FIXTURE_MODEL_MIN_EMITTERS}
          max={FIXTURE_MODEL_MAX_EMITTERS}
          label={
            fixedEmitterCount === null
              ? 'Emitters / Subfixture'
              : 'Emitters / Subfixture (fixed)'
          }
          disabled={fixedEmitterCount !== null}
          onChange={(emittersPerSubFixture) =>
            updateModel((current) => ({
              ...current,
              emittersPerSubFixture,
            }))
          }
        />
        <NumberField
          val={Number(widthDisplay.toFixed(3))}
          min={Number(widthMinDisplay.toFixed(6))}
          max={Number(widthMaxDisplay.toFixed(6))}
          step={0.1}
          numberType="float"
          label={widthLabel}
          onChange={(displayWidth) =>
            updateModel((current) => ({
              ...current,
              width:
                stageUnit === 'ft'
                  ? displayWidth * METERS_PER_FOOT
                  : displayWidth,
            }))
          }
        />
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
      </Fields>
      <Hint>
        {subFixtureCount > 0
          ? `${subFixtureCount} subfixtures x ${model.emittersPerSubFixture} emitters = ${totalEmitters} total emitters`
          : `No subfixtures assigned. Using ${model.emittersPerSubFixture} emitter(s) for the fixture.`}
      </Hint>
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
    </Root>
  )
}

const Root = styled.div`
  background-color: ${(props) => props.theme.colors.bg.darker};
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  padding: 0.6rem;
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
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`

const Label = styled.div`
  font-size: 0.85rem;
  min-width: 3rem;
`

const Fields = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
  margin-bottom: 0.45rem;
`
