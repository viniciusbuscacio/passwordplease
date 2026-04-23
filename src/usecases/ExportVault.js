'use strict';
const { VaultLockedError } = require('../domain/errors');
const Secret = require('../domain/entities/Secret');

class ExportVault {
  constructor(cp, sp) { this.crypto = cp; this.storage = sp; }

  async execute(mountKey) {
    if (!mountKey) throw new VaultLockedError();

    // Decrypt all secrets
    const rows = await this.storage.getAllSecrets();
    const secrets = rows.map(r => new Secret({
      id: r.id,
      title: this.crypto.decryptData(r.title, mountKey),
      username: this.crypto.decryptData(r.username, mountKey),
      password: this.crypto.decryptData(r.password, mountKey),
      url: this.crypto.decryptData(r.url, mountKey),
      notes: this.crypto.decryptData(r.notes, mountKey),
      categoryId: r.category_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    // Decrypt all categories
    const catRows = await this.storage.getAllCategories();
    const categories = catRows.map(c => ({
      id: c.id,
      name: this.crypto.decryptData(c.name, mountKey)
    }));

    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      secrets,
      categories
    };
  }
}

module.exports = ExportVault;
