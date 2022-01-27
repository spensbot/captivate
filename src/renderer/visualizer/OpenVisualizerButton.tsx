import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import IconButton from '@mui/material/IconButton'
import styled from 'styled-components'
import { send_open_visualizer } from '../ipcHandler'

interface Props {}

export default function OpenVisualizerButton({}: Props) {
  return (
    <Root>
      <IconButton onClick={send_open_visualizer}>
        <OpenInNewIcon />
      </IconButton>
    </Root>
  )
}

const Root = styled.div`
  position: absolute;
  right: 1rem;
  top: 1rem;
`
