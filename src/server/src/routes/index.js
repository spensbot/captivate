const express = require('express');

const router = express.Router();
const universeController = require('./../controllers/universeController');

router
  .route('/api')
  .get(universeController.getAddFixture)
  .post(universeController.postAddFixture);

module.exports = router;
