import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import IconButton from '@mui/material/IconButton'
import styled from 'styled-components'
import { send_open_page_window } from '../ipcHandler'

interface Props {}

export default function OpenVisualizerButton({}: Props) {
  return (
    <Root>
      <IconButton
        onClick={() => send_open_page_window('VideoViewport')}
        title="Open detached viewport output window"
      >
        <OpenInNewIcon />
      </IconButton>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
`
