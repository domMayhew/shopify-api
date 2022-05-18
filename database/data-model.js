/**
 * database/data-model.js
 * This module abstracts the database by mapping the database tables onto logical classes and vice versa.
 * It is the only module that should access the database directly.
 * All others should interface with the database through this module.
 */
 const db = new require('better-sqlite3')('./database/db.sqlite');

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
    constructor({id, name, cityName, inventory = []}) {
        if (!id || !name) {
            throw new Error("Warehouse cannot be constructed without id and name provided.")
        }
        this.id = id;
        this.name = name;
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

function getProductsBySKU(...skus) {
    return skus.map((sku) => {
        const product = new Product(
            db
                .prepare("SELECT sku, name, price, description FROM product WHERE sku = ?")
                .get(sku)
        );
        product.inventory = getInventoryForSKU(sku);
        return product;
    });
}

function getProductsByName(...names) {
    // Map every name to a Product object.
    return names.map((name) => {
        const product = new Product(
            db
                .prepare("SELECT sku, name, price, description FROM product WHERE name = ?")
                .get(name)
        );
        product.inventory = getInventoryForSKU(product.sku);
        return product;
    });
}

function getProducts(offset = 0, count = 50) {
    const rows = db
        .prepare("SELECT sku, name, price, description " +
                 "FROM product " +
                 "LIMIT ?, ?")
        .all(offset, count);
    const products = rows.map(row => new Product(row));
    products.forEach(product => product.inventory = getInventoryForSKU(product.sku));
    return products;
}

// WAREHOUSES

function getWarehousesById(...ids) {
    return ids.map(id => {
        const house = new Warehouse(
            db
                .prepare("SELECT warehouse.id AS id, warehouse.name AS name, city.name AS cityName FROM warehouse INNER JOIN city ON city_id = city.id WHERE warehouse.id = ?")
                .get(id)
        );
        house.inventory = getInventoryForWarehouse(id);
        return house;
    });
}

function getWarehousesByName(...names) {
    return names.map(name => {
        const house = new Warehouse(
            db
                .prepare("SELECT warehouse.id AS id, warehouse.name AS name, city.name AS cityName FROM warehouse INNER JOIN city ON city_id = city.id WHERE warehouse.name = ?")
                .get(name)
        );
        house.inventory = getInventoryForWarehouse(house.id);
        return house;
    });
}

function getWarehouses(offset = 0, count = 50) {
    const rows = db
        .prepare("SELECT warehouse.id AS id, warehouse.name AS name, city.name AS cityName FROM warehouse INNER JOIN city ON city_id = city.id LIMIT ?, ?")
        .all(offset, count);
    const houses = rows.map(row => new Warehouse(row));
    houses.forEach(house => house.inventory = getInventoryForWarehouse(house.id));
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

function getInventoryForSKU(sku) {
    return db
        .prepare("SELECT id, name, quantity FROM inventory " +
                "INNER JOIN warehouse ON warehouse_id = warehouse.id " +
                "WHERE sku = ? ")
        .all(sku);
}

function getInventoryForWarehouse(id) {
    return db
        .prepare("SELECT sku, name, quantity " +
                 "FROM inventory " +
                 "INNER JOIN product USING(sku) " +
                 "WHERE warehouse_id = ? ")
        .all(id);
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
        console.log(getInventoryForWarehouse(warehouse_id).filter(record => record.sku == sku));
        let currInventory = getInventoryForWarehouse(warehouse_id).filter(record => record.sku == sku)[0].quantity;
        console.log(currInventory);
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