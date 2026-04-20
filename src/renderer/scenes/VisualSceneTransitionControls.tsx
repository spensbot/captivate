import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import { useControlSelector } from '../redux/store'
import { setActiveVisualSceneTransition } from '../redux/controlSlice'
import { VisualSceneTransitionType } from '../../shared/Scenes'

const transitionOptions: VisualSceneTransitionType[] = [
  'cut',
  'fade',
  'dissolve',
  'flash',
]

export default function VisualSceneTransitionControls() {
  const dispatch = useDispatch()
  const transition = useControlSelector(
    (control) => control.visual.byId[control.visual.active].transition
  )

  return (
    <Root>
      <Header>Scene Transition</Header>
      <Row>
        <Label>Blend</Label>
        <Select
          value={transition.type}
          onChange={(event) =>
            dispatch(
              setActiveVisualSceneTransition({
                type: event.target.value as VisualSceneTransitionType,
              })
            )
          }
        >
          {transitionOptions.map((option) => (
            <option key={option} value={option}>
              {displayTransition(option)}
            </option>
          ))}
        </Select>
      </Row>
      <Row>
        <Label>Time</Label>
        <Range
          type="range"
          min={80}
          max={3000}
          step={20}
          value={transition.durationMs}
          onChange={(event) =>
            dispatch(
              setActiveVisualSceneTransition({
                durationMs: Number(event.target.value),
              })
            )
          }
        />
        <Duration>{transition.durationMs}ms</Duration>
      </Row>
    </Root>
  )
}

function displayTransition(type: VisualSceneTransitionType) {
  if (type === 'cut') return 'Cut'
  if (type === 'fade') return 'Fade'
  if (type === 'dissolve') return 'Dissolve'
  return 'Flash'
}

const Root = styled.div`
  margin-bottom: 0.55rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.4rem;
  padding: 0.45rem;
  background: ${(props) => props.theme.colors.bg.lighter};
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const Header = styled.div`
  font-size: 0.83rem;
  font-weight: 700;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
`

const Label = styled.div`
  width: 2.3rem;
  font-size: 0.72rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const Select = styled.select`
  flex: 1 1 auto;
  min-width: 0;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  padding: 0.2rem 0.3rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
`

const Range = styled.input`
  flex: 1 1 auto;
  min-width: 0;
`

const Duration = styled.div`
  width: 3.3rem;
  font-size: 0.68rem;
  text-align: right;
  color: ${(props) => props.theme.colors.text.secondary};
`
