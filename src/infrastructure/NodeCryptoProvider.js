'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const ICryptoProvider = require('../domain/interfaces/ICryptoProvider');

const SALT_ROUNDS = 12;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

class NodeCryptoProvider extends ICryptoProvider {
  generateMountKey() { return crypto.randomBytes(32).toString('hex'); }
  generateSalt() { return crypto.randomBytes(16).toString('hex'); }
  deriveKey(password, salt) { return crypto.scryptSync(password, Buffer.from(salt, 'hex'), 32, SCRYPT_PARAMS); }

  encryptData(plaintext, keyHex) {
    if (plaintext === null || plaintext === undefined) return null;
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
  }

  decryptData(ciphertext, keyHex) {
    if (ciphertext === null || ciphertext === undefined) return null;
    const key = Buffer.from(keyHex, 'hex');
    const [ivHex, tagHex, encryptedHex] = ciphertext.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  encryptMountKey(mountKeyHex, derivedKey) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
    let encrypted = cipher.update(mountKeyHex, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
  }

  decryptMountKey(ciphertext, derivedKey) {
    const [ivHex, tagHex, encryptedHex] = ciphertext.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async hashPassword(password) { return bcrypt.hash(password, SALT_ROUNDS); }
  async verifyPassword(password, hash) { return bcrypt.compare(password, hash); }
}

module.exports = NodeCryptoProvider;
