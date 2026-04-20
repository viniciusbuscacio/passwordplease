'use strict';
const { v4: uuidv4 } = require('uuid');
const { VaultLockedError } = require('../domain/errors');
class SetSecret {
  constructor(cp, sp) { this.crypto = cp; this.storage = sp; }
  async execute(data, mountKey, existingId) {
    if (!mountKey) throw new VaultLockedError();
    const enc = { title: this.crypto.encryptData(data.title, mountKey), username: this.crypto.encryptData(data.username, mountKey), password: this.crypto.encryptData(data.password, mountKey), url: this.crypto.encryptData(data.url, mountKey), notes: this.crypto.encryptData(data.notes, mountKey), categoryId: data.categoryId || null };
    if (existingId) { await this.storage.updateSecret(existingId, enc); } else { enc.id = Buffer.from(uuidv4()).toString('base64'); await this.storage.insertSecret(enc); }
  }
}
module.exports = SetSecret;
