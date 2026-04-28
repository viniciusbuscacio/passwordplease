'use strict';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { VaultController } from '../../src/controller/VaultController';
import { NodeCryptoProvider } from '../../src/infrastructure/NodeCryptoProvider';
import { SqliteStorageProvider } from '../../src/infrastructure/SqliteStorageProvider';
import { Secret } from '../../src/domain/entities/Secret';

describe('Integration: full vault lifecycle', () => {
  const dbPath = path.join(os.tmpdir(), `pp-test-${Date.now()}.db`);
  const mp = 'test-master-password-123!';
  let ctrl: VaultController;

  before(() => {
    ctrl = new VaultController(new NodeCryptoProvider(), new SqliteStorageProvider());
  });
  after(async () => {
    try { await ctrl.lock(); } catch {}
    try { fs.unlinkSync(dbPath); } catch {}
  });

  it('should create a new vault', async () => {
    await ctrl.create(dbPath, mp);
    assert.ok(ctrl.isUnlocked());
    assert.ok(fs.existsSync(dbPath));
  });

  it('should set a secret', async () => {
    await ctrl.set({ title: 'Azure SP', username: '9595bd7c', password: 'secret-xyz', url: 'https://portal.azure.com', notes: 'ViniAgent SP' });
  });

  it('should set another secret', async () => {
    await ctrl.set({ title: 'Hostinger API', username: 'api', password: 'hst_abc123' });
  });

  it('should list secrets', async () => {
    const l = await ctrl.list();
    assert.equal(l.length, 2);
    assert.ok(l.some(s => s.title === 'Azure SP'));
  });

  it('should get a secret by title', async () => {
    const s = await ctrl.get('Azure SP') as Secret;
    assert.equal(s.password, 'secret-xyz');
    assert.equal(s.url, 'https://portal.azure.com');
  });

  it('should get a specific field', async () => {
    assert.equal(await ctrl.get('Azure SP', 'password'), 'secret-xyz');
  });

  it('should delete a secret', async () => {
    const s = await ctrl.get('Hostinger API') as Secret;
    await ctrl.delete(s.id!);
    assert.equal((await ctrl.list()).length, 1);
  });

  it('should lock and re-unlock', async () => {
    await ctrl.lock();
    assert.ok(!ctrl.isUnlocked());
    await ctrl.unlock(dbPath, mp);
    assert.equal(((await ctrl.get('Azure SP')) as Secret).password, 'secret-xyz');
  });

  it('should reject wrong password', async () => {
    await ctrl.lock();
    await assert.rejects(() => ctrl.unlock(dbPath, 'wrong'), { name: 'InvalidPasswordError' });
  });

  // ChangeMasterPassword
  it('should change master password', async () => {
    await ctrl.unlock(dbPath, mp);
    const newMp = 'new-master-password-456!';
    await ctrl.changeMasterPassword(mp, newMp);
    await ctrl.lock();
    await ctrl.unlock(dbPath, newMp);
    assert.ok(ctrl.isUnlocked());
    assert.equal(((await ctrl.get('Azure SP')) as Secret).password, 'secret-xyz');
    await ctrl.lock();
    await assert.rejects(() => ctrl.unlock(dbPath, mp), { name: 'InvalidPasswordError' });
    await ctrl.unlock(dbPath, newMp);
  });

  // ExportVault
  it('should export vault', async () => {
    const exp = await ctrl.export();
    assert.equal(exp.version, '2.0');
    assert.ok(exp.exportedAt);
    assert.ok(Array.isArray(exp.secrets));
    assert.ok(Array.isArray(exp.categories));
    assert.equal(exp.secrets.length, 1);
    assert.equal(exp.secrets[0].title, 'Azure SP');
    assert.equal(exp.secrets[0].password, 'secret-xyz');
    assert.ok(exp.categories.length >= 3);
  });

  // ManageCategories
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
    const social = cats.find(c => c.name === 'Social')!;
    await ctrl.deleteCategory(social.id!);
    const updated = await ctrl.listCategories();
    assert.ok(!updated.some(c => c.name === 'Social'));
  });
});
