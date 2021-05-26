import React from 'react'
import styled from 'styled-components'
import AddIcon from '@material-ui/icons/Add'
import { IconButton } from '@material-ui/core'
import { useDispatch } from 'react-redux'
import { setGroups, setSelectedFixtureGroups } from '../../redux/dmxSlice'
import { useTypedSelector } from '../../redux/store'
import Input from '../base/Input'
import Toggle from '../base/Toggle'

interface Props {

}

export default function Groups({ }: Props) {
  const dispatch = useDispatch()
  const groups = useTypedSelector(state => state.dmx.groups)
  const activeFixtureGroups = useTypedSelector(state => {
    const i = state.dmx.selectedFixture
    if (i === null) return null
    return state.dmx.universe[i]?.groups
  })

  const items = groups.map((group, i) => {

    const onChange = (newVal: string) => {
      const groupsCopy = [...groups]
      if (newVal === '') {
        groupsCopy.splice(i, 1)
      } else {
        groupsCopy[i] = newVal
      }
      dispatch(setGroups(groupsCopy))
    }

    let toggle = null

    if (activeFixtureGroups !== null) {
      const match = activeFixtureGroups.findIndex(fixtureGroup => fixtureGroup === group)
      const toggleOn = match !== -1
  
      const toggleOnClick = () => {
        console.log(match)
        const activeFixtureGroupsCopy = [...activeFixtureGroups]
        toggleOn ? activeFixtureGroupsCopy.splice(match, 1) : activeFixtureGroupsCopy.push(group)
        dispatch(setSelectedFixtureGroups(activeFixtureGroupsCopy))
      }

      toggle = <Toggle isOn={toggleOn} onChange={toggleOnClick} />
    }

    return (
      <Item key={i}>
        <Input value={group} onChange={onChange} />
        {toggle}
      </Item>
    )
  })

  return (
    <Root>
      <Header>
        <Title>Groups</Title>
        <Spacer />
        <IconButton onClick={() => dispatch(setGroups([...groups, 'New Group']))}>
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
  & > * {
    margin-bottom: 0.5rem;
  }
`

const Title = styled.div`
  font-size: 1.5rem;
`

const Item = styled.div`
  display: flex;
  align-items: center;
`

const Spacer = styled.div`flex: 1 0 0;`