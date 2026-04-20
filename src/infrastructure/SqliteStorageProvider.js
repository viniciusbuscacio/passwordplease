'use strict';

const sqlite3 = require('sqlite3').verbose();
const IStorageProvider = require('../domain/interfaces/IStorageProvider');

class SqliteStorageProvider extends IStorageProvider {
  constructor() { super(); this.db = null; }

  init(dbPath) { return new Promise((resolve, reject) => { this.db = new sqlite3.Database(dbPath, (err) => { if (err) reject(err); else resolve(); }); }); }
  close() { return new Promise((resolve, reject) => { if (!this.db) return resolve(); this.db.close((err) => { if (err) reject(err); else { this.db = null; resolve(); } }); }); }

  async createTables(metadata) {
    const db = this.db;
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('CREATE TABLE IF NOT EXISTS vault_metadata (id INTEGER PRIMARY KEY DEFAULT 1, mount_key_ciphered TEXT NOT NULL, master_password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT DEFAULT (datetime(\'now\')), version TEXT DEFAULT \'2.0\')');
        db.run('CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL)');
        db.run('CREATE TABLE IF NOT EXISTS secrets (id TEXT PRIMARY KEY, title TEXT NOT NULL, username TEXT, password TEXT, url TEXT, notes TEXT, category_id TEXT, created_at TEXT DEFAULT (datetime(\'now\')), updated_at TEXT DEFAULT (datetime(\'now\')), FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL)');
        db.run('INSERT INTO vault_metadata (mount_key_ciphered, master_password_hash, salt, version) VALUES (?, ?, ?, ?)', [metadata.mountKeyCiphered, metadata.masterPasswordHash, metadata.salt, metadata.version || '2.0'], (err) => { if (err) reject(err); else resolve(); });
      });
    });
  }

  async getMetadata() { return new Promise((resolve, reject) => { this.db.get('SELECT * FROM vault_metadata WHERE id = 1', (err, row) => { if (err) reject(err); else resolve(row ? { mountKeyCiphered: row.mount_key_ciphered, masterPasswordHash: row.master_password_hash, salt: row.salt, createdAt: row.created_at, version: row.version } : null); }); }); }
  async updateMetadata(m) { return new Promise((resolve, reject) => { this.db.run('UPDATE vault_metadata SET mount_key_ciphered = ?, master_password_hash = ?, salt = ? WHERE id = 1', [m.mountKeyCiphered, m.masterPasswordHash, m.salt], (err) => { if (err) reject(err); else resolve(); }); }); }
  async insertSecret(r) { return new Promise((resolve, reject) => { this.db.run('INSERT INTO secrets (id, title, username, password, url, notes, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [r.id, r.title, r.username, r.password, r.url, r.notes, r.categoryId], (err) => { if (err) reject(err); else resolve(); }); }); }
  async getSecretById(id) { return new Promise((resolve, reject) => { this.db.get('SELECT * FROM secrets WHERE id = ?', [id], (err, row) => { if (err) reject(err); else resolve(row || null); }); }); }
  async getAllSecrets() { return new Promise((resolve, reject) => { this.db.all('SELECT * FROM secrets', (err, rows) => { if (err) reject(err); else resolve(rows || []); }); }); }
  async updateSecret(id, r) { return new Promise((resolve, reject) => { this.db.run('UPDATE secrets SET title = ?, username = ?, password = ?, url = ?, notes = ?, category_id = ?, updated_at = datetime(\'now\') WHERE id = ?', [r.title, r.username, r.password, r.url, r.notes, r.categoryId, id], (err) => { if (err) reject(err); else resolve(); }); }); }
  async deleteSecret(id) { return new Promise((resolve, reject) => { this.db.run('DELETE FROM secrets WHERE id = ?', [id], (err) => { if (err) reject(err); else resolve(); }); }); }
  async insertCategory(r) { return new Promise((resolve, reject) => { this.db.run('INSERT INTO categories (id, name) VALUES (?, ?)', [r.id, r.name], (err) => { if (err) reject(err); else resolve(); }); }); }
  async getAllCategories() { return new Promise((resolve, reject) => { this.db.all('SELECT * FROM categories', (err, rows) => { if (err) reject(err); else resolve(rows || []); }); }); }
  async updateCategory(id, r) { return new Promise((resolve, reject) => { this.db.run('UPDATE categories SET name = ? WHERE id = ?', [r.name, id], (err) => { if (err) reject(err); else resolve(); }); }); }
  async deleteCategory(id) { return new Promise((resolve, reject) => { this.db.serialize(() => { this.db.run('UPDATE secrets SET category_id = NULL WHERE category_id = ?', [id]); this.db.run('DELETE FROM categories WHERE id = ?', [id], (err) => { if (err) reject(err); else resolve(); }); }); }); }
}

module.exports = SqliteStorageProvider;
