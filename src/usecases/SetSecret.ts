'use strict';

import { v4 as uuidv4 } from 'uuid';
import { VaultLockedError } from '../domain/errors';
import { ICryptoProvider } from '../domain/interfaces/ICryptoProvider';
import { IStorageProvider } from '../domain/interfaces/IStorageProvider';

export interface SetSecretData {
  title: string;
  username?: string | null;
  password?: string | null;
  url?: string | null;
  notes?: string | null;
  categoryId?: string | null;
}

export class SetSecret {
  constructor(private crypto: ICryptoProvider, private storage: IStorageProvider) {}

  async execute(data: SetSecretData, mountKey: string | null, existingId?: string): Promise<void> {
    if (!mountKey) throw new VaultLockedError();
    const enc = {
      id: existingId || Buffer.from(uuidv4()).toString('base64'),
      title: this.crypto.encryptData(data.title, mountKey)!,
      username: this.crypto.encryptData(data.username || null, mountKey),
      password: this.crypto.encryptData(data.password || null, mountKey),
      url: this.crypto.encryptData(data.url || null, mountKey),
      notes: this.crypto.encryptData(data.notes || null, mountKey),
      categoryId: data.categoryId || null
    };
    if (existingId) {
      await this.storage.updateSecret(existingId, enc);
    } else {
      await this.storage.insertSecret(enc);
    }
  }
}
