'use strict';

export interface CategoryData {
  id?: string;
  name: string;
}

export class Category {
  id: string | undefined;
  name: string;

  constructor({ id, name }: CategoryData) {
    if (!name) throw new Error('Category name is required');
    this.id = id;
    this.name = name;
  }
}
