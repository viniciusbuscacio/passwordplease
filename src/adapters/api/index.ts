'use strict';

import { VaultController } from '../../controller/VaultController';
import { NodeCryptoProvider } from '../../infrastructure/NodeCryptoProvider';
import { SqliteStorageProvider } from '../../infrastructure/SqliteStorageProvider';

export function createVault(): VaultController {
  return new VaultController(new NodeCryptoProvider(), new SqliteStorageProvider());
}

export { VaultController, NodeCryptoProvider, SqliteStorageProvider };
