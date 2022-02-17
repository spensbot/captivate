import styled from 'styled-components'

interface Props {
  title: string
  isOpen: boolean
  listening?: string
}

export default function PPItem({ title, isOpen, listening }: Props) {
  if (isOpen) {
    return <RootOpen>{title}</RootOpen>
  } else {
    return (
      <Root>
        <SidewaysText>{title}</SidewaysText>
      </Root>
    )
  }
}

const Root = styled.div`
  padding: 0.2rem;
  border-right: 1px solid ${(props) => props.theme.colors.divider};
  cursor: pointer;
`

const SidewaysText = styled.p`
  /* text-orientation: upright; */
  writing-mode: vertical-rl;
  margin: 0;
  /* transform: rotate(-90deg); */
`

const RootOpen = styled.div`
  padding: 0.2rem;
  flex: 1 0 0;
`
