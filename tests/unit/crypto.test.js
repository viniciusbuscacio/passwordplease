'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const NodeCryptoProvider = require('../../src/infrastructure/NodeCryptoProvider');
const crypto = new NodeCryptoProvider();
describe('NodeCryptoProvider', () => {
  describe('generateMountKey', () => {
    it('should generate a 64-char hex string', () => { const k = crypto.generateMountKey(); assert.equal(k.length, 64); assert.match(k, /^[0-9a-f]+$/); });
    it('should generate unique keys', () => { assert.notEqual(crypto.generateMountKey(), crypto.generateMountKey()); });
  });
  describe('generateSalt', () => {
    it('should generate a 32-char hex string', () => { const s = crypto.generateSalt(); assert.equal(s.length, 32); });
  });
  describe('deriveKey', () => {
    it('should derive a 32-byte Buffer', () => { const k = crypto.deriveKey('pw', crypto.generateSalt()); assert.equal(k.length, 32); });
    it('should be deterministic', () => { const s = crypto.generateSalt(); assert.deepEqual(crypto.deriveKey('p', s), crypto.deriveKey('p', s)); });
    it('should differ with different passwords', () => { const s = crypto.generateSalt(); assert.notDeepEqual(crypto.deriveKey('a', s), crypto.deriveKey('b', s)); });
  });
  describe('encryptData / decryptData', () => {
    it('should round-trip', () => { const k = crypto.generateMountKey(); assert.equal(crypto.decryptData(crypto.encryptData('hello', k), k), 'hello'); });
    it('should handle null', () => { const k = crypto.generateMountKey(); assert.equal(crypto.encryptData(null, k), null); assert.equal(crypto.decryptData(null, k), null); });
    it('should produce different ciphertexts (random IV)', () => { const k = crypto.generateMountKey(); assert.notEqual(crypto.encryptData('x', k), crypto.encryptData('x', k)); });
    it('should detect tampering', () => { const k = crypto.generateMountKey(); const e = crypto.encryptData('data', k); const p = e.split(':'); p[2] = 'ff' + p[2].slice(2); assert.throws(() => crypto.decryptData(p.join(':'), k)); });
    it('should fail with wrong key', () => { const k1 = crypto.generateMountKey(); const k2 = crypto.generateMountKey(); assert.throws(() => crypto.decryptData(crypto.encryptData('s', k1), k2)); });
  });
  describe('encryptMountKey / decryptMountKey', () => {
    it('should round-trip', () => { const mk = crypto.generateMountKey(); const dk = crypto.deriveKey('pw', crypto.generateSalt()); assert.equal(crypto.decryptMountKey(crypto.encryptMountKey(mk, dk), dk), mk); });
  });
  describe('hashPassword / verifyPassword', () => {
    it('should hash and verify', async () => { const h = await crypto.hashPassword('pw'); assert.equal(await crypto.verifyPassword('pw', h), true); });
    it('should reject wrong password', async () => { const h = await crypto.hashPassword('a'); assert.equal(await crypto.verifyPassword('b', h), false); });
  });
});
