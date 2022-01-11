import { IconButton } from '@mui/material'
import { useTypedSelector, store } from '../redux/store'
import { addVideos } from '../redux/guiSlice'
// import { selectVideoFiles } from '../../'
import AddIcon from '@mui/icons-material/Add'
import { getFilename } from '../../util/util'
import styled from 'styled-components'

function selectFiles() {
  // selectVideoFiles()
  //   .then((videoFiles) => {
  //     store.dispatch(addVideos(videoFiles))
  //   })
  //   .catch((err) => {
  //     console.error(err)
  //   })
}

export default function VideoList() {
  const videos = useTypedSelector((state) => state.gui.videos)

  const classes = useStyles()

  return (
    <Root>
      <h1>Video List</h1>
      <IconButton onClick={selectFiles}>
        <AddIcon />
      </IconButton>
      {videos.map((video) => {
        return <div key={video}>{getFilename(video)}</div>
      })}
    </Root>
  )
}

const Root = styled.div`
  width: 30rem;
`
