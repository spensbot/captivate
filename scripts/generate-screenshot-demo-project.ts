/**
 * Builds tools/screenshots/fixtures/demo.cap (+ demo.cfx) from the bundled
 * Captivate fixture library and default light/visual scenes.
 *
 * Run: npm run screenshots:demo-project
 */
// @ts-nocheck
import fs from 'fs'
import path from 'path'
import {
  createVersionedProjectSave,
  PROJECT_SAVE_SCHEMA,
  PROJECT_SAVE_VERSION,
} from '../src/shared/save'
import {
  serializeFixtureLibrary,
  cloneFixtureType,
  parseFixtureLibrary,
} from '../src/shared/fixtureLibrary'
import { initStageDimensions } from '../src/shared/stage'
import { initLedFixture } from '../src/shared/ledFixtures'

const repoRoot = path.join(__dirname, '..')
const outDir = path.join(repoRoot, 'tools/screenshots/fixtures')
const dbPath = path.join(repoRoot, 'assets/captivate_fixtures.db')
const defaultSavePath = path.join(
  repoRoot,
  'src/renderer/redux/defaultSave.json'
)

/** Fixture type IDs from assets/captivate_fixtures.db */
const LIBRARY_TYPE_IDS = [
  'AvrusNHGxq7OBvhEkSLgK', // Generic RGB
  'Zg6-Ux65Qh1eKtWWS1Gp6', // Generic Dimmer RGB
  '_crXsi4Dm7bqbCTnL2KlD', // AFX BARLED200-FX
  'OPXunHp-K4g-a18Vc247S', // Altman Spectra CYC
  'BWlR_JKlNsvRlkGsmcJTb', // Chauvet Intimidator Barrel 300
  'tRXYtyqHCZoWgZSWf8lJG', // Chauvet Intimidator Beam LED 350
  'XJpELDBUSoTKoe4yFT4F7', // Betopper LM108 Wash MH
] as const

const DEMO_ATMOS_ID = 'demo-captivate-fog'

function win(x: number, y: number, z = 0.75) {
  return {
    x: { pos: x, width: 0 },
    y: { pos: y, width: 0 },
    z: { pos: z, width: 0 },
  }
}

function makeAtmosFixtureType() {
  return {
    id: DEMO_ATMOS_ID,
    name: 'Demo Fog Machine',
    manufacturer: 'Captivate Demo',
    intensity: 0,
    channels: [
      {
        type: 'fxtrTrigger',
        name: 'Fog',
        off: 0,
        on: 255,
      },
      {
        type: 'fxtrLevel',
        name: 'Volume',
        default: 0,
        min: 0,
        max: 255,
      },
    ],
    subFixtures: [],
    groups: ['Atmosphere'],
    model: { kind: 'atmosphericFxtr' },
  }
}

function channelCount(ft: { channels: unknown[] }) {
  return Array.isArray(ft.channels) ? ft.channels.length : 0
}

function main() {
  const dbRaw = fs.readFileSync(dbPath, 'utf8')
  const allFixtures = parseFixtureLibrary(dbRaw)
  const byId = new Map(allFixtures.map((f) => [f.id, f]))

  const selected = []
  for (const id of LIBRARY_TYPE_IDS) {
    const found = byId.get(id)
    if (!found) {
      throw new Error(`Fixture type not found in captivate_fixtures.db: ${id}`)
    }
    selected.push(cloneFixtureType(found, { keepId: true }))
  }
  selected.push(makeAtmosFixtureType())

  const typesById = Object.fromEntries(selected.map((f) => [f.id, f]))
  const typeIds = selected.map((f) => f.id)

  const ch = {
    washL: 1,
    washR: 1 + channelCount(typesById['AvrusNHGxq7OBvhEkSLgK']),
    front: 10,
    bar: 20,
    cyc: 30,
    moverBarrel: 40,
    moverBeam: 60,
    moverWash: 80,
    fog: 100,
  }

  const universe = [
    {
      id: 'demo-wash-l',
      name: 'Wash L',
      ch: ch.washL,
      universe: 1,
      type: 'AvrusNHGxq7OBvhEkSLgK',
      window: win(0.2, 0.55),
      groups: ['Wash'],
    },
    {
      id: 'demo-wash-r',
      name: 'Wash R',
      ch: ch.washR,
      universe: 1,
      type: 'AvrusNHGxq7OBvhEkSLgK',
      window: win(0.8, 0.55),
      groups: ['Wash'],
    },
    {
      id: 'demo-front',
      name: 'Front Wash',
      ch: ch.front,
      universe: 1,
      type: 'Zg6-Ux65Qh1eKtWWS1Gp6',
      window: win(0.5, 0.35),
      groups: ['Wash'],
    },
    {
      id: 'demo-bar',
      name: 'LED Bar',
      ch: ch.bar,
      universe: 1,
      type: '_crXsi4Dm7bqbCTnL2KlD',
      window: win(0.5, 0.75),
      groups: ['Bars'],
    },
    {
      id: 'demo-cyc',
      name: 'Cyc',
      ch: ch.cyc,
      universe: 1,
      type: 'OPXunHp-K4g-a18Vc247S',
      window: win(0.5, 0.9, 0.9),
      groups: ['Cyc'],
    },
    {
      id: 'demo-mover-barrel',
      name: 'Mover Barrel',
      ch: ch.moverBarrel,
      universe: 1,
      type: 'BWlR_JKlNsvRlkGsmcJTb',
      window: win(0.25, 0.2, 0.55),
      groups: ['Movers'],
    },
    {
      id: 'demo-mover-beam',
      name: 'Mover Beam',
      ch: ch.moverBeam,
      universe: 1,
      type: 'tRXYtyqHCZoWgZSWf8lJG',
      window: win(0.5, 0.15, 0.5),
      groups: ['Movers'],
    },
    {
      id: 'demo-mover-wash',
      name: 'Mover Wash',
      ch: ch.moverWash,
      universe: 1,
      type: 'XJpELDBUSoTKoe4yFT4F7',
      window: win(0.75, 0.2, 0.55),
      groups: ['Movers'],
    },
    {
      id: 'demo-fog',
      name: 'Fog',
      ch: ch.fog,
      universe: 1,
      type: DEMO_ATMOS_ID,
      window: win(0.1, 0.85, 0.95),
      groups: ['Atmosphere'],
    },
  ]

  const led = initLedFixture()
  led.id = 'demo-wled-string'
  led.name = 'Stage LED String'
  led.led_count = 60
  led.points = [
    { x: 0.15, y: 0.2 },
    { x: 0.5, y: 0.15 },
    { x: 0.85, y: 0.2 },
  ]
  led.curve_handles = [
    { in: 0.04, out: 0.04 },
    { in: 0.04, out: 0.04 },
    { in: 0.04, out: 0.04 },
  ]
  led.points_xz = [
    { x: 0.15, y: 0.5 },
    { x: 0.5, y: 0.45 },
    { x: 0.85, y: 0.5 },
  ]
  led.curve_handles_xz = [
    { in: 0.04, out: 0.04 },
    { in: 0.04, out: 0.04 },
    { in: 0.04, out: 0.04 },
  ]

  // Use committed defaultSave scenes (same content as Extras → Generate Scenes /
  // generate:default-save) to avoid ts-node path-alias issues in sceneGeneration.
  const defaultSave = JSON.parse(fs.readFileSync(defaultSavePath, 'utf8'))
  const light = defaultSave.light
  const visual = defaultSave.visual
  if (!light?.ids?.length) {
    throw new Error('defaultSave.json is missing light scenes')
  }

  const dmx = {
    universe,
    fixtureTypes: typeIds,
    fixtureTypesByID: typesById,
    activeFixtureType: null,
    activeFixture: null,
    activeUniverse: 1,
    activeSubFixture: null,
    moverGroupByFixtureId: {
      'demo-mover-barrel': 'Movers',
      'demo-mover-beam': 'Movers',
      'demo-mover-wash': 'Movers',
    },
    stage: initStageDimensions(),
    lighting3d: {
      showCurtain: true,
      showBoundsOverlay: true,
      environmentFog: 0.65,
      roomEnabled: false,
      roomWidthFt: 36,
      roomDepthFt: 28,
      roomHeightFt: 12,
    },
    led: {
      ledFixtures: [led],
      activeFixture: 0,
    },
  }

  const save = createVersionedProjectSave({
    dmx,
    light,
    visual,
    gui: {
      activePage: 'Modulation',
      blackout: false,
      ledEnabled: true,
      videoEnabled: false,
      fxtrDepthOn: false,
      ledSidebarEnabled: true,
    },
  })

  if (save.schema !== PROJECT_SAVE_SCHEMA || save.version !== PROJECT_SAVE_VERSION) {
    throw new Error('Unexpected project save envelope')
  }

  fs.mkdirSync(outDir, { recursive: true })
  const capPath = path.join(outDir, 'demo.cap')
  const cfxPath = path.join(outDir, 'demo.cfx')
  fs.writeFileSync(capPath, JSON.stringify(save, null, 2), 'utf8')
  fs.writeFileSync(cfxPath, serializeFixtureLibrary(selected), 'utf8')

  console.log(`Wrote ${path.relative(repoRoot, capPath)}`)
  console.log(`Wrote ${path.relative(repoRoot, cfxPath)}`)
  console.log(
    `Fixtures: ${universe.length} patched, ${selected.length} types, ${light.ids.length} light scenes`
  )
}

main()
