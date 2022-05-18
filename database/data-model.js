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

    getTotalInventory() {
        return this.inventory.reduce(inventoryReducer, 0);
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

    getTotalInventory() {
        return this.inventory.reduce(inventoryReducer, 0);
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

class InventoryChange {
    constructor({id, sku, productName, warehouseName, quantity}) {
        this.id = id;
        this.sku = sku;
        this.productName = productName;
        this.warehouseID = warehouseID;
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

/**
 * Helper function for getting total inventory quantities for a warehouse or product.
 */
function inventoryReducer(sum, {quantity}) { return sum + quantity}


/***************************************************************************************
 * Read functions.
 * Objects can be accessed by id, name, or in bulk.
 * The result is an array of values which will be empty if there are is no matching data.
 ****************************************************************************************/

// PRODUCTS
const productQueryString = "SELECT sku, name, price, description FROM product ";

async function getProductsBySKU(...skus) {
    return await dbProductQuery(productQueryString, "WHERE sku = ?", skus, Product);
}

async function getProductsByName(...names) {
    return await dbProductQuery(productQueryString, "WHERE name = ?", names, Product);
}

// TODO
async function getProducts(offset = 0, count = 50) {
    let products;
    const rows = db
        .prepare(productQueryString + "LIMIT ?, ?")
        .all(offset, count);
    products = rows.map(row => new Product(row));
    for (const product of products) {
        product.inventory = await getInventoryForSKU(product.sku);
    }
    return products;
}

// WAREHOUSES
const warehouseQueryString = "SELECT warehouse.id AS id, warehouse.name AS name, " +
                             "city_id AS cityId, city.name AS cityName " +
                             "FROM warehouse INNER JOIN city ON city_id = city.id ";

async function getWarehousesById(...ids) {
    return await dbWarehouseQuery(warehouseQueryString, "WHERE warehouse.id = ?", ids, Warehouse);
}

async function getWarehousesByName(...names) {
    return await dbWarehouseQuery(warehouseQueryString, "WHERE warehouse.name = ?", names, Warehouse);
}

async function getWarehouses(offset = 0, count = 50) {
    const rows = db
        .prepare(warehouseQueryString + "LIMIT ?, ?")
        .all(offset, count);
    const houses = rows.map(row => new Warehouse(row));
    for (const house of houses) {
        house.inventory = getInventoryForWarehouse(house.id);
        house.weather = await getWeatherForCity(house.cityId);
    };
    return houses;
}

// INVENTORY CHANGES

function getInventoryChanges(offset = 0, count = 50) {
    return db
        .prepare("SELECT inventory_change.id AS id, sku, product.name, warehouse.name, quantity " +
                 "FROM inventory_change " +
                 "INNER JOIN product USING(sku) " +
                 "INNER JOIN warehouse ON warehouse_id = warehouse.id " +
                 "LIMIT ?, ? ")
        .all(offset, count);
}

// HELPER FUNCTIONS

async function dbProductQuery(sqlQuery, sqlCondition, sqlArgs) {
    const data = new Array(sqlArgs.length);
    const promises = new Array(sqlArgs.length);
    const statement = db.prepare(sqlQuery + sqlCondition);
    for (let i = 0; i < sqlArgs.length; i++) {
        data[i] = new Product(statement.get(sqlArgs[i]));
        promises[i] = getInventoryForSKU(data[i].sku)
            .then(resolved => data[i].inventory = resolved);
    };
    await Promise.all(promises);
    return data;
}

async function dbWarehouseQuery(sqlQuery, sqlCondition, sqlArgs) {
    const data = new Array(sqlArgs.length);
    const promises = new Array(sqlArgs.length);
    const statement = db.prepare(sqlQuery + sqlCondition);
    for (let i = 0; i < sqlArgs.length; i++) {
        data[i] = new Warehouse(statement.get(sqlArgs[i]));
        promises[i] = getWeatherForCity(data[i].cityId)
            .then(resolved => data[i].weather = resolved);
    };
    await Promise.all(promises);
    return data;
}

async function getInventoryForSKU(sku) {
    inventory = db
        .prepare("SELECT city.id AS cityId, warehouse.id AS warehouseID, warehouse.name AS warehouseName, quantity " +
                 "FROM inventory " +
                 "INNER JOIN warehouse ON warehouse_id = warehouse.id " +
                 "INNER JOIN city ON city_id = city.id " +
                 "WHERE sku = ? ")
        .all(sku);
    for (const record of inventory) {
        record.weather = await getWeatherForCity(record.cityId);
    }
    return inventory;
}

function getInventoryForWarehouse(id) {
    return db
        .prepare("SELECT sku, name, quantity " +
                 "FROM inventory " +
                 "INNER JOIN product USING(sku) " +
                 "WHERE warehouse_id = ? ")
        .all(id);
}

const getWeatherForCity = createCache(async (cityId) => {
    try {
        const {data} = await axios.get(openWeatherURI + "?id=" + cityId + "&units=metric" + "&appid=" + openWeatherAPIKey);
        return data.main.temp + "°C, " + data.weather[0].description;
    } catch (err) {
        console.log("Error thrown accessing OpenWeather: (cityId:" + cityId + ")" + err);
        return "Unable to obtain weather.";
    }
}, 30);

function createCache(f, minutes) {
    const cache = {};
    return async (arg) => {
        if (cache[arg] && cache[arg].timestamp - Date.now() < minutes * 60 * 1000) {
            return cache[arg].data;
        } else {
            cache[arg] = { timestamp: Date.now() };
            return cache[arg].data = await f(arg);
        }
    }
}

/***************************************************************************************
 * CREATE functions
 ****************************************************************************************/
function createProduct(product) {
    db.prepare("INSERT INTO product (name, price, description)" +
               "VALUES (:name, :price, :description)")
        .run(product);
}

function createWarehouse(warehouse) {
    let city = getCityByName(warehouse.cityName);
    if (!city) {
        city = createCity(warehouse.cityName);
    }
    db.prepare("INSERT INTO warehouse (name, city_id)" + 
               "VALUES (?, ?)")
        .run(warehouse.name, city.id);
}

function createInventoryChange(inventoryChange) {
    const {sku, warehouse_id, quantity} = inventoryChange;
    if (!sku || !warehouse_id || !quantity) {
        return false;
    } else {
        let currInventory = getInventoryForWarehouse(warehouse_id).filter(record => record.sku == sku)[0].quantity;
        if (!currInventory) {
            currInventory = 0;
        }
        if (currInventory + quantity < 0) {
            return false;
        } else {
            db.prepare("INSERT INTO inventory_change (sku, warehouse_id, quantity) VALUES(:sku, :warehouse_id, :quantity)")
                .run(inventoryChange);
            db.prepare("REPLACE INTO inventory (sku, warehouse_id, quantity) VALUES(?, ?, ?)")
                .run(sku, warehouse_id, currInventory + quantity);
        }
    }
}

// HELPER Functions

function getCityByName(name) {
    return db.prepare("SELECT id, name FROM city WHERE name = ?").get(name);
}

function createCity(name) {
    return (db.prepare("INSERT INTO city (name) VALUES (?)")
                .run(name)).lastInsertRowid;
}

/***************************************************************************************
 * UPDATE functions
 ****************************************************************************************/

function updateProduct(product) {
    db.prepare("UPDATE product " +
               "SET name = :name, " +
                    "price = :price, " +
                    "description = :description " +
                "WHERE sku = :sku ")
        .run(product);
}

function updateWarehouse(warehouse) {
    db.prepare("UPDATE warehouse " +
               "SET name = :name, " +
                    "city_id = :city_id " +
                "WHERE id = :id")
        .run(warehouse);
}

/***************************************************************************************
 * DELETE functions
 ****************************************************************************************/

function deleteProduct(sku) {
    db.prepare("DELETE FROM product " +
                "WHERE sku = ?")
        .run(sku);
}

function deleteWarehouse(id) {
    db.prepare("DELETE FROM warehouse " +
                "WHERE id = ?")
        .run(id);
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
        class: InventoryChange,
        get: getInventoryChanges,

        create: createInventoryChange
    }
}