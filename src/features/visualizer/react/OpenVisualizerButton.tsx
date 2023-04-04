import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import IconButton from '@mui/material/IconButton'
import * as api from 'renderer/api'
import styled from 'styled-components'


interface Props {}

export default function OpenVisualizerButton({}: Props) {
  return (
    <Root>
      <IconButton onClick={api.mutations.send_open_visualizer}>
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
