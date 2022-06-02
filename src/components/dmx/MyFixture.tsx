import Divider from '../base/Divider'
import React from 'react'
import EditIcon from '@material-ui/icons/Edit'
import { IconButton } from '@material-ui/core'
import { useTypedSelector } from '../../redux/store'
import { useDispatch } from 'react-redux'
import { setEditedFixture, addFixtureType, updateFixtureType, deleteFixtureType } from '../../redux/dmxSlice'
import MyFixtureEditing from './MyFixtureEditing'
import Input from '../base/Input'
import Slider from '@material-ui/core/Slider'
import styled from 'styled-components'
import DeleteForeverIcon from '@material-ui/icons/DeleteForever'

type Props = {
  id: string
}

export default function MyFixture({ id }: Props) {

  const ft = useTypedSelector(state => state.dmx.fixtureTypesByID[id])
  const isDeletable = useTypedSelector(state => state.dmx.universe.find(fixture => fixture.type === ft.id) === undefined)
  const isEditing = useTypedSelector(state => state.dmx.editedFixture === id)
  const dispatch = useDispatch()
  
  const styles: { [key: string]: React.CSSProperties } = {

    name: {
      fontSize: '1rem',
      paddingRight: '0.5rem'
    },
    manufacturer: {
      fontSize: '0.8rem',
      opacity: 0.4
    },
    channelCount: {
      fontSize: '0.9rem',
      paddingRight: '0.2rem'
    },
    spacer: {
      flex: '1 0 0'
    }
  }

  // if (isEditing) {
  //   return <MyFixtureEditing id={id} />
  // }

  return (
    <Root>
      <Header onClick={() => dispatch(setEditedFixture(isEditing ? null : id))}>
        {ft.name ? (<span style={styles.name}>{ft.name}</span>) : null}
        {ft.manufacturer ? (<span style={styles.manufacturer}>{ft.manufacturer}</span>) : null}
        <div style={styles.spacer} />
        <span style={styles.channelCount}>{ft.channels.length}</span><span style={styles.manufacturer}>ch</span>
        {/* <IconButton onClick={() => dispatch(setEditedFixture(id))}>
          <EditIcon />
        </IconButton> */}
      </Header>
      { isEditing &&
          <Body>
            <Input value={ft.name} onChange={newVal => dispatch(updateFixtureType({
              ...ft,
              name: newVal
            }))} />
            <Input value={ft.manufacturer || ""} onChange={newVal => dispatch(updateFixtureType({
              ...ft,
              manufacturer: newVal
            }))} />
            <Slider id="epicness" value={ft.epicness} step={0.01} min={0} max={1} valueLabelDisplay="auto"
              onChange={(e, newVal) => dispatch(updateFixtureType({
                ...ft,
                epicness: Array.isArray(newVal) ? newVal[0] : newVal
              }))}
            />
            {isDeletable &&
              <IconButton onClick={() => dispatch(deleteFixtureType(id))}>
                <DeleteForeverIcon />
              </IconButton>
            }
          </Body>
        }
      <Divider color={'#7773'} marginY="0rem" />
    </Root>
  )
}

const Root = styled.div`
  padding: 0.5rem;
`

const Header = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  cursor: pointer;
`

const Body = styled.div`
  padding: 0.5rem;
`