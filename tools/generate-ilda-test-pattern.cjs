/* eslint-disable no-console */
/**
 * Parse ildatest.ild (ILDA standard test pattern A) into a TypeScript module.
 * LaserShowGen and most tools use this 1191-point file at 12K/30K pps.
 * Source: http://www.laserfx.com/Backstage.LaserFX.com/Systems/ildatest.ild
 */
const fs = require('fs')
const path = require('path')

const INPUT = path.join(__dirname, 'ildatest.ild')
const OUTPUT = path.join(
  __dirname,
  '..',
  'src',
  'renderer',
  'laser',
  'laserIldaTestPatternData.ts'
)

/** ILDA default 64-color palette (IDTF suggested). */
const ILDA_PALETTE = [
  [255, 0, 0], [255, 16, 0], [255, 32, 0], [255, 48, 0], [255, 64, 0], [255, 80, 0],
  [255, 96, 0], [255, 112, 0], [255, 128, 0], [255, 144, 0], [255, 160, 0], [255, 176, 0],
  [255, 192, 0], [255, 208, 0], [255, 224, 0], [255, 240, 0], [255, 255, 0], [224, 255, 0],
  [192, 255, 0], [160, 255, 0], [128, 255, 0], [96, 255, 0], [64, 255, 0], [32, 255, 0],
  [0, 255, 0], [0, 255, 32], [0, 255, 64], [0, 255, 96], [0, 255, 128], [0, 255, 160],
  [0, 255, 192], [0, 255, 224], [0, 255, 255], [0, 224, 255], [0, 192, 255], [0, 160, 255],
  [0, 128, 255], [0, 96, 255], [0, 64, 255], [0, 32, 255], [0, 0, 255], [32, 0, 255],
  [64, 0, 255], [96, 0, 255], [128, 0, 255], [160, 0, 255], [192, 0, 255], [224, 0, 255],
  [255, 0, 255], [255, 0, 224], [255, 0, 192], [255, 0, 160], [255, 0, 128], [255, 0, 96],
  [255, 0, 64], [255, 0, 32], [255, 255, 255], [255, 224, 224], [255, 192, 192], [255, 160, 160],
  [255, 128, 128], [255, 96, 96], [255, 64, 64], [255, 32, 32], [255, 0, 0], [224, 0, 0],
  [192, 0, 0], [160, 0, 0], [128, 0, 0], [96, 0, 0], [64, 0, 0], [32, 0, 0],
]

const ILDA_COORD_MAX = 32767
const ILDA_STATUS_BLANK = 0x40

function ildaTo01(v) {
  return (v + ILDA_COORD_MAX) / (2 * ILDA_COORD_MAX)
}

function parseIldaFrame(buf) {
  if (buf.slice(0, 4).toString() !== 'ILDA') {
    throw new Error('Not an ILDA file')
  }
  const format = buf[7]
  if (format !== 0) {
    throw new Error(`Expected ILDA format 0, got ${format}`)
  }
  const records = buf.readUInt16BE(24)
  const dataStart = 32
  const points = []
  for (let i = 0; i < records; i++) {
    const o = dataStart + i * 8
    const x = buf.readInt16BE(o)
    const y = buf.readInt16BE(o + 2)
    const status = buf[o + 6]
    const colorIndex = buf[o + 7]
    const blank = (status & ILDA_STATUS_BLANK) !== 0
    const rgb = ILDA_PALETTE[colorIndex] ?? [255, 255, 255]
    points.push({
      x: ildaTo01(x),
      y: 1 - ildaTo01(y),
      r: rgb[0] / 255,
      g: rgb[1] / 255,
      b: rgb[2] / 255,
      blank,
    })
  }
  return points
}

function main() {
  const buf = fs.readFileSync(INPUT)
  const points = parseIldaFrame(buf)
  const body = points
    .map((p) => {
      const parts = [
        `x:${p.x.toFixed(6)}`,
        `y:${p.y.toFixed(6)}`,
        `r:${p.r.toFixed(4)}`,
        `g:${p.g.toFixed(4)}`,
        `b:${p.b.toFixed(4)}`,
      ]
      if (p.blank) parts.push('blank:true')
      return `  { ${parts.join(', ')} }`
    })
    .join(',\n')

  const ts = `import type { LaserDacFramePoint } from '../../shared/laserDac'

/** ILDA standard test pattern A (ildatest.ild) — ${points.length} points, unoptimized. */
export const ILDA_STANDARD_TEST_PATTERN_POINTS: LaserDacFramePoint[] = [
${body},
]

export const ILDA_STANDARD_TEST_PATTERN_POINT_COUNT = ${points.length}
`
  fs.writeFileSync(OUTPUT, ts, 'utf8')
  console.log(`Wrote ${points.length} points to ${OUTPUT}`)
}

main()
