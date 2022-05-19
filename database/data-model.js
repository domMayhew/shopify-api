/**
 * database/data-model.js
 * This module abstracts the database by mapping the database tables onto logical classes and vice versa.
 * It is the only module that should access the database directly.
 * All others should interface with the database through this module.
 */
 const db = new require('better-sqlite3')('./database/db.sqlite');
 const axios = require('axios');
 const openWeatherURI = "https://api.openweathermap.org/data/2.5/weather"
 const openWeatherAPIKey = "413b2ed640294b5fe5da8c707f9d5fb4";

 /***************************************************************************************
 * Classes. These define the logical structure of the business data.
 * The classes are: Product, Warehouse, and InventoryChange.
 ****************************************************************************************/

 /**
  * Product. A view of the business data organized through the lens of a single product.
  * Contains simple identifying data: sku, name, price and description.
  * Also contains `inventory`: a list of all the warehouses that stock this product and the quantity at each location.
  * `inventory` is a list of objects in this format: {cityId, cityName, warehouseId, warehouseName, quantity}
  * Note the difference between product.inventory and warehouse.inventory.
  * 
  */
class Product {
    constructor({sku, name, price, description, inventory = []}) {
        if (!sku || !name || !price) {
            throw new Error("Product cannot be constructed without sku, name, and price all provided.");
        }
        this.sku = sku;
        this.name = name;
        this.price = price;
        this.description = description;
        this.inventory = inventory;
    }

    // Convenience method.
    getTotalInventory() {
        return sumInventory(this.inventory);
    }

    toString() {
        return "----------PRODUCT----------" +
            "\nSKU: " + this.sku +
            "\nName: " + this.name +
            "\nPrice: $" + this.price +
            "\nDescription: " + (this.description ? this.description : "") +
            "\nInventory\n" + (this.inventory
                ? this.inventory.reduce((str, curr) => str += `\tWarehouse: ${curr.name}\tQuantity: ${curr.quantity}\n`, "")
                : "");
    }
}

/**
 * Warehouse. A view of the business data through the lens of one warehouse.
 * Has simple data: id, name, cityId, and cityName.
 * Also has `inventory`: a list of all the products stocked at this warehouse and their quantities.
 * `inventory` is a list of objects of this format: {sku, name, quantity} (where name is the product name).
 * Note the difference in format between warehouse.inventory and product.inventory.
 */

class Warehouse {
    constructor({id, name, cityId, cityName, inventory= []}) {
        if (!id || !name) {
            throw new Error("Warehouse cannot be constructed without id and name provided.")
        }
        this.id = id;
        this.name = name;
        this.cityId = cityId;
        this.cityName = cityName;
        this.inventory = inventory;
    }

    // Convencience method.
    getTotalInventory() {
        return sumInventory(this.inventory);
    }

    toString() {
        return "----------WAREHOUSE----------" +
            "\nID: " + this.id +
            "\nName: " + this.name +
            "\nCity: " + (this.cityName ? this.cityName : this.cityName) +
            "\nInventory:\n" + (this.inventory
                ? this.inventory.reduce((str, curr) => str += `\tSKU: ${curr.sku}\tProduct Name: ${curr.name}\tQuantity: ${curr.quantity}\n`, "")
                : "");
    }
}

/**
 * Transaction. Represents the sale or purchase of inventory
 * and the corresponding change in stock at a particular warehouse.
 * Note that this use of the word "Transaction" refers to the commercial meaning,
 * not to "transaction" as it is defined in database theory.
 */
class Transaction {
    constructor({id, sku, productName, warehouseId, warehouseName, quantity}) {
        this.id = id;
        this.sku = sku;
        this.productName = productName;
        this.warehouseId = warehouseId;
        this.warehouseName = warehouseName;
        this.quantity = quantity;
    }

    toString() {
        return "----------WAREHOUSE----------" +
            "\nID: " + this.id +
            "\nSKU: " + this.sku +
            "\nProduct Name: " + this.productName +
            "\nWarehouse: " + this.warehouseName +
            "\nQuantity: " + this.quantity;
    }
}

// Helper function for convenience methods.
function sumInventory(inventory) {
    return inventory.reduce((sum, {quantity}) => sum + quantity);
}


/***************************************************************************************
 * Read functions.
 * Objects can be accessed by id, name, or in order of their primary key with an offset.
 * Regardless of the number of arguments passed,
 * the result is an array of values. The array will be empty if there is data that matches the constraints.
 * 
 * Many of these functions are asynchronous because they call the Open Weather API.
 * Some attempts have been made to keep the overhead of these API calls minimal,
 * including memoization/caching of the retrieved data. The default setting is to only retrieve
 * new weather data once the previous value is more than 30 minutes old, but this can be changed easily.
 ****************************************************************************************/

/**
 * PRODUCT read functions. ---------------------------------------------------------------
 */

// Provides a consistent selection of fields when reading product objects.
const productQueryString = "SELECT sku, name, price, description FROM product ";

/**
 * Returns an array of product objects corresponding to the provided skus.
 * Asynchronous due to Open Weather API call. Makes one call for every city with stock of one of these SKUs.
 * @param  {...Int} skus
 * @returns an array of product objects.
 */
async function getProductsBySKU(...skus) {
    return await dbProductQuery(productQueryString, "WHERE sku = ?", skus, Product);
}

/**
 * Returns an array of product objects corresponding to the provided names.
 * Product names are unique, so there will be at most one product object returned for each argument.
 * Asynchronous due to Open Weather API call. Makes one call for every city with stock of one of these SKUs.
 * @param  {...any} names
 * @returns an array of product objects.
 */
async function getProductsByName(...names) {
    return await dbProductQuery(productQueryString, "WHERE name = ?", names, Product);
}

/**
 * Returns an array of products ordered by SKU starting from the index of `offset` and including at most `count` objects.
 * @param {*} offset The index (relative to ascending SKU ordering) of the first product object in the returned array.
 * @param {*} count The maximum number of product objects to include in the array.
 * @returns An array of products ordered by SKU starting from the index of `offset` and including at most `count` objects.
 */
async function getProducts(offset = 0, count = 50) {
    // Products initialized from database without inventory data.
    const products = db
        .prepare(productQueryString + "LIMIT ?, ?")
        .all(offset, count)
        .map(row => new Product(row));
    // promises[] is used to accumulate promise values from the asynchonous call to getInventoryForSKU().
    // This allows each getInventoryForSKU() call to happen asynchronously but have this function await
    // all the promises before returning. The call to .then likely occurs after the loop has finished iterating,
    // but it maintains the appropriate value for `i` due to the `let` declaration and block scope closures.
    const promises = [];
    for (let i = 0; i < products.length; i++) {
        promises[i] = getInventoryForSKU(products[i].sku)
            .then(resolvedValue => products[i].inventory = resolvedValue);
    }
    let i = 0;
    while(i++ < 100000000)
        ;
    await Promise.all(promises);
    return products;
}

/**
 * Encapsulates common logic used in several of the product read functions.
 * sqlQuery is simply a constant passed by the client to provide consisten results for product queries.
 * sqlCondition is the condition clause appended to the end of sqlQuery. E.g., "WHERE NAME = ?"
 * sqlArgs is an array of values that will be bound to the sql query. This could be an array of names, skus, prices (i.e., WHERE price > sqlArgs[0]).
 * @param {*} sqlQuery Everything in the SQL query to be used up until the final WHERE clause.
 * @param {*} sqlCondition The final WHERE clause to be used in the query.
 * @param {*} sqlArgs An array of values that will be bound to the sql query one at a time.
 * @returns a list of product objects where each object matches the sqlCondition provided with one of the sqlArgs.
 */
 async function dbProductQuery(sqlQuery, sqlCondition, sqlArgs) {
    const product = new Array(sqlArgs.length);
    // promises[] is used to accumulate promise values from the asynchonous call to getInventoryForSKU().
    // This allows each getInventoryForSKU() call to happen asynchronously but have this function await
    // all the promises before returning. The call to .then likely occurs after the loop has finished iterating,
    // but it maintains the appropriate value for `i` due to the `let` declaration and block scope closures.
    const promises = new Array(sqlArgs.length);
    const statement = db.prepare(sqlQuery + sqlCondition);
    for (let i = 0; i < sqlArgs.length; i++) {
        product[i] = new Product(statement.get(sqlArgs[i]));
        promises[i] = getInventoryForSKU(product[i].sku)
            .then(resolved => product[i].inventory = resolved);
    };
    await Promise.all(promises);
    return product;
}

/**
 * Returns an inventory list with weather data for a given SKU.
 * Weather data requires an weather inquiry (but not necessarily API call -- see getWeatherForCity())
 * for each warehouse in which there is stock of this SKU.
 * @param {*} sku The SKU to get inventory data for.
 * @returns The inventory data. See notes on Product for details.
 */
async function getInventoryForSKU(sku) {
    let inventory = db
        .prepare("SELECT city.id AS cityId, city.name AS cityName, warehouse.id AS warehouseId, warehouse.name AS warehouseName, quantity " +
                 "FROM inventory " +
                 "INNER JOIN warehouse ON warehouse_id = warehouse.id " +
                 "INNER JOIN city ON city_id = city.id " +
                 "WHERE sku = ? ")
        .all(sku);
    const promises = [];
    for (let i = 0; i < inventory.length; i++) {
        promises[i] = getWeatherForCity(inventory[i].cityId)
            .then(resolvedValue => inventory[i].weather = resolvedValue);
    }
    await Promise.all(promises);
    return inventory;
}

/**
 * WAREHOUSE read functions. ---------------------------------------------------------------
 */

// Provides a consistent selection of fields when reading warehouse objects.
const warehouseQueryString = "SELECT warehouse.id AS id, warehouse.name AS name, " +
                             "city_id AS cityId, city.name AS cityName " +
                             "FROM warehouse INNER JOIN city ON city_id = city.id ";

/**
 * Returns an array of warehouse objects corresponding to the provided warehouse ids.
 * Asynchronous due to Open Weather API call. Makes one call for every city that contains one or more of these warehouses.
 * @param  {...Int} skus
 * @returns an array of warehouse objects.
 */
async function getWarehousesById(...ids) {
    return await dbWarehouseQuery(warehouseQueryString, "WHERE warehouse.id = ?", ids, Warehouse);
}

/**
 * Returns an array of warehouse objects corresponding to the provided warehouse names.
 * Asynchronous due to Open Weather API call. Makes one call for every city that contains one or more of these warehouses.
 * @param  {...Int} skus
 * @returns an array of warehouse objects.
 */
async function getWarehousesByName(...names) {
    return await dbWarehouseQuery(warehouseQueryString, "WHERE warehouse.name = ?", names, Warehouse);
}

/**
 * Returns an array of warehouses ordered by warehouse ID, starting from the index of `offset` and including at most `count` objects.
 * @param {*} offset The index (relative to ascending warehouse ID ordering) of the first warehouse object in the returned array.
 * @param {*} count The maximum number of warehouse objects to include in the array.
 * @returns An array of warehouses ordered by SKU starting from the index of `offset` and including at most `count` objects.
 */
async function getWarehouses(offset = 0, count = 50) {
    const houses = db
        .prepare(warehouseQueryString + "LIMIT ?, ?")
        .all(offset, count)
        .map(row => new Warehouse(row));
    // promises[] is used to accumulate promise values from the asynchonous call to getWeatherForCity().
    // This allows each getWeatherForCity() call to happen asynchronously but have this function await
    // all the promises before returning. The call to .then likely occurs after the loop has finished iterating,
    // but it maintains the appropriate value for `i` due to the `let` declaration and block scope closures.
    const promises = new Array(houses.length);
    for (let i = 0; i < houses.length; i++) {
        houses[i].inventory = getInventoryForWarehouse(houses[i].id);
        promises[i] = getWeatherForCity(houses[i].cityId)
            .then(resolvedValue => houses[i].weather = resolvedValue);
    };
    await Promise.all(promises);
    return houses;
}

/**
 * Encapsulates common logic used in several of the warehouse read functions.
 * sqlQuery is simply a constant passed by the client to provide consisten results for product queries.
 * sqlCondition is the condition clause appended to the end of sqlQuery. E.g., "WHERE NAME = ?"
 * sqlArgs is an array of values that will be bound to the sql query. This could be an array of names, skus, prices (i.e., WHERE city_id = sqlArgs[0]).
 * @param {*} sqlQuery 
 * @param {*} sqlCondition 
 * @param {*} sqlArgs 
 * @returns 
 */
 async function dbWarehouseQuery(sqlQuery, sqlCondition, sqlArgs) {
    const houses = new Array(sqlArgs.length);
    const statement = db.prepare(sqlQuery + sqlCondition);
    // promises[] is used to accumulate promise values from the asynchonous call to getInventoryForSKU().
    // This allows each getInventoryForSKU() call to happen asynchronously but have this function await
    // all the promises before returning. The call to .then likely occurs after the loop has finished iterating,
    // but it maintains the appropriate value for `i` due to the `let` declaration and block scope closures.
    const promises = new Array(sqlArgs.length);
    for (let i = 0; i < sqlArgs.length; i++) {
        houses[i] = new Warehouse(statement.get(sqlArgs[i]));
        houses[i].inventory = getInventoryForWarehouse(houses[i].id);
        promises[i] = getWeatherForCity(houses[i].cityId)
            .then(resolved => houses[i].weather = resolved);
    };
    await Promise.all(promises);
    return houses;
}

/**
 * Returns an inventory list with weather data for a given warehouse.
 * Does not include any Open Weather API calls.
 * @param {*} id The warehouse to get inventory data for.
 * @returns The inventory data. See notes on Warehouse for details.
 */

function getInventoryForWarehouse(id) {
    return db
        .prepare("SELECT sku, name, quantity " +
                 "FROM inventory " +
                 "INNER JOIN product USING(sku) " +
                 "WHERE warehouse_id = ? ")
        .all(id);
}

/**
 * TRANSACTION read functions. ---------------------------------------------------------------
 */

/**
 * Returns an array of transaction objects starting from `offset` and including at most `count` transactions.
 * @param {*} offset The index (relative to the descending transaction id ordering) of the first transaction object in the returned array.
 * @param {*} count The maximum number of warehosue objects to include in the array.
 * @returns An array of transaction objects.
 */
function getTransactions(offset = 0, count = 50) {
    return db
        .prepare("SELECT inventory_change.id AS id, sku, product.name AS productName, " +
                 "warehouse.id AS warehouseId, warehouse.name AS warehouseName, quantity " +
                 "FROM inventory_change " +
                 "INNER JOIN product USING(sku) " +
                 "INNER JOIN warehouse ON warehouse_id = warehouse.id " +
                 "ORDER BY inventory_change.id DESC " +
                 "LIMIT ?, ? ")
        .all(offset, count)
        .map(row => new Transaction(row));
}

/**
 * Read HELPER functions. ---------------------------------------------------------------
 */

/**
 * Uses the createCache memoizing function to create a cache of weather data to prevent unnecessary API calls.
 * The second argument to createCache is the maximum age of weather data in minutes before calls to weather data
 * will result in an Opean Weather API call.
 */
const getWeatherForCity = createCache(async (cityId) => {
    return axios.get(openWeatherURI + "?id=" + cityId + "&units=metric" + "&appid=" + openWeatherAPIKey)
        .then( ({data}) => data.main.temp + "°C, " + data.weather[0].description)
        .catch( err => {
            console.log("Error thrown accessing OpenWeather: (cityId:" + cityId + ")" + err);
            return "Unable to obtain weather.";
        });
}, 30);

/**
 * A caching/memoizing function. Checks to see if there is a previously computed value within the specified time frame.
 * If none is found or the old value is expired, a new value is computed.
 * The function passed must take a single input that can be used as an object key.
 * @param {*} f the function that the cache is being created for.
 * @param {*} minutes the maximum permissible age of previously computed data before a new value is computed.
 * @returns the a version of f that uses a cache.
 */
function createCache(f, minutes, logStats = false) {
    const cache = {};
    const stats = {cacheHits: 0, cacheMisses: 0}
    return async (arg) => {
        // Check if argument has been previously computed and is in cache.
        if (cache[arg] && cache[arg].timestamp - Date.now() < minutes * 60 * 1000) {
            stats.cacheHits++;
            if (logStats) console.log(stats);
            return cache[arg].data;
        } else { // Value was not found in cache, create new entry and compute new value.
            stats.cacheMisses++;
            if (logStats) console.log(stats);
            cache[arg] = { data: f(arg), timestamp: Date.now() };
            return cache[arg].data;
        }
    }
}

/***************************************************************************************
 * CREATE functions
 * CREATE, UPDATE, and DELETE functions return an error if the operation could not be completed.
 * Since errors evaluate to true, these functions return false if they succeeded.
 ****************************************************************************************/
function createProduct(product) {
    try {
        db.prepare("INSERT INTO product (name, price, description)" +
                   "VALUES (:name, :price, :description)")
            .run(product);
        return false;
    } catch (err) {
        console.log("Error trying to create new product: " + err);
        return err;
    }
}

function createWarehouse({name, cityId}) {
    try {
        db.prepare("INSERT INTO warehouse (name, city_id)" + 
                   "VALUES (?, ?)")
            .run(name, cityId);
        return false;
    } catch (err) {
        console.log("Error trying to create new warehouse: " + err);
        return err;
    }
}

function createTransaction({sku, warehouseId, quantity}) {
    try {
        let currInventory = getInventoryForWarehouse(warehouseId).filter(record => record.sku == sku)[0].quantity;
        if (!currInventory) {
            currInventory = 0;
        }
        if (currInventory + quantity < 0) {
            return false;
        } else {
            db.prepare("INSERT INTO inventory_change (sku, warehouse_id, quantity) VALUES(?,?,?)")
                .run(sku, warehouseId, quantity);
            db.prepare("REPLACE INTO inventory (sku, warehouse_id, quantity) VALUES(?, ?, ?)")
                .run(sku, warehouseId, currInventory + quantity);
        }
        return false;
    } catch (err) {
        console.log("Error trying to log transaction: " + err);
        return err;
    }
}

// HELPER Functions

function getCityByName(name) {
    return db.prepare("SELECT id, name FROM city WHERE name = ?").get(name);
}

/***************************************************************************************
 * UPDATE functions
 * CREATE, UPDATE, and DELETE functions return an error if the operation could not be completed.
 * Since errors evaluate to true, these functions return false if they succeeded.
 ****************************************************************************************/

function updateProduct(product) {
    try {
        db.prepare("UPDATE product " +
                   "SET name = :name, " +
                        "price = :price, " +
                        "description = :description " +
                    "WHERE sku = :sku ")
            .run(product);
        return false;
    } catch (err) {
        console.log("Error trying to update product: " + err);
        return err;
    }
}

function updateWarehouse(warehouse) {
    try {
        db.prepare("UPDATE warehouse " +
                   "SET name = :name, " +
                        "city_id = :city_id " +
                    "WHERE id = :id")
            .run(warehouse);
        return false;
    } catch (err) {
        console.log("Error trying to update warehouse: " + err);
        return err;
    }
}

/***************************************************************************************
 * DELETE functions
 * CREATE, UPDATE, and DELETE functions return an error if the operation could not be completed.
 * Since errors evaluate to true, these functions return false if they succeeded.
 ****************************************************************************************/

function deleteProduct(sku) {
    try {
        db.prepare("DELETE FROM product " +
                    "WHERE sku = ?")
            .run(sku);
        return false;
    } catch (err) {
        console.log("Error trying to delete product: " + err);
        return err;
    }
}

function deleteWarehouse(id) {
    try {
        db.prepare("DELETE FROM warehouse " +
                    "WHERE id = ?")
            .run(id);
        return false;
    } catch (err) {
        console.log("Error trying to delete warehouse: " + err);
    }
}

/***************************************************************************************
 * Export. Used CommonJS instead of ES Modules for consistency with the rest of the app.
 ****************************************************************************************/

module.exports = {
    products: {
        class: Product,
        getById: getProductsBySKU,
        getByName: getProductsByName,
        get: getProducts,

        create: createProduct,
        update: updateProduct,
        delete: deleteProduct
    },

    warehouses: {
        class: Warehouse,
        getById: getWarehousesById,
        getByName: getWarehousesByName,
        get: getWarehouses,

        create: createWarehouse,
        update: updateWarehouse,
        delete: deleteWarehouse
    },

    inventoryChanges: {
        class: Transaction,
        get: getTransactions,

        create: createTransaction
    }
}