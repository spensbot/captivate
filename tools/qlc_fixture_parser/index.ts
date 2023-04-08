import { XMLParser, X2jOptionsOptional } from 'fast-xml-parser'
import dir from 'node-dir'
import fs from 'fs/promises'
import { QlcFixtureDef } from './qlc_fixture_def'
import { QlcChannel, convert_qlc_channel } from './qlc_channel'
import { FixtureType } from 'shared/dmxFixtures'
import { nanoid } from '@reduxjs/toolkit'

const QLC_EXT = 'qxf'
const QLC_DEFINITION_KEY = 'FixtureDefinition'
const FIXTURES_PATH = './tools/qlc_fixture_parser/fixtures'
const OUTPUT_PATH = './assets/captivate_fixtures.db'
const PRETTY = false

main().catch((err) => {
  console.error(`To run this script, you must first copy the fixtures folder from 
  https://github.com/mcallegari/qlcplus/tree/master/resources/fixtures
  into tools/qlc_fixture_parser

  ${err}`)
})

async function main() {
  const parser = createParser()

  const files = await dir.promiseFiles(FIXTURES_PATH)

  let captivate_fixtures: FixtureType[] = []
  let fixture_count = 0

  for (const file of files) {
    if (isQlcFixture(file)) {
      fixture_count += 1
      const content = await fs.readFile(file)

      const xml = parser.parse(content)[QLC_DEFINITION_KEY] as QlcFixtureDef

      let channels = ensureArray(xml.Channel)
      let modes = ensureArray(xml.Mode)

      let channelsByName: { [key: string]: QlcChannel } = {}

      for (const channel of channels) {
        channelsByName[channel['@_Name']] = channel
      }

      for (const mode of modes) {
        const modeChannels = ensureArray(mode.Channel)

        const manufacturer = xml.Manufacturer
        const name = `${xml.Model} (${mode['@_Name']})`

        const captivate_fixture: FixtureType = {
          id: fixtureId(),
          name,
          manufacturer,
          intensity: 0.5,
          channels: modeChannels.map((mc) => {
            let channelName = mc['#text']
            let channel = channelsByName[channelName]

            if (channel === undefined)
              throw 'Qlc Fixture Mode Channel Name Not Found'

            return convert_qlc_channel(channel)
          }),
          subFixtures: [],
          groups: [],
        }

        captivate_fixtures.push(captivate_fixture)
      }
    }
  }

  console.log(
    `Writing ${fixture_count} fixtures and ${captivate_fixtures.length} modes`
  )

  fs.writeFile(
    OUTPUT_PATH,
    PRETTY
      ? JSON.stringify(captivate_fixtures, null, 2)
      : JSON.stringify(captivate_fixtures)
  )
}

function fixtureId() {
  return nanoid()
}

function createParser() {
  // https://github.com/NaturalIntelligence/fast-xml-parser/blob/HEAD/docs/v4/2.XMLparseOptions.md
  let parserOptions: X2jOptionsOptional = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    // alwaysCreateTextNode: true,
    // attributesGroupName: '@_attributes',
  }

  return new XMLParser(parserOptions)
}

function isQlcFixture(filename: string) {
  return filename.endsWith(QLC_EXT)
}

function ensureArray<T>(t: T[] | T): T[] {
  return Array.isArray(t) ? t : [t]
}
