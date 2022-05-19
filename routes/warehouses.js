var express = require('express');
var router = express.Router();

const model = require('../database/data-model').warehouses;
const {bulkGet} = require('./queries');
const {getFromParam} = require('./queries');
const viewName = 'warehouses';

/***************************************************************************************
 * Get methods
****************************************************************************************/

/**
 * Retreives warehouses in ascending ID order up to a maximum default value.
 */
router.get('/', async function(req, res, next) {
    res.render(viewName, {warehouses: await bulkGet(req, model)});
});

/**
 * warehouses/:name <- Retreives at most one value
 * OR
 * warehouses/:id   <- Retreives at most one value
 */
router.get('/:productData', async function(req, res, next) {
    res.render(viewName, {warehouses: await getFromParam(req, model)});
});

/***************************************************************************************
  * POST
 ****************************************************************************************/
/**
 * requires {name, cityId}
 */
router.post('/', function(req, res, next) {
    const status = model.create(req.body) ? 400 : 200;
    res.status(status).send();
});

/***************************************************************************************
  * UPDATE methods
 ****************************************************************************************/
/**
 * requires {name, cityId}
 */
router.put('/', function(req, res, next) {
    const status = model.update(req.body) ? 400 : 200;
    res.status(status).send();
});

/***************************************************************************************
  * DELETE methods
 ****************************************************************************************/
/**
 * /warehouses/:id
 */
router.delete('/:id', function(req, res, next) {
    const status = model.delete(req.params.id) ? 400 : 200;
    res.status(status).send();
});

module.exports = router;