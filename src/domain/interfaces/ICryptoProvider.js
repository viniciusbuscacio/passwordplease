'use strict';

class ICryptoProvider {
  generateMountKey() { throw new Error('Not implemented'); }
  generateSalt() { throw new Error('Not implemented'); }
  deriveKey(password, salt) { throw new Error('Not implemented'); }
  encryptData(plaintext, mountKey) { throw new Error('Not implemented'); }
  decryptData(ciphertext, mountKey) { throw new Error('Not implemented'); }
  encryptMountKey(mountKey, derivedKey) { throw new Error('Not implemented'); }
  decryptMountKey(ciphertext, derivedKey) { throw new Error('Not implemented'); }
  async hashPassword(password) { throw new Error('Not implemented'); }
  async verifyPassword(password, hash) { throw new Error('Not implemented'); }
}

module.exports = ICryptoProvider;
