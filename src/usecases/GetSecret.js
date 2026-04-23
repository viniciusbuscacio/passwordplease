'use strict';
const { VaultLockedError, SecretNotFoundError } = require('../domain/errors');
const Secret = require('../domain/entities/Secret');
class GetSecret {
  constructor(cp, sp) { this.crypto = cp; this.storage = sp; }
  async execute(title, mountKey) {
    if (!mountKey) throw new VaultLockedError();
    const rows = await this.storage.getAllSecrets();
    for (const row of rows) {
      const dt = this.crypto.decryptData(row.title, mountKey);
      if (dt === title) return new Secret({ id: row.id, title: dt, username: this.crypto.decryptData(row.username, mountKey), password: this.crypto.decryptData(row.password, mountKey), url: this.crypto.decryptData(row.url, mountKey), notes: this.crypto.decryptData(row.notes, mountKey), categoryId: row.category_id, createdAt: row.created_at, updatedAt: row.updated_at });
    }
    throw new SecretNotFoundError(title);
  }
}
module.exports = GetSecret;
