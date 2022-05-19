var express = require('express');
var router = express.Router();

const model = require('../database/data-model').inventoryChanges;
const getWarehousesById = require('../database/data-model').warehouses.getById;
const {bulkGet} = require('./queries');
const {getFromParam} = require('./queries');
const viewName = 'transactions';

/***************************************************************************************
  * GET
  * /transaction                    <- Retrieves transactions in descending ID order up
  *                                    a maximum default value.
  * /transaction?offset=x&count=y   <- Retreives count transactions starting at offset.
 ****************************************************************************************/

router.get('/', async function(req, res, next) {
    res.render(viewName, {transactions: await bulkGet(req, model)});
});

/***************************************************************************************
  * POST
  * Requires {productId, warehouseId, quantity}
 ****************************************************************************************/

router.post('/', function(req, res, next) {
    const status = model.create(req.body) ? 400 : 200;
    res.status(status).send();
});

module.exports = router;