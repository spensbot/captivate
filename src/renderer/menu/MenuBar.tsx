import React from 'react'
import styled from 'styled-components'
import zIndexes from '../zIndexes'
import UniverseIcon from '@mui/icons-material/Settings'
import MoversIcon from '@mui/icons-material/ControlCamera'
import LightingIcon from '@mui/icons-material/Lightbulb'
import WbIncandescentIcon from '@mui/icons-material/WbIncandescent'
import VisualsIcon from '../images/Thick.png'
import MixerIcon from '@mui/icons-material/BarChart'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ViewInArIcon from '@mui/icons-material/ViewInAr'
import IconButton from '@mui/material/IconButton'
import { useTypedSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { setActivePage, Page } from '../redux/guiSlice'
import MasterSlider from '../controls/MasterSlider'
import { send_open_page_window } from '../ipcHandler'

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
    tooltipText,
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
        title={tooltipText}
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
      <MenuItem page="Movers" tooltipText="Mover Calibration">
        <MoversIcon fontSize="inherit" />
      </MenuItem>
      <MenuItem page="Lighting3D" tooltipText="Lighting 3D Preview">
        <ViewInArIcon fontSize="inherit" />
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
      <DetachedWindowButton
        title={`Open ${activePage} in new window`}
        onClick={() => send_open_page_window(activePage)}
      >
        <OpenInNewIcon fontSize="small" />
      </DetachedWindowButton>
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

const DetachedWindowButton = styled(IconButton)`
  margin-top: 0.5rem !important;
`

const Spacer = styled.div`
  flex: 1 0 0;
`
