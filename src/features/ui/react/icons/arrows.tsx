interface Props {
  width: number
  height: number
}

export function UpIcon({ width, height }: Props) {
  const points = `${width / 2} ${0}, ${width} ${height}, ${0} ${height}`

  return (
    <svg width={width} height={height}>
      <polyline points={points} style={{ fill: '#777' }}></polyline>
    </svg>
  )
}

export function DownIcon({ width, height }: Props) {
  const points = `${width / 2} ${height}, ${width} ${0}, ${0} ${0}`

  return (
    <svg width={width} height={height}>
      <polyline points={points} style={{ fill: '#777' }}></polyline>
    </svg>
  )
}
