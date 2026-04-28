'use strict';

import { v4 as uuidv4 } from 'uuid';
import { VaultMetadata } from '../domain/entities/VaultMetadata';
import { ICryptoProvider } from '../domain/interfaces/ICryptoProvider';
import { IStorageProvider } from '../domain/interfaces/IStorageProvider';

export class CreateVault {
  constructor(private crypto: ICryptoProvider, private storage: IStorageProvider) {}

  async execute(masterPassword: string): Promise<string> {
    const mountKey = this.crypto.generateMountKey();
    const salt = this.crypto.generateSalt();
    const masterPasswordHash = await this.crypto.hashPassword(masterPassword);
    const derivedKey = this.crypto.deriveKey(masterPassword, salt);
    const mountKeyCiphered = this.crypto.encryptMountKey(mountKey, derivedKey);
    const metadata = new VaultMetadata({ mountKeyCiphered, masterPasswordHash, salt });
    await this.storage.createTables(metadata);
    for (const name of ['Email', 'Work', 'Personal']) {
      const id = Buffer.from(uuidv4()).toString('base64');
      await this.storage.insertCategory({ id, name: this.crypto.encryptData(name, mountKey)! });
    }
    return mountKey;
  }
}
