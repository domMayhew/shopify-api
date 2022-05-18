var express = require('express');
var router = express.Router();

const model = require('../database/data-model').products;
const {bulkGet} = require('./parse-request');
const {getFromParam} = require('./parse-request');

/***************************************************************************************
  * Get methods
 ****************************************************************************************/

router.get('/', async function(req, res, next) {
    res.send(await bulkGet(req, model));
});

router.get('/:productData', async function (req, res, next) {
    res.send(await getFromParam(req, model));
});

/***************************************************************************************
  * POST methods
 ****************************************************************************************/

router.post('/', function(req, res, next) {
    const status = model.create(req.body) ? 400 : 200;
    res.status(status).send();
});

/***************************************************************************************
 * UPDATE methods
 ****************************************************************************************/

router.put('/', function(req, res, next) {
    const status = model.update(req.body) ? 400 : 200;
    res.status(status).send();
});

/***************************************************************************************
 * DELETE methods
 ****************************************************************************************/
router.delete('/:sku', function(req, res, next) {
    const status = model.delete(req.params.sku) ? 400 : 200;
    res.status(status).send();
});

module.exports = router;