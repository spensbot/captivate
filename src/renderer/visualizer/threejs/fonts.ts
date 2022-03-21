import { FontLoader } from 'three/examples/jsm/loaders/FontLoader'
import gentilis from './fonts/gentilis_bold.typeface.json'
import zsd from './fonts/font_zsd4dr.json'
import helvetiker_bold from './fonts/helvetiker_bold.typeface.json'
import helvetiker_reg from './fonts/helvetiker_regular.typeface.json'

export const fonts = {
  gentilis: new FontLoader().parse(gentilis),
  zsd: new FontLoader().parse(zsd),
  helvetiker_bold: new FontLoader().parse(helvetiker_bold),
  helvetiker_reg: new FontLoader().parse(helvetiker_reg),
} as const

export { Font } from 'three/examples/jsm/loaders/FontLoader'
