/**
 * This module initializes (or reinitializes) the db to it's default starting values.
 * Be aware that this can take some time because it writes all 200,000 cities into the DB.
 */

const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'db.sqlite');
const Sqlite3 = require('better-sqlite3');

// Delete existing db file.
fsPromises.rm(dbPath, {force: true});

// Create new db file.
const db = new Sqlite3(dbPath);

// Create tables.
db.exec(fs.readFileSync(path.join(__dirname, 'init-tables.sql'), 'utf-8'));

// Read city data from JSON.
let rawdata = fs.readFileSync(path.join(__dirname, 'city.list.json'), 'utf-8');
let cities = JSON.parse(rawdata);

// Add cities to DB.
for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    db.prepare("INSERT OR IGNORE INTO city (id, name, country) " +
                "VALUES (?, ?, ?)")
        .run(city.id, city.name, city.country);
    if (i % 10000 == 9999) {
        console.log(i + " complete...");
    }
};

// Initialize sample data.
db.exec(fs.readFileSync(path.join(__dirname, 'init-samples.sql'), 'utf-8'));
