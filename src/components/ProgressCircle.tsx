import React from 'react'

export default function ProgressCircle({ratio, radius, style}) {

  const rest = 1 - ratio;
  const thickness = radius / 5;
  const radiusInner = radius - thickness / 2;
  const circumference = 2 * Math.PI * radiusInner;

  const styles = {
    progressRing: {

    },
    progressRingCircle: {
      strokeDasharray: `${ratio * circumference} ${rest * circumference}`,
      strokeDashoffset: circumference * 0.25
    }
  }

  return (
    <svg
      style={style}
      width={`${radius * 2}`}
      height={`${radius * 2}`}>
      <circle
        style={styles.progressRingCircle}
        stroke="white"
        strokeWidth={thickness}
        fill="transparent"
        r={`${radiusInner}`}
        cx={`${radius}`}
        cy={`${radius}`}/>
    </svg>
  )
}
