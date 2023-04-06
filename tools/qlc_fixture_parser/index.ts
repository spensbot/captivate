import { XMLParser, X2jOptionsOptional } from 'fast-xml-parser'
import dir from 'node-dir'
import fs from 'fs/promises'
import { QlcFixtureDef } from './qlc_fixture_def'
import { QlcChannel, convert_qlc_channel } from './qlc_channel'
import { FixtureType } from 'shared/dmxFixtures'
import { nanoid } from '@reduxjs/toolkit'

let QLC_EXT = 'qxf'
let QLC_DEFINITION_KEY = 'FixtureDefinition'
let PATH = './tools/qlc_fixture_parser'

dir.promiseFiles(PATH + '/fixtures').catch((err) => {
  console.error(`To run this script, you must first copy the fixtures folder from 
  https://github.com/mcallegari/qlcplus/tree/master/resources/fixtures
  into tools/qlc_fixture_parser

  More info: 

  ${err}`)
})

async function main() {
  // https://github.com/NaturalIntelligence/fast-xml-parser/blob/HEAD/docs/v4/2.XMLparseOptions.md
  let parserOptions: X2jOptionsOptional = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    // alwaysCreateTextNode: true,
    // attributesGroupName: '@_attributes',
  }
  const parser = new XMLParser(parserOptions)

  const files = await dir.promiseFiles(PATH + '/fixtures')

  let captivate_fixtures: FixtureType[] = []

  for (const file of files) {
    if (file.endsWith(QLC_EXT)) {
      const content = await fs.readFile(file)

      const xml = parser.parse(content)[QLC_DEFINITION_KEY] as QlcFixtureDef

      let channels = ensure_array(xml.Channel)
      let modes = ensure_array(xml.Mode)

      let channelsByName: { [key: string]: QlcChannel } = {}

      for (const channel of channels) {
        channelsByName[channel['@_Name']] = channel
      }

      for (const mode of modes) {
        const modeChannels = ensure_array(mode.Channel)

        const captivate_fixture: FixtureType = {
          id: nanoid(),
          name: `${xml.Model} (${mode['@_Name']})`,
          manufacturer: xml.Manufacturer,
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

  console.log(`Writing ${captivate_fixtures.length} fixtures`)

  fs.writeFile(
    PATH + '/captivate_fixtures.json',
    JSON.stringify(captivate_fixtures)
    // Pretty
    // JSON.stringify(captivate_fixtures, null, 2)
  )
}

function ensure_array<T>(t: T[] | T): T[] {
  return Array.isArray(t) ? t : [t]
}

main()
