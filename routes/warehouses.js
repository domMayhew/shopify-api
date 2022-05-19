var express = require('express');
var router = express.Router();

const {warehouseQueries} = require('../database/data-model');
const viewName = 'warehouses';

/***************************************************************************************
 * Get methods
****************************************************************************************/

/**
 * Retreives warehouses in ascending ID order up to a maximum default value.
 */
router.get('/', async function(req, res, next) {
    res.render(viewName, {warehouses: await warehouseQueries.get(req.query.offset, req.query.limit)});
});

/**
 * Retrieves at most one warehouse with the given id.
 */
router.get('/id/:id', async function(req, res, next) {
    res.render(viewName, {warehouses: await warehouseQueries.getById(id)});
});

/**
 * Retrieves at most one warehouse with the given name.
 */

router.get('/name/:name', async function(req, res, next) {
    res.render(viewName, {warehouses: await warehouseQueries.getByName(name)});
});

/***************************************************************************************
  * POST
 ****************************************************************************************/
/**
 * requires {name, cityId}
 */
router.post('/', async function(req, res, next) {
    const status = warehouseQueries.create(req.body) ? 400 : 200;
    res.render(viewName, {warehouses: await warehouseQueries.getByName(req.body.name)});
});

/***************************************************************************************
  * PUT methods
 ****************************************************************************************/
/**
 * requires {id, name, cityId}
 */
router.put('/', async function(req, res, next) {
    const status = warehouseQueries.update(req.body) ? 400 : 200;
    res.render(viewName, {warehouses: await warehouseQueries.getById(req.body.id)});
});

/***************************************************************************************
  * DELETE methods
 ****************************************************************************************/
/**
 * requires {id}
 */
router.delete('/', async function(req, res, next) {
    const status = warehouseQueries.delete(req.body.id) ? 400 : 200;
    res.render(viewName, {warehouses: await warehouseQueries.get()});
});

module.exports = router;