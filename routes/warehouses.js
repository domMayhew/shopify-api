var express = require('express');
var router = express.Router();

const model = require('../database/data-model').warehouses;
const {bulkGet} = require('./parse-request');
const {getFromParam} = require('./parse-request');

/***************************************************************************************
 * Get methods
****************************************************************************************/

router.get('/', function(req, res, next) {
    res.send(bulkGet(req, model));
});

router.get('/:productData', function(req, res, next) {
    res.send(getFromParam(req, model));
});

/***************************************************************************************
  * POST methods
 ****************************************************************************************/
router.post('/', function(req, res, next) {
    model.create(req.body);
    res.status(200).send();
});

/***************************************************************************************
  * UPDATE methods
 ****************************************************************************************/
router.put('/', function(req, res, next) {
    model.update(req.body);
    res.status(200).send();
});

/***************************************************************************************
  * UPDATE methods
 ****************************************************************************************/
router.delete('/:id', function(req, res, next) {
    model.delete(req.params.id);
    res.status(200).send();
});

module.exports = router;