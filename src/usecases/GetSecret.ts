'use strict';

import { VaultLockedError, SecretNotFoundError } from '../domain/errors';
import { Secret } from '../domain/entities/Secret';
import { ICryptoProvider } from '../domain/interfaces/ICryptoProvider';
import { IStorageProvider } from '../domain/interfaces/IStorageProvider';

export class GetSecret {
  constructor(private crypto: ICryptoProvider, private storage: IStorageProvider) {}

  async execute(title: string, mountKey: string | null): Promise<Secret> {
    if (!mountKey) throw new VaultLockedError();
    const rows = await this.storage.getAllSecrets();
    for (const row of rows) {
      const dt = this.crypto.decryptData(row.title, mountKey);
      if (dt === title) {
        return new Secret({
          id: row.id,
          title: dt,
          username: this.crypto.decryptData(row.username, mountKey),
          password: this.crypto.decryptData(row.password, mountKey),
          url: this.crypto.decryptData(row.url, mountKey),
          notes: this.crypto.decryptData(row.notes, mountKey),
          categoryId: row.category_id ?? row.categoryId,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      }
    }
    throw new SecretNotFoundError(title);
  }
}
