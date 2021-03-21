import React, { useState } from 'react'
// Possible Universe Logos
import GridOnIcon from '@material-ui/icons/GridOn'
import ViewComfyIcon from '@material-ui/icons/ViewComfy'
import PlaylistAddIcon from '@material-ui/icons/PlaylistAdd'
import ListIcon from '@material-ui/icons/List'
// Possible Scene Editor Logos
import LibraryMusicIcon from '@material-ui/icons/LibraryMusic'
import MovieFilterIcon from '@material-ui/icons/MovieFilter'
import StarBorderIcon from '@material-ui/icons/StarBorder'
import WhatshotIcon from '@material-ui/icons/Whatshot'
// Possible Video Logos
import FeaturedVideoIcon from '@material-ui/icons/FeaturedVideo'
import logoThick from '../images/Thick.png'
// Possible Share Logos
import CloudDownloadIcon from '@material-ui/icons/CloudDownload'
import CloudUploadIcon from '@material-ui/icons/CloudUpload'
import { makeStyles } from '@material-ui/core/styles'
import AddIcon from '@material-ui/icons/Add'
import { IconButton } from '@material-ui/core'
import { next } from './visualizer/visualizerRef'
import Slider from './base/Slider'
import {zoom} from './visualizer/ThreeJSQueue'

import { useTypedSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { setActivePage, Page } from '../redux/guiSlice'
import TooltipWrapper from './base/TooltipWrapper'
import BlackoutButton from './BlackoutButton'

const selectedBorder = 0.2 //rem

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff08',
    alignItems: 'center'
  },
  item: {
    cursor: 'pointer',
    opacity: 0.5,
    filter: 'grayscale(100%)',
    '&:hover': {
      filter: 'grayscale(0%)',
      opacity: 1
    }
  },
  selectedItem: {
    borderLeft: `${selectedBorder}rem solid #fff`
  }
})

export default function MenuBar() {
  const activePage = useTypedSelector(state => state.gui.activePage)
  const dispatch = useDispatch()

  const setPage = (newPage: Page) => {
    return () => {
      dispatch(setActivePage(newPage))
    }
  }

  const classes = useStyles()

  function MenuItem({ page, tooltipText, paddingRem = 1, children }: { page: Page, tooltipText: string, paddingRem?: number, children: React.ReactNode }) {
    const isActive = activePage === page
    const p = paddingRem
    const padding = isActive ? `${p}rem ${p}rem ${p}rem ${p - selectedBorder}rem` : `${p}rem`
    return (
      <TooltipWrapper text={tooltipText}>
        <div style={{padding: padding}} className={activePage === page ? classes.selectedItem : classes.item} onClick={setPage(page)}>
          {children}
        </div>
      </TooltipWrapper>
    )
  }

  return (
    <div className={classes.root}>
      <MenuItem page={Page.UNIVERSE} tooltipText="DMX Setup">
        {/* <ViewComfyIcon /> */}
        {/* <PlaylistAddIcon /> */}
        <ListIcon />
      </MenuItem>
      <MenuItem page={Page.MODULATION} tooltipText="Scene Editor">
        {/* <WhatshotIcon /> */}
        <MovieFilterIcon />
        {/* <StarBorderIcon /> */}
      </MenuItem>
      <MenuItem page={Page.VIDEO} tooltipText="Visualizer" paddingRem={0.6}>
        {/* <FeaturedVideoIcon /> */}
        {/* <MovieFilterIcon /> */}
        <img src={logoThick} style={{width: '2.3rem', height: '2.3rem', margin: '0'}} />
      </MenuItem>
      <MenuItem page={Page.SHARE} tooltipText="Share">
        <CloudUploadIcon />
      </MenuItem>
      <IconButton onClick={next}>
        <AddIcon />
      </IconButton>
      <div style={{ height: '20rem' }}>
        <Slider radius={0.5} onChange={(newVal: number) => { zoom(newVal) } } orientation="vertical"/>
      </div>
      <div style={{ flex: '1 0 0' }} />
      <BlackoutButton />
      {/* <img src={logoThick} style={{width: '3rem', height: '3rem', marginBottom: '0.5rem'}} /> */}
    </div>
  )
}
