'use strict';

export class VaultLockedError extends Error {
  constructor() {
    super('Vault is locked. Please unlock first.');
    this.name = 'VaultLockedError';
  }
}

export class InvalidPasswordError extends Error {
  constructor() {
    super('Invalid master password.');
    this.name = 'InvalidPasswordError';
  }
}

export class SecretNotFoundError extends Error {
  constructor(title: string) {
    super(`Secret not found: "${title}"`);
    this.name = 'SecretNotFoundError';
  }
}
