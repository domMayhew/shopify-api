/*
 * Create and initialize a small amount of business data for testing purposes.
*/

-----------------------------------
---------- Create tables ----------
-----------------------------------

CREATE TABLE city (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
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

-- -- Ensures that no transaction results in a negative quantity of products in a warehouse.
-- CREATE TRIGGER validate_transaction_quantity
--     BEFORE INSERT ON inventory_change
-- BEGIN
--     SELECT
--         CASE
--             WHEN NEW.quantity * (-1) >
--                     (SELECT quantity FROM inventory
--                         WHERE inventory.warehouse_id = NEW.warehouse_id AND
--                             inventory.sku = NEW.sku)
--                 THEN RAISE (ABORT, 'Not enough stock.')
--         END;
-- END;

-- -- Adjusts the stock levels at the specified warehouse after a transaction has been submitted.
-- CREATE TRIGGER update_inventory_after_transaction
--     AFTER INSERT ON inventory_change
-- BEGIN
--     REPLACE INTO inventory (sku, warehouse_id, quantity)
--     SELECT NEW.sku, NEW.warehouse_id, quantity + NEW.quantity
--     FROM inventory
--     WHERE inventory.sku = NEW.sku AND
--         inventory.warehouse_id = NEW.warehouse_id;
-- END;

-----------------------------------
---------- Initialize data ----------
-----------------------------------

-- 5 example cities.
INSERT INTO city (name)
    VALUES
        ("Calgary"),
        ("Nelson"),
        ("Vancouver"),
        ("Santiago de Chile"),
        ("Kolkata");

-- 7 example warehouses in 5 cities
INSERT INTO warehouse (city_id, name)
    VALUES
        (1, "Calgary - Downtown"),
        (1, "Calgary - South"),
        (2, "Nelson - Main"),
        (3, "Vacouver Burnaby"),
        (3, "Vancouver - Pitt Meadows"),
        (4, "Santiago - West side"),
        (5, "Kolkata - Main");

-- 6 example products. Prices in dollars
INSERT INTO product (name, description, price)
    VALUES
       ("Sunshine sweater", "Student made sweater with a sunshine symbol on the front. Available in a variety of colours.", 40),
       ("Koi fish sweater", "Student made sweater with a sunshine symbol on the front. Available in a variety of colours.", 40),
       ("Treat people with kindness sweater", "Student made sweater with a sunshine symbol on the front. Available in a variety of colours.", 40),
       ("Trafalgar Pride sweater", "Student made sweater with a sunshine symbol on the front. Available in a variety of colours.", 40),
       ("Ski goggles water bottle", "Student designed logo printed on a metal water bottle.", 20),
       ("Makerspace sticker", "Student designed logo for the Trafalgar makerspace program printed on a vinyl sticker.", 5);

-- Each warehouse has a random quantity of each product.
INSERT INTO inventory (sku, warehouse_id, quantity)
    SELECT sku, id, 100 * sku + id FROM product CROSS JOIN warehouse;