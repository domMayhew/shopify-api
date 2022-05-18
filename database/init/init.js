const fs = require('fs');
const db = new require('better-sqlite3')('../db.sqlite');

let rawdata = fs.readFileSync('./city.list.json');
let cities = JSON.parse(rawdata);

for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    if (!city.id || !city.name || !city.country) {
        console.log(city);
    }
    db.prepare("INSERT OR IGNORE INTO city (id, name, country) " +
               "VALUES (?, ?, ?)")
        .run(city.id, city.name, city.country);
    if (i % 10000 == 9999) {
        console.log(i + " complete...");
    }
};