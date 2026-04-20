'use strict';

class VaultLockedError extends Error {
  constructor() {
    super('Vault is locked. Please unlock first.');
    this.name = 'VaultLockedError';
  }
}

class InvalidPasswordError extends Error {
  constructor() {
    super('Invalid master password.');
    this.name = 'InvalidPasswordError';
  }
}

class SecretNotFoundError extends Error {
  constructor(title) {
    super(`Secret not found: "${title}"`);
    this.name = 'SecretNotFoundError';
  }
}

module.exports = { VaultLockedError, InvalidPasswordError, SecretNotFoundError };
