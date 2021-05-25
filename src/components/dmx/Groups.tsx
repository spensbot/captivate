import React from 'react'
import styled from 'styled-components'
import AddIcon from '@material-ui/icons/Add'
import { IconButton } from '@material-ui/core'
import { useDispatch } from 'react-redux'

interface Props {

}

export default function Groups({  }: Props) {
  const dispatch = useDispatch()

  const items = [].map(() => {
    return (
      <Item></Item>
    )
  })

  return (
    <Root>
      <Header>
        <Title>Groups</Title>
        <div style={{ flex: '1 0 0' }} />
        <IconButton onClick={() => { }}>
          <AddIcon />
        </IconButton>
      </Header>
      <Items>{items}</Items>
    </Root>
  )
}

const Root = styled.div`
  height: 100%;
  padding: 0.5rem;
  background-color: #0003;
  border-top: 1px solid #fff3;
  border-right: 1px solid #fff3;
  display: flex;
  flex-direction: column;
`

const Header = styled.div`
  display: flex;
  align-items: center;
`

const Items = styled.div`
  overflow: scroll;
  height: auto;
`

const Title = styled.div`
  font-size: 1.5rem;
`

const Item = styled.div`

`