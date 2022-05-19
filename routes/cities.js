var express = require('express');
var router = express.Router();
const {cityQueries} = require('../database/data-model');
const viewName = 'cities';

/**
 * GET Cities page
 * Does not need to be an asynchronous call because viewing cities does not return weather data.
 */
router.get('/', function(req, res, next) {
    const name = req.query.name;
    const limit = req.query.limit;
    let cities;
    if (!name || !limit) {
        cities = [];
    } else {
        cities = {cityQueries}.cities.search(name, limit);
    }
    res.render(viewName, {cities: cities});
});

module.exports = router;
