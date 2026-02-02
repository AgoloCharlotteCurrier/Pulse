const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'pulse.db');
let db;

function init() {
  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err);
    } else {
      console.log('Connected to SQLite database');
      createTables();
    }
  });
}

function createTables() {
  // API Keys table
  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY,
      key_name TEXT UNIQUE,
      key_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Search runs table
  db.run(`
    CREATE TABLE IF NOT EXISTS search_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      time_range TEXT NOT NULL,
      raw_results TEXT,
      synthesis TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Raw posts table
  db.run(`
    CREATE TABLE IF NOT EXISTS raw_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_run_id INTEGER,
      source TEXT NOT NULL,
      title TEXT,
      content TEXT,
      author TEXT,
      date TEXT,
      engagement_metrics TEXT,
      url TEXT,
      FOREIGN KEY (search_run_id) REFERENCES search_runs (id)
    )
  `);
}

function getDB() {
  return db;
}

module.exports = {
  init,
  getDB
};