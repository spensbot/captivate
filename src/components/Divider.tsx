import React from 'react'

export default ({vertical, color, thickness, marginX, marginY}) => {

  const Thickness = thickness || '1px'
  const MarginX = marginX || '0'
  const MarginY = marginY || '0'

  const style = {
    width: vertical ? Thickness : '100%',
    height: vertical ? '100%' : Thickness,
    margin: `${MarginY} ${MarginX}`,
    backgroundColor: color || '#77777777'
  };

  return (
    <div style={style}></div>
  )
}
