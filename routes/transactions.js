var express = require('express');
var router = express.Router();

const {transactionQueries} = require('../database/data-model');
const viewName = 'transactions';

/***************************************************************************************
  * GET
  * /transaction                    <- Retrieves transactions in descending ID order up
  *                                    a maximum default value.
  * /transaction?offset=x&count=y   <- Retreives count transactions starting at offset.
 ****************************************************************************************/

router.get('/', async function(req, res, next) {
    res.render(viewName, {transactions: await transactionQueries.get(req.body.offset, req.body.limit)});
});

/***************************************************************************************
  * POST
  * Requires {productId, warehouseId, quantity}
 ****************************************************************************************/

router.post('/', async function(req, res, next) {
    const status = transactionQueries.create(req.body) ? 400 : 200;
    res.render(viewName, {transactions: await transactionQueries.get()});
});

module.exports = router;