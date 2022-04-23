import React from 'react'
import styled from 'styled-components'
import zIndexes from '../zIndexes'
import ListIcon from '@mui/icons-material/List'
import MovieFilterIcon from '@mui/icons-material/MovieFilter'
import logoThick from '../images/Thick.png'
import BarChartIcon from '@mui/icons-material/BarChart'
import { useTypedSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { setActivePage, Page } from '../redux/guiSlice'
import TooltipWrapper from '../base/TooltipWrapper'
import MasterSlider from '../controls/MasterSlider'

const selectedBorder = 0.2 //rem

export default function MenuBar() {
  const activePage = useTypedSelector((state) => state.gui.activePage)
  const dispatch = useDispatch()

  const setPage = (newPage: Page) => {
    return () => {
      dispatch(setActivePage(newPage))
    }
  }

  function MenuItem({
    page,
    tooltipText,
    paddingRem = 1,
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
      <TooltipWrapper text={tooltipText}>
        <Item
          selected={activePage === page}
          style={{ padding: padding }}
          onClick={setPage(page)}
        >
          {children}
        </Item>
      </TooltipWrapper>
    )
  }

  return (
    <Root>
      <MenuItem page="Universe" tooltipText="DMX Setup">
        {/* <ViewComfyIcon /> */}
        {/* <PlaylistAddIcon /> */}
        <ListIcon />
      </MenuItem>
      <MenuItem page="Modulation" tooltipText="Scene Editor">
        {/* <WhatshotIcon /> */}
        <MovieFilterIcon />
        {/* <StarBorderIcon /> */}
      </MenuItem>
      <MenuItem page="Video" tooltipText="Visualizer" paddingRem={0.6}>
        {/* <FeaturedVideoIcon /> */}
        {/* <MovieFilterIcon /> */}
        <img
          src={logoThick}
          style={{ width: '2.3rem', height: '2.3rem', margin: '0' }}
        />
      </MenuItem>
      {/* <MenuItem page='Share' tooltipText="Share">
        <CloudUploadIcon />
      </MenuItem> */}
      <MenuItem page="Mixer" tooltipText="DMX Mixer">
        <BarChartIcon />
      </MenuItem>
      <Spacer />
      <MasterSlider />
      <div style={{ height: '0.5rem' }} />
      {/* <BlackoutButton /> */}
      {/* <PlayPauseButton /> */}
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
