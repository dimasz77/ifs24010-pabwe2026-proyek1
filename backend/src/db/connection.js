const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

/** Bun tidak mendukung better-sqlite3; di sana dipakai bun:sqlite bawaan dengan antarmuka yang sama. */
function openBun(file) {
  const { Database } = require('bun:sqlite');
  const raw = new Database(file, { strict: true });
  return {
    prepare(sql) {
      const st = raw.prepare(sql);
      return {
        get: (...args) => st.get(...args) ?? undefined,
        all: (...args) => st.all(...args),
        run: (...args) => st.run(...args),
      };
    },
    exec: (sql) => raw.exec(sql),
    pragma: (setting) => raw.exec(`PRAGMA ${setting}`),
    transaction: (fn) => raw.transaction(fn),
    close: () => raw.close(),
  };
}

function openNode(file) {
  const Database = require('better-sqlite3');
  return new Database(file);
}

/** Membuka koneksi SQLite. Gunakan ':memory:' untuk pengujian. */
function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = process.versions.bun ? openBun(file) : openNode(file);
  db.pragma('foreign_keys = ON');
  if (file !== ':memory:') db.pragma('journal_mode = WAL');
  return db;
}

function initSchema(db) {
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

module.exports = { openDatabase, initSchema };