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

describe('Edge cases & error handling', () => {
  const dbPath = path.join(os.tmpdir(), `pp-edge-test-${Date.now()}.db`);
  const mp = 'edge-case-password!';
  let ctrl: VaultController;

  before(async () => {
    ctrl = new VaultController(new NodeCryptoProvider(), new SqliteStorageProvider());
    await ctrl.create(dbPath, mp);
    await ctrl.set({ title: 'Test Secret', username: 'user1', password: 'pass1', url: 'https://example.com', notes: 'note1' });
  });
  after(async () => {
    try { await ctrl.lock(); } catch {}
    try { fs.unlinkSync(dbPath); } catch {}
  });

  // --- VaultLockedError ---
  it('should throw VaultLockedError on get when locked', async () => {
    await ctrl.lock();
    await assert.rejects(() => ctrl.get('Test Secret'), { name: 'VaultLockedError' });
    await ctrl.unlock(dbPath, mp);
  });

  it('should throw VaultLockedError on set when locked', async () => {
    await ctrl.lock();
    await assert.rejects(() => ctrl.set({ title: 'X', password: 'Y' }), { name: 'VaultLockedError' });
    await ctrl.unlock(dbPath, mp);
  });

  it('should throw VaultLockedError on list when locked', async () => {
    await ctrl.lock();
    await assert.rejects(() => ctrl.list(), { name: 'VaultLockedError' });
    await ctrl.unlock(dbPath, mp);
  });

  it('should throw VaultLockedError on export when locked', async () => {
    await ctrl.lock();
    await assert.rejects(() => ctrl.export(), { name: 'VaultLockedError' });
    await ctrl.unlock(dbPath, mp);
  });

  it('should throw VaultLockedError on listCategories when locked', async () => {
    await ctrl.lock();
    await assert.rejects(() => ctrl.listCategories(), { name: 'VaultLockedError' });
    await ctrl.unlock(dbPath, mp);
  });

  // --- SecretNotFoundError ---
  it('should throw SecretNotFoundError for nonexistent title', async () => {
    await assert.rejects(() => ctrl.get('DOES NOT EXIST'), { name: 'SecretNotFoundError' });
  });

  // --- Update existing secret via controller ---
  it('should update an existing secret by getting its ID first', async () => {
    const original = await ctrl.get('Test Secret') as Secret;
    await ctrl.set({ title: 'Test Secret', username: 'user1', password: 'UPDATED-pass', url: 'https://new.com', notes: 'new note' }, original.id);
    const s = await ctrl.get('Test Secret') as Secret;
    assert.equal(s.password, 'UPDATED-pass');
    assert.equal(s.url, 'https://new.com');
  });

  // --- Empty fields ---
  it('should handle secret with only title and password', async () => {
    await ctrl.set({ title: 'Minimal', password: 'onlypass' });
    const s = await ctrl.get('Minimal') as Secret;
    assert.equal(s.password, 'onlypass');
    assert.equal(s.username, null);
    assert.equal(s.url, null);
    assert.equal(s.notes, null);
  });

  // --- Special characters in data ---
  it('should handle special characters', async () => {
    const special = 'p@$$w0rd!#%^&*()_+-=[]{}|;:",.<>?/~`£€¥©®™ éàü 日本語 🔐';
    await ctrl.set({ title: 'Special Chars', password: special, notes: 'emoji: 🎉🔒' });
    const s = await ctrl.get('Special Chars') as Secret;
    assert.equal(s.password, special);
    assert.equal(s.notes, 'emoji: 🎉🔒');
  });

  // --- Long data ---
  it('should handle very long password', async () => {
    const longPw = 'A'.repeat(10000);
    await ctrl.set({ title: 'Long PW', password: longPw });
    assert.equal(((await ctrl.get('Long PW')) as Secret).password, longPw);
  });

  // --- ChangeMasterPassword with wrong current password ---
  it('should reject changeMasterPassword with wrong current password', async () => {
    await assert.rejects(
      () => ctrl.changeMasterPassword('WRONG-old-password', 'new-pw'),
      { name: 'InvalidPasswordError' }
    );
  });

  // --- Delete by ID ---
  it('should delete by ID correctly', async () => {
    const beforeList = await ctrl.list();
    const minimal = beforeList.find(s => s.title === 'Minimal')!;
    await ctrl.delete(minimal.id);
    const afterList = await ctrl.list();
    assert.equal(afterList.length, beforeList.length - 1);
    assert.ok(!afterList.some(s => s.title === 'Minimal'));
  });

  // --- Double lock should not throw ---
  it('should not throw on double lock', async () => {
    await ctrl.lock();
    await ctrl.lock();
    assert.ok(!ctrl.isUnlocked());
    await ctrl.unlock(dbPath, mp);
  });

  // --- isUnlocked state ---
  it('should correctly report isUnlocked state', async () => {
    assert.ok(ctrl.isUnlocked());
    await ctrl.lock();
    assert.ok(!ctrl.isUnlocked());
    await ctrl.unlock(dbPath, mp);
    assert.ok(ctrl.isUnlocked());
  });
});
