import Divider from '../base/Divider'
import React from 'react'
import { FixtureChannel } from '../../engine/dmxFixtures'
import DoneIcon from '@material-ui/icons/Done';
import { IconButton, TextField } from '@material-ui/core';
import { useTypedSelector } from '../../redux/store';
import { useDispatch } from 'react-redux';
import { updateFixtureType, deleteFixtureType, setEditedFixture } from '../../redux/dmxSlice';
import CloseIcon from '@material-ui/icons/Close';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import { useFormik } from 'formik';
import * as yup from 'yup'

type Props = {
  fixtureChannel: FixtureChannel
}

const validationSchema = yup.object({
  name: yup
    .string('Fixture Name')
    .min(4, 'Name should be a minium 4 characters')
    .required('Fixture Name is required'),
  manufacturer: yup
    .string('Fixture Manufacturer')
});

export default function MyFixtureChannel({ fixtureChannel }: Props) {

  const fixtureType = useTypedSelector(state => state.dmx.fixtureTypesByID[id])
  const editedFixture = useTypedSelector(state => state.dmx.editedFixture)
  const dispatch = useDispatch()
  const formik = useFormik({
    initialValues: {
      name: fixtureType.name,
      manufacturer: fixtureType.manufacturer
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      dispatch(setEditedFixture(null))
      dispatch(updateFixtureType({
        id: id,
        name: values.name,
        manufacturer: values.manufacturer,
        channels: []
      }))
    },
  });
  
  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    buttonContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center'
    }
  }

  return (
    <>
      <div style={styles.root}>
        <form onSubmit={formik.handleSubmit}>
          <TextField size="small" fullWidth id="name" name="name" label="Name"
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
