import styled from 'styled-components'
import PPItem from './PPItem'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'

interface Props {}

export default function PostProcessing({}: Props) {
  return (
    <Root>
      <Header>Post Processing</Header>
      <Items>
        <PPItem title="Dimmer" isOpen={false} listening="whatever" />
        <PPItem title="Glitch" isOpen={true} listening="whatever" />
        <IconButton>
          <AddIcon />
        </IconButton>
      </Items>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`

const Header = styled.div`
  padding: 0.1rem 0.3rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
  color: ${(props) => props.theme.colors.text.secondary};
`

const Items = styled.div`
  flex: 1 0 0;
  display: flex;
  align-items: stretch;
`
