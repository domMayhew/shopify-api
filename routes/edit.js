var express = require('express');
var router = express.Router();
const model = require('../database/data-model');
const viewName = 'edit';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render(viewName);
});

module.exports = router;
