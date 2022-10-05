exports.mixerSort = (data) => {
  const possibleHits = {
    pageIndex: ['pageIndex'],
    channelsPerPage: ['channelsPerPage'],
    overwrites: ['overwrites'],
  };
  let result =
    possibleHits[data] === undefined ? ['notFound'] : possibleHits[data];
  return result;
};
