exports.visualScenesSort = (data, id) => {
  const possibleHits = {
    autoSceneEnabled: ['auto', 'enabled'],
    activeScene: ['active'],
    getSceneById: ['byId', id],
    visualScenes: [],
    visualScenesByID: ['byId'],
    visualScenesByIDs: ['ids'],
  };
  let result =
    possibleHits[data] === undefined ? 'notFound' : possibleHits[data];
  return result;
};
