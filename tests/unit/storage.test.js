'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const SqliteStorageProvider = require('../../src/infrastructure/SqliteStorageProvider');

describe('SqliteStorageProvider', () => {
  const dbPath = path.join(os.tmpdir(), `pp-storage-test-${Date.now()}.db`);
  let storage;

  before(async () => { storage = new SqliteStorageProvider(); await storage.init(dbPath); });
  after(async () => { try { await storage.close(); } catch {} try { fs.unlinkSync(dbPath); } catch {} });

  it('should initialize and create db file', () => {
    assert.ok(fs.existsSync(dbPath));
  });

  it('should store and retrieve metadata', async () => {
    const meta = {
      mountKeyCiphered: 'abc:def:ghi',
      masterPasswordHash: '$2b$12$fakehash',
      salt: 'aabbccdd11223344',
      version: '2.0'
    };
    await storage.createTables(meta);
    const got = await storage.getMetadata();
    assert.equal(got.mountKeyCiphered, meta.mountKeyCiphered);
    assert.equal(got.masterPasswordHash, meta.masterPasswordHash);
    assert.equal(got.salt, meta.salt);
    assert.equal(got.version, '2.0');
  });

  it('should insert and retrieve a secret', async () => {
    const secret = { id: 'sec-1', title: 'enc-title', username: 'enc-user', password: 'enc-pass', url: 'enc-url', notes: 'enc-notes', categoryId: null };
    await storage.insertSecret(secret);
    const got = await storage.getSecretById('sec-1');
    assert.equal(got.id, 'sec-1');
    assert.equal(got.title, 'enc-title');
    assert.equal(got.password, 'enc-pass');
  });

  it('should list all secrets', async () => {
    await storage.insertSecret({ id: 'sec-2', title: 'enc-title-2', username: null, password: 'enc-pass-2', url: null, notes: null, categoryId: null });
    const all = await storage.getAllSecrets();
    assert.equal(all.length, 2);
  });

  it('should update a secret', async () => {
    await storage.updateSecret('sec-1', { title: 'updated-title', username: 'enc-user', password: 'new-pass', url: 'enc-url', notes: 'enc-notes', categoryId: null });
    const got = await storage.getSecretById('sec-1');
    assert.equal(got.title, 'updated-title');
    assert.equal(got.password, 'new-pass');
  });

  it('should delete a secret', async () => {
    await storage.deleteSecret('sec-2');
    const all = await storage.getAllSecrets();
    assert.equal(all.length, 1);
  });

  it('should insert and list categories', async () => {
    await storage.insertCategory({ id: 'cat-1', name: 'enc-cat-1' });
    await storage.insertCategory({ id: 'cat-2', name: 'enc-cat-2' });
    const cats = await storage.getAllCategories();
    assert.equal(cats.length, 2);
  });

  it('should update a category', async () => {
    await storage.updateCategory('cat-1', { name: 'updated-cat' });
    const cats = await storage.getAllCategories();
    assert.ok(cats.some(c => c.name === 'updated-cat'));
  });

  it('should delete a category', async () => {
    await storage.deleteCategory('cat-2');
    const cats = await storage.getAllCategories();
    assert.equal(cats.length, 1);
  });

  it('should persist after close and reopen', async () => {
    await storage.close();
    const s2 = new SqliteStorageProvider();
    await s2.init(dbPath);
    const all = await s2.getAllSecrets();
    assert.equal(all.length, 1);
    await s2.close();
    // Re-init for cleanup
    await storage.init(dbPath);
  });
});
