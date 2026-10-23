exports.findByEmail = (db, email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email);
exports.findById = (db, id) => db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(id);
exports.insert = (db, { name, email, password_hash }) =>
  Number(db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, password_hash).lastInsertRowid);
exports.count = (db) => db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
