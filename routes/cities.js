var express = require('express');
var router = express.Router();
const model = require('../database/data-model');
const viewName = 'cities';

/* GET home page. */
router.get('/', function(req, res, next) {
    const name = req.query.name;
    const limit = req.query.limit;
    let cities;
    if (!name || !limit) {
        cities = [];
    } else {
        cities = model.cities.search(name, limit);
    }
    res.render(viewName, {cities: cities});
});

module.exports = router;
