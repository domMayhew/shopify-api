/*
 * Create and initialize a small amount of business data for testing purposes.
*/

-----------------------------------
---------- Create tables ----------
-----------------------------------

CREATE TABLE city (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT
);

-- Each warehouse associated with exactly one city.
CREATE TABLE warehouse (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    city_id INTEGER NOT NULL,
    FOREIGN KEY (city_id) REFERENCES city (id)
        ON DELETE CASCADE ON UPDATE NO ACTION
);

-- Default price is 0: clients must take care to set the price appropriately.
CREATE TABLE product (
    sku INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    price REAL DEFAULT 0,
    CHECK (price >= 0)
);

-- A quantity of one product in one warehouse.
CREATE TABLE inventory (
    sku INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 0,
    PRIMARY KEY (sku, warehouse_id),
    FOREIGN KEY (sku) REFERENCES product (sku)
        ON DELETE CASCADE ON UPDATE NO ACTION,
    FOREIGN KEY (warehouse_id) REFERENCES warehouse (id)
        ON DELETE CASCADE ON UPDATE NO ACTION,
    CHECK (quantity >= 0)
);

-- Records purchase or sale transactions.
-- Quantity is the number of products added to the specified warehouse
-- Positive quantities add stock to the warehouse,
-- negative quantities remove stock from the warehouse.
CREATE TABLE inventory_change (
    id INTEGER PRIMARY KEY,
    sku INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (sku) REFERENCES product (sku)
        ON DELETE CASCADE ON UPDATE NO ACTION,
    FOREIGN KEY (warehouse_id) REFERENCES warehouse (id)
        ON DELETE CASCADE ON UPDATE NO ACTION
);

