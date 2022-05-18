const { query } = require('express');
var express = require('express');
var router = express.Router();

const model = require('../database/data-model');

/***************************************************************************************
  * Get methods
 ****************************************************************************************/

router.get('/', function(req, res, next) {
  const query = req.query;
  if (query.offset && query.count) {
      res.send(model.getProducts(query.offset, query.count));
  } else {
      res.send(model.getProducts());
  }
});

router.get('/:productData', function (req, res, next) {
    console.log(req.params.productData);
    const sku = parseInt(req.params.productData);
    if (!isNaN(sku)) {
        res.send(model.getProductsBySKU(sku));
    } else {
        res.send(model.getProductsByName(req.params.productData));
    }
});

module.exports = router;