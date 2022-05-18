/**
 * Encapsulates common logic among all routes.
 */

/***************************************************************************************
  * Get methods
 ****************************************************************************************/

function bulkGet(req, model) {
    const query = req.query;
    if (query.offset && query.count) {
        return model.get(query.offset, query.count);
    } else {
        return model.get();
    }
}

function getFromParam(req, model) {
    const sku = parseInt(req.params.productData);
    if (!isNaN(sku)) {
        return model.getById(sku);
    } else {
        return model.getByName(req.params.productData);
    }    
}

module.exports = {
    bulkGet: bulkGet,
    getFromParam: getFromParam
}