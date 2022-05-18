/**
 * Encapsulates common logic among all routes.
 */

/***************************************************************************************
  * Get methods
 ****************************************************************************************/

async function bulkGet(req, model) {
    const query = req.query;
    if (query.offset && query.count) {
        return await model.get(query.offset, query.count);
    } else {
        return await model.get();
    }
}

async function getFromParam(req, model) {
    const sku = parseInt(req.params.productData);
    if (!isNaN(sku)) {
        return await model.getById(sku);
    } else {
        return await model.getByName(req.params.productData);
    }    
}

module.exports = {
    bulkGet: bulkGet,
    getFromParam: getFromParam
}