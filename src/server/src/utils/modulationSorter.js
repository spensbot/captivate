exports.modulationSort = (data, id) => {
  const possibleHits = {
    activeScene: ['active'],
    autoEnabled: ['auto', 'enabled'],
    autoPeriod: ['auto', 'period'],
    autoBombacity: ['auto', 'bombacity'], // ?????????
    ledFxName: ['byId', id, 'ledfxname'],
    modulatorShape: ['byId', id, 'modulators', '0', 'lfo', 'shape'],
    baseParams: ['byId', id, 'baseParams'],
    randomizer: ['byId', id, 'randomizer'],
    url: ['url'],
    lightScenes: [],
    lightScenesByID: ['byId'],
    lightScenesByIDs: ['ids'],
  };
  let result =
    possibleHits[data] === undefined ? ['notFound'] : possibleHits[data];
  return result;
};
