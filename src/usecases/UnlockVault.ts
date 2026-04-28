'use strict';

import { InvalidPasswordError } from '../domain/errors';
import { ICryptoProvider } from '../domain/interfaces/ICryptoProvider';
import { IStorageProvider } from '../domain/interfaces/IStorageProvider';

export class UnlockVault {
  constructor(private crypto: ICryptoProvider, private storage: IStorageProvider) {}

  async execute(masterPassword: string): Promise<string> {
    const metadata = await this.storage.getMetadata();
    if (!metadata) throw new Error('Vault metadata not found.');
    const isValid = await this.crypto.verifyPassword(masterPassword, metadata.masterPasswordHash);
    if (!isValid) throw new InvalidPasswordError();
    const derivedKey = this.crypto.deriveKey(masterPassword, metadata.salt);
    return this.crypto.decryptMountKey(metadata.mountKeyCiphered, derivedKey);
  }
}
