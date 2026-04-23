'use strict';
const { v4: uuidv4 } = require('uuid');
const { VaultLockedError } = require('../domain/errors');
const Category = require('../domain/entities/Category');

class ManageCategories {
  constructor(cp, sp) { this.crypto = cp; this.storage = sp; }

  async list(mountKey) {
    if (!mountKey) throw new VaultLockedError();
    const rows = await this.storage.getAllCategories();
    return rows.map(r => new Category({
      id: r.id,
      name: this.crypto.decryptData(r.name, mountKey)
    }));
  }

  async add(name, mountKey) {
    if (!mountKey) throw new VaultLockedError();
    const id = Buffer.from(uuidv4()).toString('base64');
    const encName = this.crypto.encryptData(name, mountKey);
    await this.storage.insertCategory({ id, name: encName });
    return new Category({ id, name });
  }

  async update(id, newName, mountKey) {
    if (!mountKey) throw new VaultLockedError();
    const encName = this.crypto.encryptData(newName, mountKey);
    await this.storage.updateCategory(id, { name: encName });
  }

  async delete(id, mountKey) {
    if (!mountKey) throw new VaultLockedError();
    await this.storage.deleteCategory(id);
  }
}

module.exports = ManageCategories;
