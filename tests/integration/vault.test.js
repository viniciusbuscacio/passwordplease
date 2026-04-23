'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const VaultController = require('../../src/controller/VaultController');
const NodeCryptoProvider = require('../../src/infrastructure/NodeCryptoProvider');
const SqliteStorageProvider = require('../../src/infrastructure/SqliteStorageProvider');
describe('Integration: full vault lifecycle', () => {
  const dbPath = path.join(os.tmpdir(), `pp-test-${Date.now()}.db`);
  const mp = 'test-master-password-123!';
  let ctrl;
  before(() => { ctrl = new VaultController(new NodeCryptoProvider(), new SqliteStorageProvider()); });
  after(async () => { try { await ctrl.lock(); } catch {} try { fs.unlinkSync(dbPath); } catch {} });
  it('should create a new vault', async () => { await ctrl.create(dbPath, mp); assert.ok(ctrl.isUnlocked()); assert.ok(fs.existsSync(dbPath)); });
  it('should set a secret', async () => { await ctrl.set({ title: 'Azure SP', username: '9595bd7c', password: 'secret-xyz', url: 'https://portal.azure.com', notes: 'ViniAgent SP' }); });
  it('should set another secret', async () => { await ctrl.set({ title: 'Hostinger API', username: 'api', password: 'hst_abc123' }); });
  it('should list secrets', async () => { const l = await ctrl.list(); assert.equal(l.length, 2); assert.ok(l.some(s => s.title === 'Azure SP')); });
  it('should get a secret by title', async () => { const s = await ctrl.get('Azure SP'); assert.equal(s.password, 'secret-xyz'); assert.equal(s.url, 'https://portal.azure.com'); });
  it('should get a specific field', async () => { assert.equal(await ctrl.get('Azure SP', 'password'), 'secret-xyz'); });
  it('should delete a secret', async () => { const s = await ctrl.get('Hostinger API'); await ctrl.delete(s.id); assert.equal((await ctrl.list()).length, 1); });
  it('should lock and re-unlock', async () => { await ctrl.lock(); assert.ok(!ctrl.isUnlocked()); await ctrl.unlock(dbPath, mp); assert.equal((await ctrl.get('Azure SP')).password, 'secret-xyz'); });
  it('should reject wrong password', async () => { await ctrl.lock(); await assert.rejects(() => ctrl.unlock(dbPath, 'wrong'), { name: 'InvalidPasswordError' }); });

  // PP20: ChangeMasterPassword
  it('should change master password', async () => {
    await ctrl.unlock(dbPath, mp);
    const newMp = 'new-master-password-456!';
    await ctrl.changeMasterPassword(mp, newMp);
    // Lock and re-unlock with new password
    await ctrl.lock();
    await ctrl.unlock(dbPath, newMp);
    assert.ok(ctrl.isUnlocked());
    // Old secret still accessible
    assert.equal((await ctrl.get('Azure SP')).password, 'secret-xyz');
    // Old password should fail
    await ctrl.lock();
    await assert.rejects(() => ctrl.unlock(dbPath, mp), { name: 'InvalidPasswordError' });
    // Re-unlock with new password for next tests
    await ctrl.unlock(dbPath, newMp);
  });

  // PP20: ExportVault
  it('should export vault', async () => {
    const exp = await ctrl.export();
    assert.equal(exp.version, '2.0');
    assert.ok(exp.exportedAt);
    assert.ok(Array.isArray(exp.secrets));
    assert.ok(Array.isArray(exp.categories));
    assert.equal(exp.secrets.length, 1); // Azure SP
    assert.equal(exp.secrets[0].title, 'Azure SP');
    assert.equal(exp.secrets[0].password, 'secret-xyz');
    assert.ok(exp.categories.length >= 3); // Email, Work, Personal
  });

  // PP21: ManageCategories
  it('should list categories', async () => {
    const cats = await ctrl.listCategories();
    assert.ok(cats.length >= 3);
    const names = cats.map(c => c.name);
    assert.ok(names.includes('Email'));
    assert.ok(names.includes('Work'));
    assert.ok(names.includes('Personal'));
  });

  it('should add a category', async () => {
    const cat = await ctrl.addCategory('Social');
    assert.ok(cat.id);
    assert.equal(cat.name, 'Social');
    const cats = await ctrl.listCategories();
    assert.ok(cats.some(c => c.name === 'Social'));
  });

  it('should delete a category', async () => {
    const cats = await ctrl.listCategories();
    const social = cats.find(c => c.name === 'Social');
    await ctrl.deleteCategory(social.id);
    const updated = await ctrl.listCategories();
    assert.ok(!updated.some(c => c.name === 'Social'));
  });
});
