import Divider from '../base/Divider'
import React from 'react'
import {colorList, Color} from '../../engine/dmxColors'
import { ChannelType, FixtureChannel, channelTypes } from '../../engine/dmxFixtures'
import DoneIcon from '@material-ui/icons/Done';
import { IconButton, TextField } from '@material-ui/core';
import { useTypedSelector } from '../../redux/store';
import { useDispatch } from 'react-redux';
import { updateFixtureType, deleteFixtureType, setEditedFixture } from '../../redux/dmxSlice';
import CloseIcon from '@material-ui/icons/Close';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import { useFormik } from 'formik';
import * as yup from 'yup'
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem'
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';
import Slider from '@material-ui/core/Slider';

type Props = {
  id: string
}

const validationSchema = yup.object({
  name: yup.string()
    .min(3, 'Name should be a minium 3 characters')
    .required('Fixture Name is required'),
  manufacturer: yup.string()
});

export default function MyFixtureEditing({ id }: Props) {

  const fixtureType = useTypedSelector(state => state.dmx.fixtureTypesByID[id])
  const dispatch = useDispatch()
  const channelsCopy = fixtureType.channels.map(fixtureChannel => ({...fixtureChannel}))
  const formik = useFormik({
    initialValues: {
      name: fixtureType.name,
      manufacturer: fixtureType.manufacturer,
      epicness: fixtureType.epicness,
      channels: channelsCopy
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      dispatch(setEditedFixture(null))
      dispatch(updateFixtureType({
        id: id,
        name: values.name,
        epicness: values.epicness,
        manufacturer: values.manufacturer,
        channels: values.channels
      }))
    },
  });
  
  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      margin: '1rem 0 1rem 0'
    },
    buttonContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center'
    }
  }

  function getColorMenuItems() {
    colorList.map(color => {
      return (<MenuItem value={color}>{color}</MenuItem>)
    })
  }

  function getChannelFields(fixtureChannel: FixtureChannel, index: number) {
    if (fixtureChannel.type === ChannelType.Master)
      return null
    if (fixtureChannel.type === ChannelType.Color)
      return (
        <>
          <Select labelId={index + "color label"} id={index + "color"} value={fixtureChannel.color} style={{ alignSelf: 'flex-end' }}
            onChange={(e) => {
              fixtureChannel.color = e.target.value
              formik.setValues(formik.values)
            }}
          >
            <MenuItem value={Color.Red}>{Color.Red}</MenuItem>
            <MenuItem value={Color.Green}>{Color.Green}</MenuItem>
            <MenuItem value={Color.Blue}>{Color.Blue}</MenuItem>
            <MenuItem value={Color.White}>{Color.White}</MenuItem>
            <MenuItem value={Color.Black}>{Color.Black}</MenuItem>
          </Select>
        </>
      )
    if (fixtureChannel.type === ChannelType.StrobeSpeed)
      return (
        <>
          <TextField style={{width: '4rem', marginRight: '0.5rem'}} size="small" id="default_strobe" name="default_strobe" label="Strobe"
            value={fixtureChannel.default_strobe}
            onChange={e => {
              fixtureChannel.default_strobe = e.target.value
              formik.setValues(formik.values)
            }}
            // error={formik.touched.name && Boolean(formik.errors.name)}
            // helperText={formik.touched.name && formik.errors.name}
          />
          <TextField style={{width: '4rem'}} size="small" id="default_solid" name="default_solid" label="Solid"
            value={fixtureChannel.default_solid}
            onChange={e => {
              fixtureChannel.default_solid = e.target.value
              formik.setValues(formik.values)
            }}
            // error={formik.touched.name && Boolean(formik.errors.name)}
            // helperText={formik.touched.name && formik.errors.name}
          />
        </>
      )
    if (fixtureChannel.type === ChannelType.Other)
      return (
        <TextField style={{width: '4rem'}} size="small" id="default" name="default" label="Default"
          value={fixtureChannel.default}
          onChange={e => {
            fixtureChannel.default = e.target.value
            formik.setValues(formik.values)
          }}
          // error={formik.touched.name && Boolean(formik.errors.name)}
          // helperText={formik.touched.name && formik.errors.name}
        />
      )
  }

  function getChannelTypeMenuItems() {
    return channelTypes.map(channelType => {
      <MenuItem value={channelType}>{channelType}</MenuItem>
    })
  }

  function getChannels() {
    return formik.values.channels.map((fixtureChannel, index) => {
      return (
        <div key={index} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', margin: '0 0 0.5rem 0' }}>
          <span style={{ fontSize: '1.3rem', margin: '0 1rem 0 0' }}>{index + 1}</span>
          <Select labelId={"channel" + index + "type label"} id={"channel" + index + "type"}
            value={fixtureChannel.type}
            onChange={(e) => {
              fixtureChannel.type = e.target.value;
              formik.setValues(formik.values)
            }}
            style={{margin: '-0.2rem 0.5rem 0 0', alignSelf: 'flex-end'}}
          >
            <MenuItem value={ChannelType.Master}>{ChannelType.Master}</MenuItem>
            <MenuItem value={ChannelType.Color}>{ChannelType.Color}</MenuItem>
            <MenuItem value={ChannelType.StrobeSpeed}>{ChannelType.StrobeSpeed}</MenuItem>
            <MenuItem value={ChannelType.Other}>{ChannelType.Other}</MenuItem>
          </Select>
          {getChannelFields(fixtureChannel, index)}
        </div>
      )
    })
  }

  return (
    <>
      <div style={styles.root}>
        <form onSubmit={formik.handleSubmit}>
          <TextField size="small" fullWidth id="name" name="name" label="Name" style={{marginBottom: '0.5rem'}}
            value={formik.values.name}
            onChange={formik.handleChange}
            error={formik.touched.name && Boolean(formik.errors.name)}
            helperText={formik.touched.name && formik.errors.name}
          />
          <TextField size="small" fullWidth id="manufacturer" name="manufacturer" label="Manufacturer"
            value={formik.values.manufacturer}
            onChange={formik.handleChange}
            error={formik.touched.manufacturer && Boolean(formik.errors.manufacturer)}
            helperText={formik.touched.manufacturer && formik.errors.manufacturer}
          />
          <div style={{marginTop: '1rem'}}>
            <span>Epicness</span>
            <div style={{margin: '0.3rem 1rem 0 1rem'}}>
              <Slider id="epicness" value={formik.values.epicness} step={0.01} min={0} max={1} valueLabelDisplay="auto"
                onChange={(e, newValue) => {
                  formik.values.epicness = newValue
                  formik.setValues(formik.values)
                }}
              />
            </div>
          </div>
          <div style={{ padding: '0rem 0 0.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0 0.5rem 0' }}>
              <span style={{fontSize: '1.3rem', marginRight: '0.5rem'}}>Channels</span>
              <IconButton size='small' style={{ marginRight: '0.5rem' }} onClick={
                () => {
                  formik.setValues({ ...formik.values, channels: [...formik.values.channels, { type: ChannelType.Master }] })
                }
              }>
                <AddIcon />
              </IconButton>
              <IconButton size='small' onClick={
                () => {
                  formik.values.channels.pop()
                  formik.setValues(formik.values)
                }
              }>
                <RemoveIcon />
              </IconButton>
            </div>
            {getChannels()}
          </div>
          <div style={styles.buttonContainer}>
            <IconButton type="submit">
              <DoneIcon />
            </IconButton>
            <IconButton onClick={() => dispatch(setEditedFixture(null))}>
              <CloseIcon />
            </IconButton>
            <IconButton onClick={() => dispatch(deleteFixtureType(id))}>
              <DeleteForeverIcon />
            </IconButton>
          </div>
        </form>
      </div>
      <Divider marginY="0rem" />
    </>
  )
}
