'use strict';

class VaultMetadata {
  constructor({ mountKeyCiphered, masterPasswordHash, salt, createdAt, version }) {
    if (!mountKeyCiphered) throw new Error('mountKeyCiphered is required');
    if (!masterPasswordHash) throw new Error('masterPasswordHash is required');
    if (!salt) throw new Error('salt is required');
    this.mountKeyCiphered = mountKeyCiphered;
    this.masterPasswordHash = masterPasswordHash;
    this.salt = salt;
    this.createdAt = createdAt || new Date().toISOString();
    this.version = version || '2.0';
  }
}

module.exports = VaultMetadata;
