var express = require('express');
var router = express.Router();

const model = require('../database/data-model').products;
const {bulkGet} = require('./queries');
const {getFromParam} = require('./queries');
const viewName = 'products';

/***************************************************************************************
  * Get methods
 ****************************************************************************************/
/**
 * /products    <- retrieves products in ascending SKU order up to a default maximum number
 */
router.get('/', async function(req, res, next) {
    res.render(viewName, {products: await bulkGet(req, model)});
});

/**
 * /products/:sku       <- retreives at most one product
 * OR
 * /products/:name      <- retreives at most one product
 */
router.get('/:productData', async function (req, res, next) {
    res.render(viewName, {products: await getFromParam(req, model)});
});

/***************************************************************************************
  * POST methods
 ****************************************************************************************/
/**
 * requires {name, price, description}
 */
router.post('/', function(req, res, next) {
    const status = model.create(req.body) ? 400 : 200;
    res.status(status).send();
});

/***************************************************************************************
 * UPDATE methods
 ****************************************************************************************/
/**
 * requires {name, price, description}
 */
router.put('/', function(req, res, next) {
    const status = model.update(req.body) ? 400 : 200;
    res.status(status).send();
});

/***************************************************************************************
 * DELETE methods
 ****************************************************************************************/
/**
 * /products/:sku
 */
router.delete('/:sku', function(req, res, next) {
    const status = model.delete(req.params.sku) ? 400 : 200;
    res.status(status).send();
});

module.exports = router;