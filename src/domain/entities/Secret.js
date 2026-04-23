'use strict';

class Secret {
  constructor({ id, title, username, password, url, notes, categoryId, createdAt, updatedAt }) {
    if (!title) throw new Error('Secret title is required');
    this.id = id;
    this.title = title;
    this.username = username || null;
    this.password = password || null;
    this.url = url || null;
    this.notes = notes || null;
    this.categoryId = categoryId || null;
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = Secret;
