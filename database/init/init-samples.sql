-----------------------------------
---------- Initialize data ----------
-----------------------------------

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