import React from 'react'
import styled from 'styled-components'
import zIndexes from '../zIndexes'
import Blackout from './Blackout'
import DmxTroubleshooter from './dmxTroubleshooter'

interface Props {}

export default function FullscreenOverlay({}: Props) {
  return null
  // <Root onClick={e => {}}>
  //   <Blackout />
  //   <DmxTroubleShooter />
  // </Root>
}

const Root = styled.div`
  z-index: ${zIndexes.fullscreenOverlay};
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
`
