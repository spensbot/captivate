const express = require('express');

const router = express.Router();
const universeController = require('./../controllers/universeController');

router
  .route('/*/*:id?')
  .get(universeController.getController)
  .put(universeController.putController);

module.exports = router;
