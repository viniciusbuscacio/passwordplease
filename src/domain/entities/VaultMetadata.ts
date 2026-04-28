'use strict';

export interface VaultMetadataData {
  mountKeyCiphered: string;
  masterPasswordHash: string;
  salt: string;
  createdAt?: string;
  version?: string;
}

export class VaultMetadata {
  mountKeyCiphered: string;
  masterPasswordHash: string;
  salt: string;
  createdAt: string;
  version: string;

  constructor({ mountKeyCiphered, masterPasswordHash, salt, createdAt, version }: VaultMetadataData) {
    if (!mountKeyCiphered) throw new Error('mountKeyCiphered is required');
    if (!masterPasswordHash) throw new Error('masterPasswordHash is required');
    if (!salt) throw new Error('salt is required');
    this.mountKeyCiphered = mountKeyCiphered;
    this.masterPasswordHash = masterPasswordHash;
    this.salt = salt;
    this.createdAt = createdAt || new Date().toISOString();
    this.version = version || '2.0';
  }
}
