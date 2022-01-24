import { FontLoader } from 'three/examples/jsm/loaders/FontLoader'
import gentilis from './fonts/gentilis_bold.typeface.json'
import zsd from './fonts/font_zsd4dr.json'
import helvetiker_bold from './fonts/helvetiker_bold.typeface.json'
import helvetiker_reg from './fonts/helvetiker_regular.typeface.json'

const _start = Date.now()

export const fonts = {
  gentilis: new FontLoader().parse(gentilis),
  zsd: new FontLoader().parse(zsd),
  helvetiker_bold: new FontLoader().parse(helvetiker_bold),
  helvetiker_reg: new FontLoader().parse(helvetiker_reg),
} as const

export type FontType = keyof typeof fonts

//@ts-ignore: I know this works, but I'm not sure how to prove that to TS?
export const fontTypes: FontType[] = Array.from(Object.keys(fonts))

export { Font } from 'three/examples/jsm/loaders/FontLoader'

console.log(`Fonts loaded in ${Date.now() - _start}ms`)
