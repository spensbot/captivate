import { makeStyles } from '@mui/material'
import React from 'react'

const useStyles = makeStyles({
  root: {
    margin: '3rem',
    '& > *': {
      marginBottom: '1rem',
    },
  },
})

export default function Share() {
  const classes = useStyles()

  return (
    <div className={classes.root}>
      <h1>Share</h1>
      <p>Share scenes and fixtures with other Captivate users</p>
      <h4>Coming Soon!</h4>
    </div>
  )
}
