'use strict';

import { v4 as uuidv4 } from 'uuid';
import { VaultLockedError } from '../domain/errors';
import { Category } from '../domain/entities/Category';
import { ICryptoProvider } from '../domain/interfaces/ICryptoProvider';
import { IStorageProvider } from '../domain/interfaces/IStorageProvider';

export class ManageCategories {
  constructor(private crypto: ICryptoProvider, private storage: IStorageProvider) {}

  async list(mountKey: string | null): Promise<Category[]> {
    if (!mountKey) throw new VaultLockedError();
    const rows = await this.storage.getAllCategories();
    return rows.map(r => new Category({
      id: r.id,
      name: this.crypto.decryptData(r.name, mountKey)!
    }));
  }

  async add(name: string, mountKey: string | null): Promise<Category> {
    if (!mountKey) throw new VaultLockedError();
    const id = Buffer.from(uuidv4()).toString('base64');
    const encName = this.crypto.encryptData(name, mountKey)!;
    await this.storage.insertCategory({ id, name: encName });
    return new Category({ id, name });
  }

  async update(id: string, newName: string, mountKey: string | null): Promise<void> {
    if (!mountKey) throw new VaultLockedError();
    const encName = this.crypto.encryptData(newName, mountKey)!;
    await this.storage.updateCategory(id, { name: encName });
  }

  async delete(id: string, mountKey: string | null): Promise<void> {
    if (!mountKey) throw new VaultLockedError();
    await this.storage.deleteCategory(id);
  }
}
