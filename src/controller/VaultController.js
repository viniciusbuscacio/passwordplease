'use strict';
const CreateVault = require('../usecases/CreateVault');
const UnlockVault = require('../usecases/UnlockVault');
const GetSecret = require('../usecases/GetSecret');
const SetSecret = require('../usecases/SetSecret');
const ListSecrets = require('../usecases/ListSecrets');
const DeleteSecret = require('../usecases/DeleteSecret');
class VaultController {
  constructor(cp, sp) {
    this.crypto = cp; this.storage = sp; this.mountKey = null;
    this._createVault = new CreateVault(cp, sp); this._unlockVault = new UnlockVault(cp, sp);
    this._getSecret = new GetSecret(cp, sp); this._setSecret = new SetSecret(cp, sp);
    this._listSecrets = new ListSecrets(cp, sp); this._deleteSecret = new DeleteSecret(cp, sp);
  }
  isUnlocked() { return this.mountKey !== null; }
  async create(dbPath, mp) { await this.storage.init(dbPath); this.mountKey = await this._createVault.execute(mp); }
  async unlock(dbPath, mp) { await this.storage.init(dbPath); this.mountKey = await this._unlockVault.execute(mp); }
  async lock() { this.mountKey = null; await this.storage.close(); }
  async get(title, field) { const s = await this._getSecret.execute(title, this.mountKey); return field ? (s[field] || null) : s; }
  async set(data, existingId) { await this._setSecret.execute(data, this.mountKey, existingId); }
  async list() { return this._listSecrets.execute(this.mountKey); }
  async delete(id) { await this._deleteSecret.execute(id, this.mountKey); }
}
module.exports = VaultController;
