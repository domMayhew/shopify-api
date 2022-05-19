var express = require('express');
var router = express.Router();

const {productQueries} = require('../database/data-model');
const viewName = 'products';

/***************************************************************************************
  * Get methods
 ****************************************************************************************/
/**
 * /products    <- retrieves products in ascending SKU order up to a default maximum number
 */
router.get('/', async function(req, res, next) {
    res.render(viewName, {products: await productQueries.get(req.body.offset, req.body.limit)});
});

/**
 * retrieves at most one product identified by the sku.
 */
router.get('/sku/:sku', async function (req, res, next) {
    res.render(viewName, {products: await productQueries.getBySku(sku)});
});

/**
 * retrieves at most one product identified by the name.
 */
router.get('/name/:name', async function(req, res, next) {
        res.render(viewName, {products: await productQueries.getByName(name)});
});

/***************************************************************************************
  * POST methods
 ****************************************************************************************/
/**
 * requires {name, price, description}
 */
router.post('/', async function(req, res, next) {
    const status = productQueries.create(req.body) ? 400 : 200;
    res.render(viewName, {products: await productQueries.getByName(req.body.name)});
});

/***************************************************************************************
 * UPDATE methods
 ****************************************************************************************/
/**
 * requires {name, price, description}
 */
router.put('/', async function(req, res, next) {
    const status = productQueries.update(req.body) ? 400 : 200;
    res.render(viewName, {products: await productQueries.getBySku(req.body.sku)});
});

/***************************************************************************************
 * DELETE methods
 ****************************************************************************************/
/**
 * requires {sku}
 */
router.delete('/', async function(req, res, next) {
    const status = productQueries.delete(req.body.sku) ? 400 : 200;
    res.render(viewName, {products: await productQueries.get()});
});

module.exports = router;