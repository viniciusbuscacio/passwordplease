'use strict';

class IStorageProvider {
  init(dbPath) { throw new Error('Not implemented'); }
  close() { throw new Error('Not implemented'); }
  async createTables(metadata) { throw new Error('Not implemented'); }
  async getMetadata() { throw new Error('Not implemented'); }
  async updateMetadata(metadata) { throw new Error('Not implemented'); }
  async insertSecret(record) { throw new Error('Not implemented'); }
  async getSecretById(id) { throw new Error('Not implemented'); }
  async getAllSecrets() { throw new Error('Not implemented'); }
  async updateSecret(id, record) { throw new Error('Not implemented'); }
  async deleteSecret(id) { throw new Error('Not implemented'); }
  async insertCategory(record) { throw new Error('Not implemented'); }
  async getAllCategories() { throw new Error('Not implemented'); }
  async updateCategory(id, record) { throw new Error('Not implemented'); }
  async deleteCategory(id) { throw new Error('Not implemented'); }
}

module.exports = IStorageProvider;
