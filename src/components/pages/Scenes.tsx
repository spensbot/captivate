import React from 'react'
import StatusBar from '../StatusBar';
import ParamsControl from '../controls/ParamsControl'
import Modulators from '../modulators/Modulators'
import SceneSelection from '../SceneSelection';

export default function Scenes() {
  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      display: 'flex',
      flexDirection: 'row'
    },
    activePage: {
      flex: '1 0 0'
    }
  }

  return (
    <>
      <StatusBar />
      <Modulators />
      <ParamsControl />
      <SceneSelection />
    </>
  )
}