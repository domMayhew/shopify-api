const db = require('../database/db');

class Product {
    constructor({sku, name, price, description, inventory}) {
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
}

class Warehouse {
    constructor({id, name, inventory, cityID, cityName}) {
        this.id = id;
        this.name = name;
        this.inventory = inventory;
        this.cityID = cityID;
        this.cityName = cityName;
    }

    getTotalInventory() {
        return this.inventory.reduce(inventoryReducer, 0);
    }
}

class Transaction {
    constructor({id, sku, productName, warehouseID, warehouseName, quantity}) {
        this.id = id;
        this.sku = sku;
        this.productName = productName;
        this.warehouseID = warehouseID;
        this.warehouseName = warehouseName;
        this.quantity = quantity;
    }
}

function inventoryReducer(sum, {quantity}) { return sum + quantity}

/**
 * *****************************************************************
 */

function getProductsByName(...names) {
    // Map every name to a Product object.
    return names.map((name) => {
        const product = db
            .prepare("SELECT sku, name, price, description FROM product WHERE name = ?")
            .get(name);
        product.inventory = getInventoryForSKU(product.sku);
        return product;
    });
}

function getProductsBySKU(...skus) {
    return skus.map((sku) => {
        const product = db
            .prepare("SELECT sku, name, price, description FROM product WHERE sku = ?")
            .get(sku);
        product.inventory = getInventoryForSKU(sku);
    })
}

function getProducts(offset, count = 50) {
    const products = db
        .prepare("SELECT sku, name, price, descpription " +
                 "FROM product " +
                 "LIMIT ? OFFSET ? ")
        .get(count, offset);
    products.forEach(product => product.inventory = getInventoryForSKU(product.sku));
    return products;
}

function getInventoryForSKU(sku) {
    return db
        .prepare("SELECT id, name, quantity FROM inventory " +
                "INNER JOIN warehouse ON warehouse_id = warehouse.id " +
                "WHERE sku = ? ")
        .get(sku);
}

function getInventoryForWarehouse(id) {
    return db
        .prepare("SELECT sku, name, quantity FROM inventory " +
                 "INNER JOIN products USING(sku) " +
                 "WHERE warehouse_id = ? ")
        .get(id);
}

function getInventoryChanges(sku, offset, count = 50) {
    const statement = db
        .prepare("SELECT inventory_change.id AS id, sku, products.name, warehouse.name, quantity " +
                 "FROM inventory_change " +
                 "INNER JOIN product USING(sku) " +
                 "INNER JOIN warehouse ON warehouse_id = warehouse.id " +
                 "LIMIT ? OFFSET ? " +
                 sku ? "WHERE sku = ?" : "");
    if (sku) {
        return statement.get(count, offset, sku);
    } else {
        return statement.get(count, offset);
    }
}