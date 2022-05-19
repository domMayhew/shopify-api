var express = require('express');
var router = express.Router();
const model = require('../database/data-model');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('layout');
});

router.get('/view-warehouse', function(req, res, next) {
  res.render('view-warehouse');
});

router.get('/edit', function(req, res, next) {
  res.render('edit');
});

module.exports = router;
