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
  padding-bottom: 0.35rem;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  &::-webkit-scrollbar {
    display: block !important;
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
