var express = require('express');
var router = express.Router();

const model = require('../database/data-model').inventoryChanges;
const getWarehousesById = require('../database/data-model').warehouses.getById;
const {bulkGet} = require('./parse-request');
const {getFromParam} = require('./parse-request');

/***************************************************************************************
  * Get methods
 ****************************************************************************************/

router.get('/', async function(req, res, next) {
    res.send(await bulkGet(req, model));
});

/***************************************************************************************
  * POST methods
 ****************************************************************************************/

router.post('/', function(req, res, next) {
    const status = model.create(req.body) ? 400 : 200;
    res.status(status).send();
});

module.exports = router;