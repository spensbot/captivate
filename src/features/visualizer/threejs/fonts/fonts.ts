import { FontLoader } from 'three/examples/jsm/loaders/FontLoader'
import gentilis from './gentilis_bold.typeface.json'
import helvetiker_bold from './helvetiker_bold.typeface.json'
import helvetiker_reg from './helvetiker_regular.typeface.json'
import { Font } from 'three/examples/jsm/loaders/FontLoader'

export const fallbackFont = new FontLoader().parse(helvetiker_reg)

export const fonts: { [key: string]: Font | undefined } = {
  gentilis: new FontLoader().parse(gentilis),
  helvetiker_bold: new FontLoader().parse(helvetiker_bold),
  helvetiker_reg: new FontLoader().parse(helvetiker_reg),
} as const

export { Font } from 'three/examples/jsm/loaders/FontLoader'
