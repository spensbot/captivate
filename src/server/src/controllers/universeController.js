const asyncHandler = require('../middleware/asyncHandler');

const visualScenesSorter = require('../utils/visualScenesSorter');
const universeSorter = require('../utils/universeSorter');
const mixerSorter = require('./../utils/mixerSorter');
const modulationSorter = require('./../utils/modulationSorter');
const masterSorter = require('./../utils/masterSorter');

// PUT

exports.putController = asyncHandler((req, res, next) => {
  try {
    //Extract url data
    let url = req.originalUrl;
    url = url.split('/');
    url.splice(0, 2);

    const payload = { data: req.body.data, target: url };

    //Communicate with the FE

    //Wait for response

    socketClient.once('controller-put-response', (data) => {
      if (data.status === 'success') {
        res.status(200).json({
          status: data.status,
          data: payload,
        });
      } else if (data.status === 'fail') {
        console.log(data);
        res.status(400).json({
          statuts: data.status,
          data: data.err,
        });
      }
    });

    // Init communication

    io.emit('controller-put', payload);
  } catch (err) {
    console.log(err);
  }
});

// GET

exports.getController = asyncHandler(async (req, res, next) => {
  try {
    //Extract url data

    let id;
    let url = req.originalUrl;
    url = url.split('/');
    url.splice(0, 2);

    //Check ID

    if (url.length === 3) {
      id = url[2];
      url.pop();
      if (id.length !== 21) {
        res.status(400).json({
          status: 'fail',
          reason: 'Invalid ID format',
        });
      }
    }

    //Sort to get right params to access state on the FE

    const target = getSorter(url, id);

    if (target.at(-1) === 'notFound') {
      res.status(400).json({
        status: 'fail',
        data: {
          reason: 'Non-existant property/route.',
        },
      });
    }

    //Communicate with the FE

    //Wait for response

    socketClient.once('controller-get-response', (data) => {
      if (data.status === 'success') {
        res.status(200).json({
          status: data.status,
          data: data.data,
        });
      } else if (data.status === 'fail') {
        res.status(400).json({
          status: data.status,
          data: data.err,
        });
      }
    });

    //Init communication

    io.emit('controller-get', { target });
  } catch (err) {
    console.log('Error', err);
  }
});

const getSorter = (entryData, id) => {
  const result = [];
  if (entryData[0] === 'universe') {
    result.push('dmx', 'present');
    const sortedData = universeSorter.universeSort(entryData[1]);
    sortedData.forEach((el) => result.push(el));
  } else if (entryData[0] === 'dmxOut') {
    result.push('mixer');
    const sortedData = mixerSorter.mixerSort(entryData[1]);
    sortedData.forEach((el) => result.push(el));
  } else if (entryData[0] === 'visualScenes') {
    result.push('control', 'present', 'visual');
    const sortedData = visualScenesSorter.visualScenesSort(entryData[1], id);
    sortedData.forEach((el) => result.push(el));
  } else if (entryData[0] === 'modulation') {
    result.push('control', 'present', 'light');
    const sortedData = modulationSorter.modulationSort(entryData[1], id);
    sortedData.forEach((el) => result.push(el));
  } else if (entryData[0] === 'master') {
    const sortedData = masterSorter.masterSort(entryData[1]);
    sortedData.forEach((el) => result.push(el));
  } else {
    result.push('notFound');
  }
  return result;
};
