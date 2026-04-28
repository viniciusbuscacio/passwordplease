'use strict';

import { VaultLockedError } from '../domain/errors';
import { ICryptoProvider } from '../domain/interfaces/ICryptoProvider';
import { IStorageProvider } from '../domain/interfaces/IStorageProvider';

export interface ListedSecret {
  id: string;
  title: string;
  username: string | null;
  categoryId: string | null;
}

export class ListSecrets {
  constructor(private crypto: ICryptoProvider, private storage: IStorageProvider) {}

  async execute(mountKey: string | null): Promise<ListedSecret[]> {
    if (!mountKey) throw new VaultLockedError();
    const rows = await this.storage.getAllSecrets();
    return rows.map(r => ({
      id: r.id,
      title: this.crypto.decryptData(r.title, mountKey)!,
      username: this.crypto.decryptData(r.username, mountKey),
      categoryId: r.category_id ?? r.categoryId ?? null
    }));
  }
}
