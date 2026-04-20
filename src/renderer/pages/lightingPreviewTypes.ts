import type { ColorChannel } from '../../shared/dmxColors'
import type {
  FixtureModelConfig,
  FixtureEmitterShape,
  FixtureRotation,
  MoverBounds,
  MoverCalibration,
  MoverMountOrientation,
} from '../../shared/dmxFixtures'
import type { LedFixture } from '../../shared/ledFixtures'

export interface MoverPreviewColorChannel {
  channelIndex: number
  color: ColorChannel
}

export interface MoverPreviewColorMapChannel {
  channelIndex: number
  colors: Array<
    ColorChannel & {
      max: number
    }
  >
}

export interface MoverPreviewMasterChannel {
  channelIndex: number
  min: number
  max: number
  isOnOff: boolean
}

export interface MoverPreviewFocusChannel {
  channelIndex: number
  min: number
  max: number
}

export interface MoverPreviewGoboMapChannel {
  channelIndex: number
  gobos: Array<{
    name: string
    max: number
  }>
}

export interface MoverPreviewEmitterGroup {
  emitterCount: number
  relativeX: number
  relativeY: number
  relativeZ: number
  colorChannels: MoverPreviewColorChannel[]
  colorMapChannels: MoverPreviewColorMapChannel[]
  masterChannels: MoverPreviewMasterChannel[]
  effectChannels: MoverPreviewMasterChannel[]
  goboMapChannels: MoverPreviewGoboMapChannel[]
}

export interface MoverPreviewCustomEmitter {
  id: string
  x: number
  y: number
  z: number
  size: number
  shape: FixtureEmitterShape
  rectWidthM?: number
  rectHeightM?: number
  channelIndexes: number[]
}

export interface MoverPreviewFixture {
  fixtureId: string
  fixtureIndex: number
  fixtureName: string
  fixtureLabel: string
  isMover: boolean
  isLedFixture?: boolean
  ledFixtureIndex?: number
  groups: string[]
  groupName: string
  xPos: number
  yPos: number
  zPos: number
  rotation: FixtureRotation
  universe: number
  channelBase: number
  panCoarseChannel?: number
  panFineChannel?: number
  tiltCoarseChannel?: number
  tiltFineChannel?: number
  panMin?: number
  panMax?: number
  tiltMin?: number
  tiltMax?: number
  moverCalibration?: MoverCalibration
  moverBounds?: MoverBounds
  moverMountOrientation?: MoverMountOrientation
  colorChannels: MoverPreviewColorChannel[]
  colorMapChannels: MoverPreviewColorMapChannel[]
  masterChannels: MoverPreviewMasterChannel[]
  effectChannels: MoverPreviewMasterChannel[]
  focusChannels: MoverPreviewFocusChannel[]
  goboMapChannels: MoverPreviewGoboMapChannel[]
  model: FixtureModelConfig
  emitterGroups: MoverPreviewEmitterGroup[]
  customEmitters: MoverPreviewCustomEmitter[]
  ledPixels?: Array<{ x: number; y: number; z: number }>
  ledWireEdges?: Array<[number, number]>
  ledFixture?: LedFixture
}
