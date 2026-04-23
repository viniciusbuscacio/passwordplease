'use strict';

const Database = require('better-sqlite3');
const IStorageProvider = require('../domain/interfaces/IStorageProvider');

class SqliteStorageProvider extends IStorageProvider {
  constructor() { super(); this.db = null; }

  async init(dbPath) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  async close() {
    if (this.db) { this.db.close(); this.db = null; }
  }

  async createTables(metadata) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vault_metadata (
        id INTEGER PRIMARY KEY DEFAULT 1,
        mount_key_ciphered TEXT NOT NULL,
        master_password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        version TEXT DEFAULT '2.0'
      );
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS secrets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        username TEXT,
        password TEXT,
        url TEXT,
        notes TEXT,
        category_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
      );
    `);
    this.db.prepare(
      'INSERT INTO vault_metadata (mount_key_ciphered, master_password_hash, salt, version) VALUES (?, ?, ?, ?)'
    ).run(metadata.mountKeyCiphered, metadata.masterPasswordHash, metadata.salt, metadata.version || '2.0');
  }

  async getMetadata() {
    const row = this.db.prepare('SELECT * FROM vault_metadata WHERE id = 1').get();
    return row ? {
      mountKeyCiphered: row.mount_key_ciphered,
      masterPasswordHash: row.master_password_hash,
      salt: row.salt,
      createdAt: row.created_at,
      version: row.version
    } : null;
  }

  async updateMetadata(m) {
    this.db.prepare(
      'UPDATE vault_metadata SET mount_key_ciphered = ?, master_password_hash = ?, salt = ? WHERE id = 1'
    ).run(m.mountKeyCiphered, m.masterPasswordHash, m.salt);
  }

  async insertSecret(r) {
    this.db.prepare(
      'INSERT INTO secrets (id, title, username, password, url, notes, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(r.id, r.title, r.username, r.password, r.url, r.notes, r.categoryId);
  }

  async getSecretById(id) {
    return this.db.prepare('SELECT * FROM secrets WHERE id = ?').get(id) || null;
  }

  async getAllSecrets() {
    return this.db.prepare('SELECT * FROM secrets').all();
  }

  async updateSecret(id, r) {
    this.db.prepare(
      "UPDATE secrets SET title = ?, username = ?, password = ?, url = ?, notes = ?, category_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(r.title, r.username, r.password, r.url, r.notes, r.categoryId, id);
  }

  async deleteSecret(id) {
    this.db.prepare('DELETE FROM secrets WHERE id = ?').run(id);
  }

  async insertCategory(r) {
    this.db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)').run(r.id, r.name);
  }

  async getAllCategories() {
    return this.db.prepare('SELECT * FROM categories').all();
  }

  async updateCategory(id, r) {
    this.db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(r.name, id);
  }

  async deleteCategory(id) {
    this.db.prepare('UPDATE secrets SET category_id = NULL WHERE category_id = ?').run(id);
    this.db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  }
}

module.exports = SqliteStorageProvider;
