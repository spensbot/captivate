import React from 'react'
import styled from 'styled-components'
import zIndexes from '../../../../renderer/zIndexes'
import UniverseIcon from '@mui/icons-material/Settings'
import LightingIcon from '@mui/icons-material/LightBulb'
import WbIncandescentIcon from '@mui/icons-material/WbIncandescent'
import VisualsIcon from 'features/ui/react/images/Thick.png'
import MixerIcon from '@mui/icons-material/BarChart'
import { useTypedSelector } from '../../../../renderer/redux/store'
import { useDispatch } from 'react-redux'
import { setActivePage, Page } from '../../../../renderer/redux/guiSlice'
import MasterSlider from '../../../scenes/react/controls/MasterSlider'

const selectedBorder = 0.2 //rem

export default function MenuBar() {
  const activePage = useTypedSelector((state) => state.gui.activePage)
  const dispatch = useDispatch()
  const ledEnabled = useTypedSelector((state) => state.gui.ledEnabled)
  const videoEnabled = useTypedSelector((state) => state.gui.videoEnabled)

  const setPage = (newPage: Page) => {
    return () => {
      dispatch(setActivePage(newPage))
    }
  }

  function MenuItem({
    page,
    paddingRem = 0.8,
    children,
  }: {
    page: Page
    tooltipText: string
    paddingRem?: number
    children: React.ReactNode
  }) {
    const isActive = activePage === page
    const p = paddingRem
    const padding = isActive
      ? `${p}rem ${p}rem ${p}rem ${p - selectedBorder}rem`
      : `${p}rem`
    return (
      <Item
        selected={activePage === page}
        style={{ padding: padding, fontSize: '1.7rem', margin: '0' }}
        onClick={setPage(page)}
      >
        {children}
      </Item>
    )
  }

  return (
    <Root>
      <MenuItem page="Universe" tooltipText="DMX Setup">
        <UniverseIcon fontSize="inherit" />
      </MenuItem>
      {ledEnabled && (
        <MenuItem page="Led" tooltipText="Led Editor">
          <WbIncandescentIcon fontSize="inherit" />
        </MenuItem>
      )}
      <MenuItem page="Modulation" tooltipText="Scene Editor">
        <LightingIcon fontSize="inherit" />
      </MenuItem>
      {videoEnabled && (
        <MenuItem page="Video" tooltipText="Visualizer" paddingRem={0.5}>
          <img
            src={VisualsIcon}
            style={{ width: '2.3rem', height: '2.3rem', margin: '0' }}
          />
        </MenuItem>
      )}
      <MenuItem page="Mixer" tooltipText="DMX Mixer">
        <MixerIcon fontSize="inherit" />
      </MenuItem>
      <Spacer />
      <MasterSlider />
      <div style={{ height: '0.5rem' }} />
    </Root>
  )
}

const Root = styled.div`
  z-index: ${zIndexes.leftMenu};
  display: flex;
  flex-direction: column;
  background-color: ${(props) => props.theme.colors.bg.lighter};
  align-items: center;
`

const Item = styled.div<{ selected: boolean }>`
  cursor: pointer;
  opacity: ${(props) => (props.selected ? 1 : 0.5)};
  filter: ${(props) => (props.selected ? `grayscale(0%)` : `grayscale(100%)`)};
  border-left: ${(props) => props.selected && '0.2rem solid #fff'};
  :hover {
    filter: grayscale(0%);
    opacity: 1;
  }
`

const Spacer = styled.div`
  flex: 1 0 0;
`
