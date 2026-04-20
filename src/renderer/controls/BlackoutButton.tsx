import styled, { css, keyframes } from 'styled-components'
import { useDispatch } from 'react-redux'
import { useTypedSelector } from '../redux/store'
import { setBlackout } from '../redux/guiSlice'
import { ButtonMidiOverlay } from '../base/MidiOverlay'

export default function BlackoutButton() {
  const dispatch = useDispatch()
  const isBlackout = useTypedSelector((state) => state.gui.blackout)

  return (
    <ButtonMidiOverlay
      action={{ type: 'toggleBlackout' }}
      style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
    >
      <Root
        type="button"
        title="Blackout all output (MIDI-assignable)"
        $active={isBlackout}
        onClick={() => dispatch(setBlackout(!isBlackout))}
      >
        <MainText>BLACKOUT</MainText>
        <StateDot $active={isBlackout} />
      </Root>
    </ButtonMidiOverlay>
  )
}

const flash = keyframes`
  0% { background-color: #911; box-shadow: 0 0 0 1px #ff7a7a44 inset; }
  50% { background-color: #cf1111; box-shadow: 0 0 0 1px #ffb0b088 inset; }
  100% { background-color: #911; box-shadow: 0 0 0 1px #ff7a7a44 inset; }
`

const Root = styled.button<{ $active: boolean }>`
  width: min(2.1rem, 100%);
  height: 5.6rem;
  max-height: 6.4rem;
  min-height: 4.8rem;
  padding: 0.3rem 0.18rem;
  box-sizing: border-box;
  border-radius: 0.35rem;
  border: 1px solid ${(props) => (props.$active ? '#ffaaaa' : '#ffe08a')};
  color: #f4f4f4;
  cursor: pointer;
  background: ${(props) => (props.$active ? '#7a1111' : '#30353f')};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 0.22rem;
  box-shadow:
    0 0 0 1px #0007 inset,
    0 0.35rem 0.95rem #0008;

  ${(props) =>
    props.$active &&
    css`
      animation: ${flash} 0.85s ease-in-out infinite;
    `}
`

const StateDot = styled.div<{ $active: boolean }>`
  width: 0.46rem;
  height: 0.46rem;
  border-radius: 999px;
  background: ${(props) => (props.$active ? '#ffd0d0' : '#ffe08a')};
  box-shadow: ${(props) =>
    props.$active ? '0 0 0.65rem #ffb6b6cc' : '0 0 0.45rem #ffe08a99'};
  flex: 0 0 auto;
`

const MainText = styled.div`
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #ffffff;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  text-align: center;
  line-height: 1;
`
