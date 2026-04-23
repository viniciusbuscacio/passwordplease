'use strict';
const { v4: uuidv4 } = require('uuid');
const VaultMetadata = require('../domain/entities/VaultMetadata');
class CreateVault {
  constructor(cp, sp) { this.crypto = cp; this.storage = sp; }
  async execute(masterPassword) {
    const mountKey = this.crypto.generateMountKey();
    const salt = this.crypto.generateSalt();
    const masterPasswordHash = await this.crypto.hashPassword(masterPassword);
    const derivedKey = this.crypto.deriveKey(masterPassword, salt);
    const mountKeyCiphered = this.crypto.encryptMountKey(mountKey, derivedKey);
    const metadata = new VaultMetadata({ mountKeyCiphered, masterPasswordHash, salt });
    await this.storage.createTables(metadata);
    for (const name of ['Email', 'Work', 'Personal']) {
      const id = Buffer.from(uuidv4()).toString('base64');
      await this.storage.insertCategory({ id, name: this.crypto.encryptData(name, mountKey) });
    }
    return mountKey;
  }
}
module.exports = CreateVault;
