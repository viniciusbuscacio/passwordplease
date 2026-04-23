'use strict';
const VaultController = require('../../controller/VaultController');
const NodeCryptoProvider = require('../../infrastructure/NodeCryptoProvider');
const SqliteStorageProvider = require('../../infrastructure/SqliteStorageProvider');
function createVault() { return new VaultController(new NodeCryptoProvider(), new SqliteStorageProvider()); }
module.exports = { createVault, VaultController, NodeCryptoProvider, SqliteStorageProvider };
