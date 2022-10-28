exports.masterSort = (data) => {
  const possibleHits = {
    master: ['control', 'present', 'master'],
    connectionMenu: ['gui', 'connectionMenu'],
    saving: ['gui', 'saving'],
    newProjectDialog: ['gui', 'newProjectDialog'],
    ledfx: ['gui', 'LEDFx'],
    activePage: ['gui', 'activePage'],
    blackout: ['gui', 'blackout'],
    sceneSelect: ['gui', 'sceneSelect'],
    getGUI: ['gui'],
    midi: ['gui', 'midi'],
  };
  let result =
    possibleHits[data] === undefined ? ['notFound'] : possibleHits[data];
  return result;
};
