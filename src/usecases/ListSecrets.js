'use strict';
const { VaultLockedError } = require('../domain/errors');
class ListSecrets {
  constructor(cp, sp) { this.crypto = cp; this.storage = sp; }
  async execute(mountKey) {
    if (!mountKey) throw new VaultLockedError();
    const rows = await this.storage.getAllSecrets();
    return rows.map(r => ({ id: r.id, title: this.crypto.decryptData(r.title, mountKey), username: this.crypto.decryptData(r.username, mountKey), categoryId: r.category_id }));
  }
}
module.exports = ListSecrets;
