'use strict';
const { InvalidPasswordError } = require('../domain/errors');
class UnlockVault {
  constructor(cp, sp) { this.crypto = cp; this.storage = sp; }
  async execute(masterPassword) {
    const metadata = await this.storage.getMetadata();
    if (!metadata) throw new Error('Vault metadata not found.');
    const isValid = await this.crypto.verifyPassword(masterPassword, metadata.masterPasswordHash);
    if (!isValid) throw new InvalidPasswordError();
    const derivedKey = this.crypto.deriveKey(masterPassword, metadata.salt);
    return this.crypto.decryptMountKey(metadata.mountKeyCiphered, derivedKey);
  }
}
module.exports = UnlockVault;
