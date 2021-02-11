import React from 'react'
import FeaturedVideoIcon from '@material-ui/icons/FeaturedVideo'; // Video
import GridOnIcon from '@material-ui/icons/GridOn'; // Universe
import LibraryMusicIcon from '@material-ui/icons/LibraryMusic'; // Design
import MovieFilterIcon from '@material-ui/icons/MovieFilter'; // Design 
import StarBorderIcon from '@material-ui/icons/StarBorder'; // Design
import WhatshotIcon from '@material-ui/icons/Whatshot'; // Design
import ViewComfyIcon from '@material-ui/icons/ViewComfy'; // Universe

import { useTypedSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { setActivePage, Page } from '../redux/guiSlice'

export default function MenuBar() {
  const activePage = useTypedSelector(state => state.gui.activePage)
  const dispatch = useDispatch()

  const setPage = (newPage: Page) => {
    return () => {
      dispatch(setActivePage(newPage))
    }
  }

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffff08'
    },
    item: {
      padding: '1rem',
      cursor: 'pointer',
      color: '#fff8'
    },
    selectedItem: {
      padding: '1rem 1rem 1rem 0.9rem',
      cursor: 'pointer',
      borderLeft: '0.1rem solid #fff',
      color: '#fffc'
    }
  }

  return (
    <div style={styles.root}>
      <div style={activePage === Page.UNIVERSE ? styles.selectedItem : styles.item}
        onClick={setPage(Page.UNIVERSE)}>
        <ViewComfyIcon />
      </div>
      <div style={activePage === Page.MODULATION ? styles.selectedItem : styles.item}
        onClick={setPage(Page.MODULATION)}>
        <WhatshotIcon />
      </div>
      <div style={activePage === Page.VIDEO ? styles.selectedItem : styles.item}
        onClick={setPage(Page.VIDEO)}>
        <FeaturedVideoIcon />
      </div>
    </div>
  )
}
