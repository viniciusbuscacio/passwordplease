'use strict';
const { VaultLockedError } = require('../domain/errors');
class DeleteSecret {
  constructor(cp, sp) { this.crypto = cp; this.storage = sp; }
  async execute(id, mountKey) { if (!mountKey) throw new VaultLockedError(); await this.storage.deleteSecret(id); }
}
module.exports = DeleteSecret;
