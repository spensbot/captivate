import React, { useState } from 'react'
import FeaturedVideoIcon from '@material-ui/icons/FeaturedVideo'; // Video
import GridOnIcon from '@material-ui/icons/GridOn'; // Universe
import LibraryMusicIcon from '@material-ui/icons/LibraryMusic'; // Design
import MovieFilterIcon from '@material-ui/icons/MovieFilter'; // Design 
import StarBorderIcon from '@material-ui/icons/StarBorder'; // Design
import WhatshotIcon from '@material-ui/icons/Whatshot'; // Design
import ViewComfyIcon from '@material-ui/icons/ViewComfy'; // Universe
import { makeStyles } from '@material-ui/core/styles'

import { useTypedSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { setActivePage, Page } from '../redux/guiSlice'
import TooltipWrapper from './base/TooltipWrapper';
import logoThick from '../images/Thick.png'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff08',
    alignItems: 'center'
  },
  item: {
    padding: '1rem',
    cursor: 'pointer',
    color: '#fff8',
    '&:hover': {
      color: '#fffc'
    }
  },
  selectedItem: {
    padding: '1rem 1rem 1rem 0.8rem',
    borderLeft: '0.2rem solid #fff',
    color: '#fffc'
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

  function MenuItem({page, tooltipText, children}: {page: Page, tooltipText: string, children: React.ReactNode}) {
    return (
      <TooltipWrapper text={tooltipText}>
        <div className={`${classes.item} ${activePage === page ? classes.selectedItem : ""}`} onClick={setPage(page)}>
          {children}
        </div>
      </TooltipWrapper>
    )
  }

  return (
    <div className={classes.root}>
      <MenuItem page={Page.UNIVERSE} tooltipText="DMX Universe Editor">
        <ViewComfyIcon />
      </MenuItem>
      <MenuItem page={Page.MODULATION} tooltipText="Modulation Editor">
        <WhatshotIcon />
      </MenuItem>
      <MenuItem page={Page.VIDEO} tooltipText="Visualizer">
        <FeaturedVideoIcon />
      </MenuItem>
      <div style={{flex: '1 0 0'}}/>
      <img src={logoThick} style={{width: '3rem', height: '3rem', marginBottom: '0.5rem'}} />
    </div>
  )
}
