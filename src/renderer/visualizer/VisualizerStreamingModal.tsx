import CastConnectedIcon from '@mui/icons-material/CastConnected'
import AppModal from '../overlays/AppModal'
import StreamOutputControls from './StreamOutputControls'
import styled from 'styled-components'

interface Props {
  open: boolean
  onClose: () => void
}

export default function VisualizerStreamingModal({ open, onClose }: Props) {
  return (
    <AppModal
      open={open}
      title="Visualizer Streaming"
      onClose={onClose}
      maxWidth="56rem"
      actions={[
        {
          label: 'Close',
          onClick: onClose,
        },
      ]}
    >
      <Root>
        <TitleWrap>
          <CastConnectedIcon fontSize="small" />
          <Title>Configure RTSP / NDI output</Title>
        </TitleWrap>
        <Body>
          <StreamOutputControls />
        </Body>
      </Root>
    </AppModal>
  )
}

const Root = styled.div`
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
`

const TitleWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
`

const Title = styled.div`
  font-size: 0.86rem;
  font-weight: 600;
  color: ${(props) => props.theme.colors.text.secondary};
`

const Body = styled.div`
  width: 100%;
  min-width: 0;
`
