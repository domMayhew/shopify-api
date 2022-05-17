/**
 * db.js -> Database configuration file
 */

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database/db.sqlite');

module.exports = db;