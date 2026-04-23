'use strict';

class Category {
  constructor({ id, name }) {
    if (!name) throw new Error('Category name is required');
    this.id = id;
    this.name = name;
  }
}

module.exports = Category;
