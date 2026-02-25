import fixturesIn from '../../assets/captivate_fixtures.db'
import { FixtureType } from './dmxFixtures'
import uFuzzy from '@leeoniya/ufuzzy'


const fixtures = JSON.parse(fixturesIn) as FixtureType[]

const fixtureDb: { [searchId: string]: FixtureType | undefined } = {}
const fixtureSearchIds = fixtures.map((f) => searchId(f))

function searchId(fixture: FixtureType): string {
  return `${fixture.manufacturer} - ${fixture.name}`
}

for (const fixture of fixtures) {
  fixtureDb[searchId(fixture)] = fixture
}

export function getFixtureSearchIds() {
  return fixtureSearchIds
}

export function fixtureForId(searchId: string) {
  return fixtureDb[searchId]
}

export function closestMatches(searchString: string): string[] {
  return fuzzySearch(searchString, fixtureSearchIds, 100)
}

const uf = new uFuzzy({})

export function fuzzySearch(
  searchSentence: string,
  options: string[],
  count: number
): string[] {
  if (searchSentence.length === 0) return options.slice(0, count)

  const idxs = uf.filter(options, searchSentence)
  const results: string[] = []

  if (idxs) {
    const total = Math.min(count, idxs.length)
    const sortThreshold = 1000

    if (total < sortThreshold) {
      // Sort/rank only for few enough results

      const info = uf.info(idxs, options, searchSentence)
      const order = uf.sort(info, options, searchSentence)

      for (let i = 0; i < total; i++) {
        results.push(options[info.idx[order[i]]])
      }
    } else {
      // Otherwise emit unsorted results

      for (let i = 0; i < total; i++) {
        results.push(options[idxs[i]])
      }
    }
  }

  return results
}
