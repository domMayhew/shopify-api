var express = require('express');
var router = express.Router();
const model = require('../database/data-model');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('layout');
});

module.exports = router;
