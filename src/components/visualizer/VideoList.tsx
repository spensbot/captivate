import { IconButton, makeStyles } from '@material-ui/core'
import React from 'react'
import { useTypedSelector, store } from '../../redux/store'
import { addVideos } from '../../redux/guiSlice'
import { selectVideoFiles } from '../../util/saveload_renderer'
import AddIcon from '@material-ui/icons/Add'
import {getFilename} from '../../util/helpers'

function selectFiles() {
  selectVideoFiles().then(videoFiles => {
    store.dispatch(addVideos(videoFiles))
  }).catch(err => {
    console.log(err)
  })
}

const useStyles = makeStyles({
  root: {
    width: '30rem'
  }
})

export default function VideoList() {
  const videos = useTypedSelector(state => state.gui.videos)

  console.log(videos)

  const classes = useStyles()

  return (
    <div className={classes.root}>
      <h1>Video List</h1>
      <IconButton onClick={selectFiles}><AddIcon /></IconButton>
      {videos.map(video => {
        return (
          <div key={video}>{getFilename(video)}</div>
        )
      })}
    </div>
  )
}
