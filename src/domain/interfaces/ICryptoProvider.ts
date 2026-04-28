'use strict';

export interface ICryptoProvider {
  generateMountKey(): string;
  generateSalt(): string;
  deriveKey(password: string, salt: string): Buffer;
  encryptData(plaintext: string | null, mountKey: string): string | null;
  decryptData(ciphertext: string | null, mountKey: string): string | null;
  encryptMountKey(mountKey: string, derivedKey: Buffer): string;
  decryptMountKey(ciphertext: string, derivedKey: Buffer): string;
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
}
