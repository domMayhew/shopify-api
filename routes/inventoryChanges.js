var express = require('express');
var router = express.Router();

const model = require('../database/data-model').inventoryChanges;
const getWarehousesById = require('../database/data-model').warehouses.getById;
const {bulkGet} = require('./parse-request');
const {getFromParam} = require('./parse-request');

/***************************************************************************************
  * Get methods
 ****************************************************************************************/

router.get('/', function(req, res, next) {
    res.send(bulkGet(req, model));
});

/***************************************************************************************
  * POST methods
 ****************************************************************************************/

router.post('/', function(req, res, next) {
    model.create(req.body);
    res.status(200).send();
});

module.exports = router;