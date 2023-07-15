// dbConfig.js
const global = require('./global.js');
const fs = require('fs');

// Creating an object to encapsulate the functions
const dbManager = {
    setDbPath(newPath) {
        global.dbPath = newPath;
    },

    getDbPath() {
        return global.dbPath;
    },

    closeDbPath() {
        global.dbPath = null;
    },

    updatepasswordPleaseConfigjson() {
        // Read the contents of the config file.
        configFileContents = fs.readFileSync(global.configFilePath, 'utf-8');
        // Parse the contents of the config file.
        let config = JSON.parse(configFileContents);
        // Update the config file with the new database file path.
        config.lastOpenedDatabaseFile = global.dbPath;
        // Write the updated config file to disk.
        fs.writeFileSync(global.configFilePath, JSON.stringify(config, null, 2), 'utf-8');
    }

}

// Exporting the dbManager object
module.exports = dbManager;
