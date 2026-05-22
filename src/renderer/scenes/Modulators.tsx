import { useActiveLightScene } from '../redux/store'
import ModulatorControl from './ModulatorControl'
import NewModulator from './NewModulator'
import styled from 'styled-components'

export default function Modulators() {
  const modulatorCount = useActiveLightScene(
    (activeScene) => activeScene.modulators.length
  )

  const indexes = Array.from(Array(modulatorCount).keys())

  return (
    <Root>
      {indexes.map((index) => {
        return <ModulatorControl key={index} index={index} />
      })}
      <NewModulator />
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 100%;
  width: 100%;
  min-width: 0;
  flex-shrink: 0;
  padding-bottom: 0.35rem;
  scrollbar-width: auto;
  scrollbar-color: rgba(155, 162, 182, 0.88) rgba(0, 0, 0, 0.32);

  &::-webkit-scrollbar {
    height: 11px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    margin: 0 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(150, 158, 180, 0.62);
    border-radius: 6px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(185, 192, 215, 0.78);
    border: 2px solid transparent;
    background-clip: padding-box;
  }
`
