import styled from 'styled-components'
import StageLengthField from '../base/StageLengthField'
import { useDispatch } from 'react-redux'
import { useDmxSelector } from '../redux/store'
import { setStageDimensions, setStageUnits } from '../redux/dmxSlice'
import { fromFeet, toFeet } from '../../shared/stage'

interface Props {
  compact?: boolean
  showDepth?: boolean
}

export default function StageScaleControls({
  compact = false,
  showDepth = true,
}: Props) {
  const stage = useDmxSelector((state) => state.stage)
  const dispatch = useDispatch()

  const width = fromFeet(stage.widthFt, stage.unit)
  const height = fromFeet(stage.heightFt, stage.unit)
  const depth = fromFeet(stage.depthFt, stage.unit)

  const unitLabel = stage.unit === 'ft' ? 'ft' : 'm'

  return (
    <Root compact={compact}>
      <Label>Stage</Label>
      <Fields compact={compact} showDepth={showDepth}>
        <StageLengthField
          val={Number(width.toFixed(3))}
          numberType="float"
          step={0.01}
          min={0.1}
          label={`W (${unitLabel})`}
          variant="outlined"
          stageUnit={stage.unit}
          onChange={(newValue) =>
            dispatch(
              setStageDimensions({
                widthFt: toFeet(newValue, stage.unit),
              })
            )
          }
        />
        <StageLengthField
          val={Number(height.toFixed(3))}
          numberType="float"
          step={0.01}
          min={0.1}
          label={`H (${unitLabel})`}
          variant="outlined"
          stageUnit={stage.unit}
          onChange={(newValue) =>
            dispatch(
              setStageDimensions({
                heightFt: toFeet(newValue, stage.unit),
              })
            )
          }
        />
        {showDepth ? (
          <StageLengthField
            val={Number(depth.toFixed(3))}
            numberType="float"
            step={0.01}
            min={0.1}
            label={`D (${unitLabel})`}
            variant="outlined"
            stageUnit={stage.unit}
            onChange={(newValue) =>
              dispatch(
                setStageDimensions({
                  depthFt: toFeet(newValue, stage.unit),
                })
              )
            }
          />
        ) : null}
        <UnitToggleRow>
          <UnitToggle
            type="button"
            active={stage.unit === 'ft'}
            onClick={() => dispatch(setStageUnits('ft'))}
            title="Display stage scale in feet"
          >
            ft
          </UnitToggle>
          <UnitToggle
            type="button"
            active={stage.unit === 'm'}
            onClick={() => dispatch(setStageUnits('m'))}
            title="Display stage scale in meters"
          >
            m
          </UnitToggle>
        </UnitToggleRow>
      </Fields>
    </Root>
  )
}

const Root = styled.div<{ compact: boolean }>`
  display: flex;
  flex-direction: ${(props) => (props.compact ? 'row' : 'column')};
  align-items: ${(props) => (props.compact ? 'center' : 'stretch')};
  gap: 0.45rem;
`

const Label = styled.div`
  font-size: 0.76rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const Fields = styled.div<{ compact: boolean; showDepth: boolean }>`
  display: grid;
  gap: 0.35rem;
  grid-template-columns: ${(props) =>
    props.compact
      ? props.showDepth
        ? 'repeat(4, minmax(5rem, 6.7rem))'
        : 'repeat(3, minmax(5rem, 6.7rem))'
      : props.showDepth
        ? 'repeat(2, minmax(5rem, 1fr))'
        : 'repeat(2, minmax(5rem, 1fr))'};
`

const UnitToggleRow = styled.div`
  display: flex;
  align-items: stretch;
  border: 1px solid #ffffff33;
  border-radius: 0.26rem;
  overflow: hidden;
  min-height: 2.5rem;
`

const UnitToggle = styled.button<{ active: boolean }>`
  border: 0;
  background: ${(props) => (props.active ? '#4e7adf55' : '#0007')};
  color: ${(props) => (props.active ? '#fff' : '#c7d0e8')};
  min-width: 2.2rem;
  cursor: pointer;
  font-size: 0.76rem;
  padding: 0 0.35rem;
`

