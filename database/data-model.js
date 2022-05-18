/**
 * database/data-model.js
 * This module abstracts the database by mapping the database tables onto logical classes and vice versa.
 * It is the only module that should access the database directly.
 * All others should interface with the database through this module.
 */

const db = new require('better-sqlite3')('db.sqlite');

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

function getProducts(offset, count = 50) {
    const statement = db
        .prepare("SELECT sku, name, price, description " +
                 "FROM product " +
                 (offset && count ? "LIMIT ?, ?" : ""));
    const rows = (offset && count ? statement.all(offset, count) : statement.all());
    const products = rows.map(row => new Product(row));
    products.forEach(product => product.inventory = getInventoryForSKU(product.sku));
    return products;
}

// WAREHOUSES

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

function getWarehouses(offset, count = 50) {
    const statement = db
        .prepare("SELECT warehouse.id AS id, warehouse.name AS name, city.name AS cityName FROM warehouse INNER JOIN city ON city_id = city.id" +
                 (offset && count ? "LIMIT ?. ?" : ""));
    const rows = (offset && count ? statement.all(offset, count) : statement.all());
    const houses = rows.map(row => new Warehouse(row));
    houses.forEach(house => house.inventory = getInventoryForWarehouse(house.id));
    return houses;
}

// INVENTORY CHANGES

function getInventoryChanges(sku, offset, count = 50) {
    const statement = db
        .prepare("SELECT inventory_change.id AS id, sku, products.name, warehouse.name, quantity " +
                 "FROM inventory_change " +
                 "INNER JOIN product USING(sku) " +
                 "INNER JOIN warehouse ON warehouse_id = warehouse.id " +
                 (offset && count ? "LIMIT ?, ? " : "") +
                 (sku ? "WHERE sku = ?" : ""));
    if (sku && offset && count) {
        return statement.all(count, offset, sku);
    } else if (sku) {
        return statement.all(sku);
    } else if (offset && count) {
        return statement.all(offset, count);
    } else {
        return statement.all();
    }
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
        .prepare("SELECT sku, name, quantity FROM inventory " +
                 "INNER JOIN product USING(sku) " +
                 "WHERE warehouse_id = ? ")
        .all(id);
}