import fixturesIn from '../../../../../assets/captivate_fixtures.db'
import { FixtureType } from 'features/dmx/shared/dmxFixtures'

console.log(fixturesIn.slice(0, 100))

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

export function fuzzySearch(
  searchSentence: string,
  options: string[],
  count: number
): string[] {
  if (searchSentence.length === 0) return options.slice(0, count)

  return options
    .map((option) => ({
      option,
      score: searchSentence
        .toLowerCase()
        .split(' ')
        .reduce((score, searchWord) => {
          return option.toLowerCase().includes(searchWord)
            ? score + searchWord.length
            : score - 100
        }, 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((result) => result.option)
}
