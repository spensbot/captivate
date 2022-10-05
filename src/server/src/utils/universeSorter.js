exports.universeSort = (data) => {
  const possibleHits = {
    activeFixture: ['activeFixture'],
    activeFixtureType: ['activeFixtureType'],
    allFixtureTypes: ['fixtureTypes'],
    allFixtureTypesByID: ['fixtureTypesByID'],
    dmxState: [],
    presentDmxState: [],
  };
  let result =
    possibleHits[data] === undefined ? 'notFound' : possibleHits[data];
  return result;
};
