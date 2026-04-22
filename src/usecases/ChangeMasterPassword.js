'use strict';
const { VaultLockedError, InvalidPasswordError } = require('../domain/errors');

class ChangeMasterPassword {
  constructor(cp, sp) { this.crypto = cp; this.storage = sp; }

  async execute(currentPassword, newPassword, mountKey) {
    if (!mountKey) throw new VaultLockedError();

    // Verify current password
    const metadata = await this.storage.getMetadata();
    const isValid = await this.crypto.verifyPassword(currentPassword, metadata.masterPasswordHash);
    if (!isValid) throw new InvalidPasswordError();

    // Generate new salt, hash, derived key
    const newSalt = this.crypto.generateSalt();
    const newHash = await this.crypto.hashPassword(newPassword);
    const newDerivedKey = this.crypto.deriveKey(newPassword, newSalt);

    // Re-encrypt mount key with new derived key (mount key itself doesn't change)
    const newMountKeyCiphered = this.crypto.encryptMountKey(mountKey, newDerivedKey);

    // Update metadata in storage
    await this.storage.updateMetadata({
      mountKeyCiphered: newMountKeyCiphered,
      masterPasswordHash: newHash,
      salt: newSalt
    });
  }
}

module.exports = ChangeMasterPassword;
