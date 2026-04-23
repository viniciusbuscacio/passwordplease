'use strict';
const CreateVault = require('../usecases/CreateVault');
const UnlockVault = require('../usecases/UnlockVault');
const GetSecret = require('../usecases/GetSecret');
const SetSecret = require('../usecases/SetSecret');
const ListSecrets = require('../usecases/ListSecrets');
const DeleteSecret = require('../usecases/DeleteSecret');
const ChangeMasterPassword = require('../usecases/ChangeMasterPassword');
const ExportVault = require('../usecases/ExportVault');
const ManageCategories = require('../usecases/ManageCategories');

class VaultController {
  constructor(cp, sp) {
    this.crypto = cp; this.storage = sp; this.mountKey = null;
    this._createVault = new CreateVault(cp, sp);
    this._unlockVault = new UnlockVault(cp, sp);
    this._getSecret = new GetSecret(cp, sp);
    this._setSecret = new SetSecret(cp, sp);
    this._listSecrets = new ListSecrets(cp, sp);
    this._deleteSecret = new DeleteSecret(cp, sp);
    this._changeMasterPassword = new ChangeMasterPassword(cp, sp);
    this._exportVault = new ExportVault(cp, sp);
    this._manageCategories = new ManageCategories(cp, sp);
  }

  isUnlocked() { return this.mountKey !== null; }

  async create(dbPath, mp) { await this.storage.init(dbPath); this.mountKey = await this._createVault.execute(mp); }
  async unlock(dbPath, mp) { await this.storage.init(dbPath); this.mountKey = await this._unlockVault.execute(mp); }
  async lock() { this.mountKey = null; await this.storage.close(); }

  // Secrets
  async get(title, field) { const s = await this._getSecret.execute(title, this.mountKey); return field ? (s[field] || null) : s; }
  async set(data, existingId) { await this._setSecret.execute(data, this.mountKey, existingId); }
  async list() { return this._listSecrets.execute(this.mountKey); }
  async delete(id) { await this._deleteSecret.execute(id, this.mountKey); }

  // Master password
  async changeMasterPassword(currentPassword, newPassword) {
    await this._changeMasterPassword.execute(currentPassword, newPassword, this.mountKey);
  }

  // Export
  async export() { return this._exportVault.execute(this.mountKey); }

  // Categories
  async listCategories() { return this._manageCategories.list(this.mountKey); }
  async addCategory(name) { return this._manageCategories.add(name, this.mountKey); }
  async updateCategory(id, newName) { return this._manageCategories.update(id, newName, this.mountKey); }
  async deleteCategory(id) { return this._manageCategories.delete(id, this.mountKey); }
}

module.exports = VaultController;
