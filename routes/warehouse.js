var express = require('express');
var router = express.Router();

const model = require('../database/data-model').warehouses;
const {bulkGet} = require('./parse-request');
const {getFromParam} = require('./parse-request');

/***************************************************************************************
 * Get methods
****************************************************************************************/

router.get('/', function(req, res, next) {
    res.send(bulkGet(req, model));
});

router.get('/:productData', function(req, res, next) {
    res.send(getFromParam(req, model));
});

module.exports = router;