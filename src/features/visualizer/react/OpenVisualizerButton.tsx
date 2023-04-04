import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import IconButton from '@mui/material/IconButton'
import { send_open_visualizer } from 'renderer/ipcHandler'
import styled from 'styled-components'


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
