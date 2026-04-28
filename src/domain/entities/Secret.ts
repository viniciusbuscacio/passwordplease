'use strict';

export interface SecretData {
  id?: string;
  title: string;
  username?: string | null;
  password?: string | null;
  url?: string | null;
  notes?: string | null;
  categoryId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export class Secret {
  id: string | undefined;
  title: string;
  username: string | null;
  password: string | null;
  url: string | null;
  notes: string | null;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;

  constructor({ id, title, username, password, url, notes, categoryId, createdAt, updatedAt }: SecretData) {
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
