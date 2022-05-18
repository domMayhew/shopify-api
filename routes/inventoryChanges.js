var express = require('express');
var router = express.Router();

const model = require('../database/data-model').inventoryChanges;
const {bulkGet} = require('./parse-request');
const {getFromParam} = require('./parse-request');

/***************************************************************************************
  * Get methods
 ****************************************************************************************/

router.use('/', function(req, res, next) {
    res.send(bulkGet(req, model));
});

module.exports = router;