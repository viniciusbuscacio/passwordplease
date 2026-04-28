'use strict';

import Database from 'better-sqlite3';
import { IStorageProvider, SecretRecord, CategoryRecord, MetadataUpdate } from '../domain/interfaces/IStorageProvider';
import { VaultMetadataData } from '../domain/entities/VaultMetadata';

export class SqliteStorageProvider implements IStorageProvider {
  private db: Database.Database | null = null;

  async init(dbPath: string): Promise<void> {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private getDb(): Database.Database {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  async createTables(metadata: VaultMetadataData): Promise<void> {
    const db = this.getDb();
    db.exec(`
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
    db.prepare(
      'INSERT INTO vault_metadata (mount_key_ciphered, master_password_hash, salt, version) VALUES (?, ?, ?, ?)'
    ).run(metadata.mountKeyCiphered, metadata.masterPasswordHash, metadata.salt, metadata.version || '2.0');
  }

  async getMetadata(): Promise<{ mountKeyCiphered: string; masterPasswordHash: string; salt: string; createdAt: string; version: string } | null> {
    const db = this.getDb();
    const row = db.prepare('SELECT * FROM vault_metadata WHERE id = 1').get() as any;
    return row ? {
      mountKeyCiphered: row.mount_key_ciphered,
      masterPasswordHash: row.master_password_hash,
      salt: row.salt,
      createdAt: row.created_at,
      version: row.version
    } : null;
  }

  async updateMetadata(m: MetadataUpdate): Promise<void> {
    const db = this.getDb();
    db.prepare(
      'UPDATE vault_metadata SET mount_key_ciphered = ?, master_password_hash = ?, salt = ? WHERE id = 1'
    ).run(m.mountKeyCiphered, m.masterPasswordHash, m.salt);
  }

  async insertSecret(r: SecretRecord): Promise<void> {
    const db = this.getDb();
    db.prepare(
      'INSERT INTO secrets (id, title, username, password, url, notes, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(r.id, r.title, r.username, r.password, r.url, r.notes, r.categoryId);
  }

  async getSecretById(id: string): Promise<SecretRecord | null> {
    const db = this.getDb();
    return (db.prepare('SELECT * FROM secrets WHERE id = ?').get(id) as SecretRecord) || null;
  }

  async getAllSecrets(): Promise<SecretRecord[]> {
    const db = this.getDb();
    return db.prepare('SELECT * FROM secrets').all() as SecretRecord[];
  }

  async updateSecret(id: string, r: Partial<SecretRecord>): Promise<void> {
    const db = this.getDb();
    db.prepare(
      "UPDATE secrets SET title = ?, username = ?, password = ?, url = ?, notes = ?, category_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(r.title, r.username, r.password, r.url, r.notes, r.categoryId, id);
  }

  async deleteSecret(id: string): Promise<void> {
    const db = this.getDb();
    db.prepare('DELETE FROM secrets WHERE id = ?').run(id);
  }

  async insertCategory(r: CategoryRecord): Promise<void> {
    const db = this.getDb();
    db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)').run(r.id, r.name);
  }

  async getAllCategories(): Promise<CategoryRecord[]> {
    const db = this.getDb();
    return db.prepare('SELECT * FROM categories').all() as CategoryRecord[];
  }

  async updateCategory(id: string, r: Partial<CategoryRecord>): Promise<void> {
    const db = this.getDb();
    db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(r.name, id);
  }

  async deleteCategory(id: string): Promise<void> {
    const db = this.getDb();
    db.prepare('UPDATE secrets SET category_id = NULL WHERE category_id = ?').run(id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  }
}
