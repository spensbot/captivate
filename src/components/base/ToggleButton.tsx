import { makeStyles } from '@material-ui/core'
import React from 'react'

interface Props {
  isEnabled: boolean,
  onClick: (e: React.MouseEvent) => void,
  children: React.ReactNode
}

const useStyles = makeStyles({
  root: (props: Props) => ({
    backgroundColor: props.isEnabled ? '#afaa' : '#fff2',
    color: props.isEnabled ? '#fff' : '#fff8',
    borderRadius: '0.3rem',
    padding: '0.0rem 0.2rem',
    marginRight: '0.5rem'
  })
})

export default function ToggleButton(props: Props) {
  const classes = useStyles(props)
  return (
    <div className={classes.root} onClick={props.onClick}>
      {props.children}
    </div>
  )
}
