// this file contains all the global variables used in the project

const global = {
    // mountKey is the key used to mount the encrypted volume
    mountKey: null,

    // db is the database object used to access the database
    db: null,

    // Initialize the 'dbPath' variable to null.
    dbPath: null,

    // initialize the last opened database file to null
    //lastOpenedDatabaseFile: null,

    // Lock the application after a period of inactivity
    lockTimeout: null,
    isDatabaseLocked: false,
    isDatabaseOpened: false,

    // Get the path to the user data directory
    //let userDataPath = (electron.app || electron.remote.app).getPath('userData');
    userDataPath: null,

    // Define the path to the config file
    //let configFilePath = path.join(userDataPath, 'passwordPleaseConfig.json');
    configFilePath: null,

    // lock icon
    unlockedIcon: '../../images/icon.ico',

    // unlock icon
    lockedIcon: '../../images/iconLocked.png',

    /* generatePasswordSize is the size of the password generated
    default value is 16, but this will be overwritten by the value in the config file
    */
    generatePasswordSize: 16,

    // create the categories array
    categories: [],
}

// export the modules
module.exports = global;
