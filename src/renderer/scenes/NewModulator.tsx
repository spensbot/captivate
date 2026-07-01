import AddIcon from '@mui/icons-material/Add'
import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import { addModulator } from '../redux/controlSlice'

export default function NewModulator() {
  const dispatch = useDispatch()

  return (
    <Root onClick={() => dispatch(addModulator())} title="Add another motion effect to this scene">
      <AddIcon sx={{ fontSize: 'var(--remote-mod-add-icon-size, 1.75rem)' }} />
    </Root>
  )
}

const Root = styled.div`
  width: var(--remote-mod-graph-w, 200px);
  min-width: var(--remote-mod-graph-w, 200px);
  align-self: stretch;
  min-height: var(--remote-mod-panel-h, 10rem);
  background-color: ${(p) => p.theme.colors.bg.panel};
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  flex: 0 0 auto;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.28rem;
  color: ${(p) => p.theme.colors.icon.primary};
  touch-action: manipulation;

  &:hover {
    background-color: ${(p) => p.theme.colors.bg.raised};
  }

  &:active {
    background-color: ${(p) => p.theme.colors.bg.lighter};
  }
`
