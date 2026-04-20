import React from 'react'
import styled from 'styled-components'
import zIndexes from '../zIndexes'
import UniverseIcon from '@mui/icons-material/Settings'
import MoversIcon from '@mui/icons-material/ControlCamera'
import LightingIcon from '@mui/icons-material/Lightbulb'
import WbIncandescentIcon from '@mui/icons-material/WbIncandescent'
import AirIcon from '@mui/icons-material/Air'
import VisualsIcon from '../images/Thick.png'
import MixerIcon from '@mui/icons-material/BarChart'
import { useTypedSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { setActivePage, Page } from '../redux/guiSlice'
import MasterSlider from '../controls/MasterSlider'
import BlackoutButton from '../controls/BlackoutButton'
import { send_open_page_window } from '../ipcHandler'
import { getAtmosphericsFixtureDescriptors } from '../../shared/atmosphericsMapping'
import { hasMoverFixtureInUniverse } from '../../shared/dmxFixtures'

const selectedBorder = 0.2 //rem
type SidebarAccent =
  | 'universe'
  | 'movers'
  | 'led'
  | 'modulation'
  | 'visualizer'
  | 'mixer'
  | 'atmos'

function accentColors(accent: SidebarAccent) {
  switch (accent) {
    case 'universe':
      return {
        base: 'linear-gradient(180deg, rgba(76, 145, 255, 0.22), rgba(76, 145, 255, 0.08))',
        active: 'linear-gradient(180deg, rgba(76, 145, 255, 0.6), rgba(76, 145, 255, 0.2))',
        border: '#4c91ff',
      }
    case 'movers':
      return {
        base: 'linear-gradient(180deg, rgba(0, 197, 177, 0.22), rgba(0, 197, 177, 0.08))',
        active: 'linear-gradient(180deg, rgba(0, 197, 177, 0.58), rgba(0, 197, 177, 0.2))',
        border: '#00c5b1',
      }
    case 'led':
      return {
        base: 'linear-gradient(180deg, rgba(255, 177, 66, 0.22), rgba(255, 177, 66, 0.08))',
        active: 'linear-gradient(180deg, rgba(255, 177, 66, 0.58), rgba(255, 177, 66, 0.2))',
        border: '#ffb142',
      }
    case 'modulation':
      return {
        base: 'linear-gradient(180deg, rgba(161, 110, 255, 0.22), rgba(161, 110, 255, 0.08))',
        active: 'linear-gradient(180deg, rgba(161, 110, 255, 0.56), rgba(161, 110, 255, 0.2))',
        border: '#a16eff',
      }
    case 'visualizer':
      return {
        base: 'linear-gradient(180deg, rgba(255, 84, 155, 0.24), rgba(255, 84, 155, 0.1))',
        active: 'linear-gradient(180deg, rgba(255, 84, 155, 0.62), rgba(255, 84, 155, 0.22))',
        border: '#ff549b',
      }
    case 'mixer':
      return {
        base: 'linear-gradient(180deg, rgba(120, 220, 130, 0.22), rgba(120, 220, 130, 0.08))',
        active: 'linear-gradient(180deg, rgba(120, 220, 130, 0.56), rgba(120, 220, 130, 0.2))',
        border: '#78dc82',
      }
    case 'atmos':
      return {
        base: 'linear-gradient(180deg, rgba(190, 210, 255, 0.22), rgba(190, 210, 255, 0.08))',
        active: 'linear-gradient(180deg, rgba(190, 210, 255, 0.52), rgba(190, 210, 255, 0.2))',
        border: '#bed2ff',
      }
  }
}

export default function MenuBar() {
  const activePage = useTypedSelector((state) => state.gui.activePage)
  const hasAtmosphericsFixtures = useTypedSelector(
    (state) => getAtmosphericsFixtureDescriptors(state.dmx.present).length > 0
  )
  const hasMoverFixtures = useTypedSelector((state) =>
    hasMoverFixtureInUniverse(state.dmx.present.universe, state.dmx.present.fixtureTypesByID)
  )
  const ledSidebarEnabled = useTypedSelector((state) => state.gui.ledSidebarEnabled)
  const dispatch = useDispatch()

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
    accent,
  }: {
    page: Page
    tooltipText: string
    paddingRem?: number
    children: React.ReactNode
    accent: SidebarAccent
  }) {
    const isActive = activePage === page
    const p = paddingRem
    const padding = isActive
      ? `${p}rem ${p}rem ${p}rem ${p - selectedBorder}rem`
      : `${p}rem`
    return (
      <Item
        selected={activePage === page}
        accent={accent}
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
      <MenuItem page="Universe" tooltipText="DMX Setup" accent="universe">
        <UniverseIcon fontSize="inherit" />
      </MenuItem>
      {hasMoverFixtures && (
        <MenuItem page="Movers" tooltipText="Mover Calibration" accent="movers">
          <MoversIcon fontSize="inherit" />
        </MenuItem>
      )}
      {ledSidebarEnabled && (
        <MenuItem page="Led" tooltipText="Led Editor" accent="led">
          <WbIncandescentIcon fontSize="inherit" />
        </MenuItem>
      )}
      <MenuItem page="Modulation" tooltipText="Scene Editor" accent="modulation">
        <LightingIcon fontSize="inherit" />
      </MenuItem>
      <Item
        selected={false}
        accent="visualizer"
        style={{ padding: '0.5rem', fontSize: '1.7rem', margin: '0' }}
        onClick={() => send_open_page_window('Video')}
        title="Open Visualizer window"
      >
        <img
          src={VisualsIcon}
          style={{ width: '2.3rem', height: '2.3rem', margin: '0' }}
        />
      </Item>
      <MenuItem page="Mixer" tooltipText="DMX Mixer" accent="mixer">
        <MixerIcon fontSize="inherit" />
      </MenuItem>
      {hasAtmosphericsFixtures && (
        <MenuItem page="Atmospherics" tooltipText="Atmospherics + FX" accent="atmos">
          <AirIcon fontSize="inherit" />
        </MenuItem>
      )}
      <ControlArea>
        <ControlCluster>
          <MasterSlot>
            <MasterSlider />
          </MasterSlot>
          <BlackoutRow>
            <BlackoutButton />
          </BlackoutRow>
        </ControlCluster>
      </ControlArea>
    </Root>
  )
}

const Root = styled.div`
  z-index: ${zIndexes.leftMenu};
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  background-color: ${(props) => props.theme.colors.bg.lighter};
  align-items: center;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-gutter: stable;
`

const Item = styled.div<{ selected: boolean; accent: SidebarAccent }>`
  cursor: pointer;
  opacity: ${(props) => (props.selected ? 1 : 0.82)};
  color: #fff;
  background: ${(props) =>
    props.selected
      ? accentColors(props.accent).active
      : accentColors(props.accent).base};
  border-left: ${(props) =>
    props.selected ? `0.2rem solid ${accentColors(props.accent).border}` : '0.2rem solid #0000'};
  border-top: 1px solid #ffffff0f;
  border-bottom: 1px solid #00000040;
  box-shadow: inset 0 0 0 1px #ffffff10;
  transition:
    opacity 120ms ease,
    background 120ms ease,
    box-shadow 120ms ease;
  :hover {
    opacity: 1;
    box-shadow: inset 0 0 0 1px #ffffff3a;
    background: ${(props) => accentColors(props.accent).active};
  }
`

const ControlArea = styled.div`
  margin-top: auto;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0.45rem 0 0.8rem;
`

const ControlCluster = styled.div`
  width: 72%;
  min-height: 0;
  max-height: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 0.55rem;
`

const MasterSlot = styled.div`
  flex: 1 1 auto;
  width: 100%;
  min-height: 8rem;
  max-height: 36rem;
  display: flex;
  align-items: center;
  justify-content: center;
`

const BlackoutRow = styled.div`
  width: 100%;
  flex: 0 0 auto;
  padding: 0;
`
