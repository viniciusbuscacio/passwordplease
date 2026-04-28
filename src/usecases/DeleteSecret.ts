'use strict';

import { VaultLockedError } from '../domain/errors';
import { ICryptoProvider } from '../domain/interfaces/ICryptoProvider';
import { IStorageProvider } from '../domain/interfaces/IStorageProvider';

export class DeleteSecret {
  constructor(private crypto: ICryptoProvider, private storage: IStorageProvider) {}

  async execute(id: string, mountKey: string | null): Promise<void> {
    if (!mountKey) throw new VaultLockedError();
    await this.storage.deleteSecret(id);
  }
}
