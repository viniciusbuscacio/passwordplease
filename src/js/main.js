/*
Import necessary modules from Electron and other dependencies
The app module is responsible for controlling the application's lifecycle. 
The BrowserWindow module is used to create and control browser windows. 
The Menu module is used to create native menus that can be used as application menus and context menus. 
The Tray module is used to create system tray icons. 
The dialog module is used to display native system dialogs for opening and saving files, alerting, etc. 
The ipcMain module is used to handle inter-process communication from the main process to renderer processes. 
The session module is used to manage cookies and other aspects of the session state.
*/
const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, session } = require('electron');
const electron = require('electron');
const path = require('path');                     // The path module is used to work with file and directory paths.
const sqlite3 = require('sqlite3').verbose();     // The sqlite3 module is used to interact with SQLite databases
const fs = require('fs');                         // The fs module is used to read and write files to the filesystem.
const dbManager = require('./dbConfig.js');        // dbConfig is a module containing configuration details for the database.
const dbCrypto = require('./dbCrypto.js');        // dbCrypto is a module containing functions to encrypt and decrypt data.

const global = require('./global.js');          // globals is a module containing global variables used in the project.

const { connectToDatabase, createTable, insertRecord, getAllRecords, updateRecordById, editRecordById, deleteRecordById, setMainWindow, getAllCategories, deleteCategory, addCategory, updateCategory, loadPasswordsPage, setTitleBarDatabaseName, addDefaultCategories } = require('./database.js'); // import functions from database.js


// Create variables for mainWindow, tray, database, and database path
let mainWindow = null;
let tray = null;

/* function to create the configuration file path                                                     
this path will be used later to create or read the configuration file                              
*/

function configFile() {                                                                               
 global.userDataPath = (electron.app || electron.remote.app).getPath('userData');       // Get the path to the user data directory and set it to global.userDataPath
 global.configFilePath = path.join(global.userDataPath, 'passwordPleaseConfig.json');    // Define the path to the config file and set it to global.configFilePath
}                                                                                                               
/* call the function configFile                                                                                 
the configuration file will usually be located at %AppData%\passwordPlease\passwordPleaseConfig.json         
*/
configFile();                                                                                                   


///////////////////////////////////////////////////////////////////////
// Create a new browser window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 540,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, global.unlockedIcon) 
  });

  mainWindow.on('minimize', function(event) {   // intercept the minimize event
    event.preventDefault();
    minimizeToTray();
  });

  mainWindow.on('close', function(event) { // intercept the close event - will check if the closeToTray option is enabled
    const configFile = readConfigFile();
    if (configFile && configFile.closeToTray && !app.isQuiting) {
      event.preventDefault();
      minimizeToTray();
    }
    return false;
  });




  loadIndexPage(); // load the index.html file
  //mainWindow.webContents.openDevTools(); // Google Chrome Dev Tools

  const menu = Menu.buildFromTemplate([
    {
      label: 'Database',
      submenu: [
        {
          label: 'Open an existing database',
          click: openDatabaseMenu
        },
        {
          label: 'Create a new database',
          click: createNewDatabase
        },
        {
          label: 'Lock Database',
          id: 'lockMenuItem',
          click: lockDatabase,
          enabled: false
        },
        {
          label: 'Close Database',
          id: 'closeMenuItem',
          click: closeDatabase,
          enabled: false
        },
        {
          label: 'Change Master Password',
          id: 'changeMasterPasswordMenuItem',
          click: changeMasterPassword,
          enabled: false
        },
        {
          type: 'separator'
        },
        {
          label: 'Settings',
          id: 'settingsMenuItem',
          click: settingsMenu,
        },
        {
          label: 'Minimize to tray',
          click: minimizeToTray
        },
        {
          type: 'separator'
        },
        {
          label: 'Close program',
          click: closeApp
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About passwordPlease',
          click: aboutMenu
        }
      ]
    }
  ]);

  Menu.setApplicationMenu(menu);

  tray = new Tray(path.join(__dirname, global.lockedIcon)); // the tray icon will start as the locked icon
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Lock Database',
      id: 'lockMenuItemTray',
      click: lockDatabase
    },
    {
      label: 'Close Database',
      id: 'closeMenuItemTray',
      click: closeDatabase
    },
    {
      type: 'separator'
    },
    {
      label: 'Minimize to tray',
      click: minimizeToTray
    },
    {
      label: 'Close App',
      click: closeApp
    }
  ]);

  tray.setToolTip('passwordPlease');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  ipcMain.on('newPassword', (event, data) => {
    insertRecord(data.title, data.username, data.password);
  });

  setMainWindow(mainWindow); // Passa a referência da janela principal para o módulo database.js

  ipcMain.on('lock-database', () => {
    lockDatabase();
  });

  ipcMain.on('close-database', () => {
    closeDatabase();
  });
}

// function to open the about menu
function aboutMenu() {
  mainWindow.loadFile('src/html/about.html');
}

// function to send the app to the tray
function minimizeToTray() {
  // read the lockOnMinimize value from the config file
  const configFile = readConfigFile();
  if (configFile && configFile.lockOnMinimize) {
    lockDatabase();
  }
  mainWindow.hide();
}




// function to open the settings menu
function settingsMenu() {
  if (global.isDatabaseLocked === true) {
    return;
  } else {
    mainWindow.loadFile('src/html/settings.html');
  }
}


// function to close the app
function closeApp() {
    app.isQuiting = true;
    app.quit();
}



// function to enable the lock menu item
function enableLockMenuItem() {
  const menu = Menu.getApplicationMenu();
  const lockMenuItem = menu.getMenuItemById('lockMenuItem');
  lockMenuItem.enabled = true;
}

// function to disable the lock menu item
function disableLockMenuItem() {
  const menu = Menu.getApplicationMenu();
  const lockMenuItem = menu.getMenuItemById('lockMenuItem');
  lockMenuItem.enabled = false;
}

// function to enable the lock menu item
function enableMasterPasswordMenuItem() {
  const menu = Menu.getApplicationMenu();
  const changeMasterPasswordMenuItem = menu.getMenuItemById('changeMasterPasswordMenuItem');
  changeMasterPasswordMenuItem.enabled = true;
}

// function to disable the lock menu item
function disableMasterPasswordMenuItem() {
  const menu = Menu.getApplicationMenu();
  const changeMasterPasswordMenuItem = menu.getMenuItemById('changeMasterPasswordMenuItem');
  changeMasterPasswordMenuItem.enabled = false;
}

// function to enable the lock menu item
function enableCloseMenuItem() {
  const menu = Menu.getApplicationMenu();
  const closeMenuItem = menu.getMenuItemById('closeMenuItem');
  closeMenuItem.enabled = true;
}

// function to disable the lock menu item
function disableCloseMenuItem() {
  const menu = Menu.getApplicationMenu();
  const closeMenuItem = menu.getMenuItemById('closeMenuItem');
  closeMenuItem.enabled = false;
}



// Function to open an existing database
function openDatabasePage() {
    global.db = connectToDatabase(global.dbPath); 
    if (global.db) {
      mainWindow.loadFile('src/html/openDatabase.html');
     } else {
      console.error('Unable to connect to the database.');
    }
}


// function to lock the database
function lockDatabase() {
  // check if the database is already locked
  if (global.isDatabaseLocked === true) {
    return;
  }

  global.dbPath = dbManager.getDbPath(); // collect the value from dbConfig.js file and set it to the global.dbPath variable
  if (global.dbPath === null) {
    return;
  }
  if (global.db) {
  global.db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    mainWindow.loadFile('src/html/databaseLocked.html'); // load the databaseLocked.html file
    global.mountKey = null; // set the mountKey to null
    disableLockMenuItem(); // disable the lock menu item
    setLockedTrayIcon(); // set the tray icon to the locked icon
    global.isDatabaseLocked = true;
  });
}
}

// function to set the tray icon to the locked icon
function setLockedTrayIcon() {
  tray.setImage(path.join(__dirname, global.lockedIcon)); // change the tray icon to the locked icon
}

// set the tray icon to the unlocked icon
function setUnlockedTrayIcon() {
  tray.setImage(path.join(__dirname, global.unlockedIcon)); // change the tray icon to the unlocked icon
}



// function to lock the database
function closeDatabase() {
  //locked = true;
  if (global.db) {
  global.db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    userLoggedOut(); // user logged out, call the userLoggedOut function to clean all values
  });
  };
}

// funcion to change the master password
function changeMasterPassword() {
  mainWindow.loadFile('src/html/changeMasterPassword.html');
}



// function to check the master password  
function checkDatabaseMasterPwd(masterPassword) {
  global.db = connectToDatabase(global.dbPath);
  const sql = `SELECT mountKeyCiphered, masterPasswordhash FROM masterPwd`;
  global.db.get(sql, [], (err, row) => {
    if (err) {
      console.error(err.message);
    } else {
      const mountKeyCiphered = row.mountKeyCiphered;
      const masterPasswordhash = row.masterPasswordhash;
      /* send the mountKeyCiphered and masterPasswordhash to the dbCrypto module
      the dbCrypto module will decrypt the mountKeyCiphered with the masterPassword
      the dbCrypto module will compare the masterPasswordhash with the hash of the masterPassword
      if the masterPassword is correct, the dbCrypto module will return the global.mountKey
      if the masterPassword is incorrect, the dbCrypto module will return null
      */
      checkPassword = dbCrypto.checkMasterPassword(masterPassword, masterPasswordhash);
      
      if (checkPassword == true) {
        userLoggedInSucessfuly(); // user authenticated sucessfuly, call the userLoggedInSucessfuly function
        global.mountKey = dbCrypto.decryptMountKey(mountKeyCiphered, masterPassword);
        //const base64Key = Buffer.from(global.mountKey).toString('base64');
        dbCrypto.updateMountKey(global.mountKey);
        global.mountKey = dbCrypto.getMountKey();
        dbManager.updatepasswordPleaseConfigjson();
      }
      else {
        console.error('function checkDatabaseMasterPwd - Master password is incorrect.');
        mainWindow.webContents.send('incorrect-password');
      }
      
    }
  });
}


/* if the user login is sucessful, load the passwords page
also, enable the lock menu item and enable the close database menu item
*/
function  userLoggedInSucessfuly() {
  global.isDatabaseOpened = true;                                // set the global.isDatabaseOpened variable to true
  global.isDatabaseLocked = false;                               // set the global.isDatabaseLocked variable to false
  loadPasswordsPage();                                           // Call the loadPasswordsPage function after the user is authenticated
  enableLockMenuItem();                                          // enable the lock menu item
  enableCloseMenuItem();                                         // enable the close database menu item
  setUnlockedTrayIcon();                                         // set the tray icon to the unlocked icon
  enableMasterPasswordMenuItem();                                // enable the change master password menu item
}

/* if the user logout, load the index page
also, disable the lock menu item and disable the close database menu item
*/
function userLoggedOut() {
  global.isDatabaseOpened = false;                               // set the global.isDatabaseOpened variable to false
  global.isDatabaseLocked = false;                               // set the global.isDatabaseLocked variable to false
  global.mountKey = null;                                        // set the global.mountKey to null
  global.dbPath  = dbManager.setDbPath(null);                     // set the global.dbPath  to null
  loadIndexPage();                                               // load the index.html file
  disableLockMenuItem();                                         // disable the lock menu item
  disableCloseMenuItem();                                        // disable the close database menu item
  setLockedTrayIcon();                                           // set the tray icon to the locked icon
  disableMasterPasswordMenuItem();                               // disable the change master password menu item
}





// Function to create a new database - opens a dialog box to save the database file
function createNewDatabaseMasterPwd(masterPassword) {
  dialog
    .showSaveDialog({
      title: 'Create New Database',
      defaultPath: 'new-database.db',
      filters: [
        { name: 'SQLite Databases', extensions: ['db', 'sqlite', 'sqlite3'] },
      ],
    })
    .then((result) => {
      if (!result.canceled) {
        let fileCreated = result.filePath;
        dbManager.setDbPath(fileCreated);
        global.dbPath = dbManager.getDbPath();
        const masterPasswordhash = dbCrypto.hashMasterPassword(masterPassword);
        global.mountKey = dbCrypto.createMountKey();
        const mountKeyCiphered = dbCrypto.encryptMountKey(global.mountKey, masterPassword)
        global.db = connectToDatabase(global.dbPath);
        createTable(mountKeyCiphered, masterPasswordhash)
          .then(() => {
            userLoggedInSucessfuly();
            //addDefaultCategories(); // add the default categories to the database
          })
          .catch((err) => {
            console.error(err);
          });
      }
    })
    .catch((err) => {
      console.error(err);
    });
}


// Function to create a new database - load the createDatabase.html file
function createNewDatabase() {
  mainWindow.loadFile('src/html/createDatabase.html');
}





// Function to open an existing database - opens a dialog box to select the database file
function openDatabaseMenu() {
  dialog.showOpenDialog({
    title: 'Open Database',
    properties: ['openFile'],
    filters: [
      { name: 'SQLite Databases', extensions: ['db', 'sqlite', 'sqlite3'] }
    ]
  }).then((result) => {
    if (!result.canceled) {
      fileOpened = result.filePaths[0]; // here, we will set the value of global.dbPath to the file opened by the user
      dbManager.setDbPath(fileOpened); // send this value to the setDbPath function on dbConfig.js file
      global.dbPath = dbManager.getDbPath(); // collect the value from dbConfig.js file and set it to the dbPath variable
      openDatabasePage(); // call the openDatabase function
  }
}).catch((err) => {
  console.error(err);
});
}

// load the index.html file
function loadIndexPage() {
  mainWindow.loadFile('src/html/index.html');
}

/* listen for the 'load-passwords-page' event sent from the renderer process.
When this event is received, the mainWindow loads the 'passwords.html' file.
*/
ipcMain.on('load-passwords-page', () => {
  mainWindow.loadFile('src/html/passwords.html');
});

// update the title of the mainWindow
ipcMain.on('update-title-bar', () => {
  setTitleBarDatabaseName();
});

ipcMain.on('addPassword', () => {
  mainWindow.loadFile('src/html/addpass.html');
});

ipcMain.handle('get-dbPath', (event) => {
  global.dbPath= dbManager.getDbPath(); // collect the value from dbConfig.js file and set it to the global.dbPathvariable
  return global.dbPath ;  // returns the value of global.dbPath to the renderer.js
});

ipcMain.on('load-index-page', () => {
  loadIndexPage();
});

/*
Listen the event to change the Master Passord
The renderer.js will send the old and the new master password
*/
ipcMain.handle('ipcChangeMasterPassword', (event, oldMasterPassword, newMasterPassword) => {
  return new Promise((resolve, reject) => { // return a new Promise
    global.db = connectToDatabase(global.dbPath);
    const sql = `SELECT mountKeyCiphered, masterPasswordhash FROM masterPwd`;
    global.db.get(sql, [], (err, row) => {
      if (err) {
        console.error(err.message);
        reject(err); // reject the Promise with the error
      } else {
        const mountKeyCiphered = row.mountKeyCiphered;
        const masterPasswordhash = row.masterPasswordhash;
        const checkPassword = dbCrypto.checkMasterPassword(oldMasterPassword, masterPasswordhash);
        if (checkPassword == true) {
          const mountKey = dbCrypto.decryptMountKey(mountKeyCiphered, oldMasterPassword);
          const mountKeyCipheredNew = dbCrypto.encryptMountKey(mountKey, newMasterPassword);
          const masterPasswordhashNew = dbCrypto.hashMasterPassword(newMasterPassword);
          const db = connectToDatabase(global.dbPath);
          const sqlInsert = `INSERT INTO masterPwd (mountKeyCiphered, masterPasswordhash) VALUES (?, ?)`;
          db.run(sqlInsert, [mountKeyCipheredNew, masterPasswordhashNew], (err) => {
            if (err) {
              console.error(err.message);
              reject(err); // reject the Promise with the error
            } else {
              const sqlRead = `SELECT * FROM masterPwd`;
              db.all(sqlRead, [], (err, rows) => {
                if (err) {
                  console.error(err.message);
                  reject(err); // reject the Promise with the error
                } else {
                  if (rows.length >= 1) {
                    const row = rows[0]; // get the first row
                    const sqlDelete = `DELETE FROM masterPwd WHERE masterPasswordhash = ?`;
                    db.run(sqlDelete, [masterPasswordhash], (err) => {
                      if (err) {
                        console.error(err.message);
                        reject(err); // reject the Promise with the error
                      } else {
                        resolve('password-changed-sucessfuly');
                      }
                    });
                  } else {
                    resolve("Password not changed."); // Resolve the Promise if no rows
                  }
                }
              });
            }
          });
        } else {
          console.error('function changeDatabaseMasterPwd - Master password is incorrect.');
          return resolve("Password NOT changed: Master password incorrect."); // return right after resolving the promise
        }
      }
    });
  });
});




// get the last opened database file to the index.js
ipcMain.handle('openLastDatabaseFile', async () => {
  const configFile = readConfigFile();
  if (configFile) {
    global.lastOpenedDatabaseFile = configFile.lastOpenedDatabaseFile;
    dbManager.setDbPath(global.lastOpenedDatabaseFile);
    openDatabasePage();
  }
  else {
    console.error('Database file not found.');
    throw new Error('Database file not found.');
  }
});


// check if is there a last opened database file to the index.js
ipcMain.handle('checklastOpenedDatabaseFile', async () => {
  const configFile = readConfigFile();
  if(configFile && configFile.lastOpenedDatabaseFile) {
    return fs.existsSync(configFile.lastOpenedDatabaseFile);
  }
  return false;
});

ipcMain.on('update-passwords-page', () => {
  loadPasswordsPage(); 
});

ipcMain.on('goBack', () => {
  loadPasswordsPage();
});

ipcMain.handle('update-record-by-id', (event, id, record, dbPath) => {
  return updateRecordById(id, record, dbPath);
});


// check the master password received from the renderer.js
ipcMain.on('checkMasterPassword', (event, masterPassword) => {
  checkDatabaseMasterPwd(masterPassword);
});

// create the master password
ipcMain.on('createNewDatabaseMasterPwd', (event, masterPassword) => {
  createNewDatabaseMasterPwd(masterPassword);
});

// delete record
ipcMain.on('delete-record', (event, id) => {
  deleteRecordById(id)
    .then(() => {
      event.sender.send('record-deleted');       // update the passwords page
    })
    .catch((err) => {
      console.error(err);
    });
});


// editpass
ipcMain.on('edit-record', (event, id) => {
  editRecordById(id)
    .then(recordData => {
      event.sender.send('load-edit-page', recordData);
    })
    .catch(err => {
      console.error(err);
    });
});


// The program starts here, calling the function createWindow();
// app.whenReady().then(() => {
//   createWindow();     // create the main window
//   userLoggedOut();    // clean all values
// });

// The program starts here, calling the function createWindow();
app.whenReady().then(() => {
  // This will prevent multiple instances of the application from running at the same time.
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  } else {
    // This block will be executed when the user tries to start another instance.
    app.on('second-instance', () => {
      // Someone tried to run a second instance, we should focus our window.
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    })

    // Your existing code
    createWindow();     // create the main window
    userLoggedOut();    // clean all values
  }
})




/* The program listens for the 'window-all-closed' event. This event is emitted when all windows have been closed.
If the platform is not macOS (darwin), we call the app.quit() function to exit the application.
*/
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/*
The program listens for the 'activate' event. This event is usually emitted 
when the application is opened from the macOS dock or the task switcher in Windows.
If there are no windows open, we call createWindow() function to create a new one.
*/
app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) 
    createWindow();
});

/* receive the record from the renderer.js to add to the database
this comes from the addpass.html file
*/
ipcMain.on('insert-record', (event, record) => {
  // console the record via JSON.stringify
  insertRecord(record)
    .then(() => {
      event.sender.send('insert-record-success');
    })
    .catch((error) => {
      event.sender.send('insert-record-error', error);
    });
});

/////// configuration file ///////

// check if the config file exists
fs.access(global.configFilePath, fs.constants.F_OK, (err) => {
  if (err) {
    // default config
    const defaultConfig = {
      timerToLock: 5,
      timerToLockEnabled: true,
      timerToLockUnit: 'minutes',
      lastOpenedDatabaseFile: null,
      lockOnMinimize: true,
      closeToTray: true,
      generatePasswordSize: 16
    };
    fs.writeFileSync(global.configFilePath, JSON.stringify(defaultConfig, null, 2));
  }
});

function readConfigFile() {
  // check if the config file exists
  if (fs.existsSync(global.configFilePath)) {
    const configFileContents = fs.readFileSync(global.configFilePath, 'utf-8');
    const configFile = JSON.parse(configFileContents);
    return configFile;
  } else {
    console.error('Config file does not exist.');
    return null;
  }
}

/*
Receive the saveSettings from the rendered.js and save it to the passwordPleaseConfig.json file
except the categories, which will be saved in database
*/
ipcMain.on('saveSettings', async (event, settings) => {
  // Read the existing settings
  const existingSettingsString = fs.readFileSync(global.configFilePath, 'utf-8');
  const existingSettings = JSON.parse(existingSettingsString);

  // Merge the existing settings with the new settings (excluding the categories array)
  const mergedSettings = {
    ...existingSettings,
    ...settings,
    categories: undefined // Exclude the categories array from the settings to be saved in the JSON file
  };

  // Convert the merged settings object to a string
  const mergedSettingsString = JSON.stringify(mergedSettings, null, 2);

  // Write merged settings string to the file
  fs.writeFileSync(global.configFilePath, mergedSettingsString);

  // if Database is opened, go to the passwords page
  if (global.isDatabaseOpened === true) {
    loadPasswordsPage();
    startLockTimer();
  } else {  
    // if Database is locked, go to the index page
    loadIndexPage();
  }
});


// button to close the settings page
ipcMain.on('closeSettings', async () => {
  // if Database is opened, go to the passwords page
  if (global.isDatabaseOpened === true) {
    loadPasswordsPage();
    startLockTimer();
  } else {
    // if Database is locked, go to the index page
    loadIndexPage();
  }
});

// receive the event editCategories from the rendered.js and load the editCategories.html page
ipcMain.on('editCategories', async () => {
  mainWindow.loadFile('src/html/editCategories.html');
});


// receive the event saveCategories from the renderer process and save the categories to the database
ipcMain.on('saveCategories', async (event, categoriesEditions) => {
  const {initialCategories, deletedCategories, createdCategories, editedCategories} = categoriesEditions;
  const promises = [];

  // Loop through the deletedCategories array and delete each category
  for (const categoryId of deletedCategories) {
    promises.push(deleteCategory(categoryId)); // push the Promise into the array
  }

  // Loop through the createdCategories array and create each new category
  for (const categoryName of createdCategories) {
    promises.push(addCategory({categoryName})); // push the Promise into the array
  }

  // Loop through the editedCategories array and update each category
  for (const category of editedCategories) {
    promises.push(updateCategory(category)); // push the Promise into the array
  }
  
  // Wait for all the promises to resolve
  await Promise.all(promises);

  // Now that all the categories have been updated, you can load the passwords page
  loadPasswordsPage();

});


// receive the getcategories from the rendered.js, then search it in the global.categories variable and return the values
ipcMain.handle('getcategories', async (event) => {
  try {
    let categories = await loadcategories();
    return categories;
  } catch (error) {
    console.error(`Error loading categories: ${error}`);
  }
});

/* receive the getGeneratePasswordSize from the renderer.js
and reply with the value of the generatePasswordSize variable
*/
ipcMain.handle('getGeneratePasswordSize', async (event) => {
  const configFile = readConfigFile();
  if (configFile) {
    const { generatePasswordSize } = configFile;
    return generatePasswordSize;
  }
  return null;
});



// load the categories from the database when the user login
async function loadcategories() {
  let categories;
  try {
    categories = await getAllCategories();
  } catch (error) {
    console.error(`Error loading categories: ${error}`);
  }
  return categories; // Aqui está a instrução de retorno
}



// ipc to receive the getSettings from the rendered.js and return the values
ipcMain.handle('getSettings', async () => {
  const configFile = readConfigFile();
  if (configFile) {
    const { timerToLockEnabled, timerToLock, timerToLockUnit, lockOnMinimize, closeToTray, generatePasswordSize } = configFile;
    // send the values to the renderer.js
    return {
      timerToLockEnabled,
      timerToLock,
      timerToLockUnit,
      lockOnMinimize,
      closeToTray,
      generatePasswordSize
    };
  }
  // if the config file does not exist, return null
  return null;
});


// Function to start the lock timer
function startLockTimer() {
  if (global.isDatabaseLocked === true) {
    return;
  }

  if (global.isDatabaseOpened === false) {
    return;
  }

  const settings = readConfigFile();
  if (!settings) {
    return;
  }

  const { timerToLockEnabled, timerToLock, timerToLockUnit } = settings;

  if (!timerToLockEnabled) {
    return;
  }

  const timeoutInSeconds = calculateTimeoutInSeconds(timerToLock, timerToLockUnit);
  const timeoutInMilliseconds = timeoutInSeconds * 1000;

  global.lockTimeout = setTimeout(lockDatabase, timeoutInMilliseconds);
}

function calculateTimeoutInSeconds(timerToLock, timerToLockUnit) {
  // Function to calculate the timeout in seconds based on the units defined (seconds, minutes, hours)
  const secondsPerUnit = {
    seconds: 1,
    minutes: 60,
    hours: 60 * 60
  };

  return timerToLock * secondsPerUnit[timerToLockUnit];
}

// Reset the lock timer when the user interacts with the app
app.on('browser-window-focus', () => {
  resetLockTimer();
});

// Reset the lock timer when a key is pressed
app.on('browser-window-interactive', () => {
  resetLockTimer();
});

// Reset the lock timer
function resetLockTimer() {
  // check if the database is locked
  if (global.isDatabaseLocked === true) {
    return;
  } else {
    clearTimeout(global.lockTimeout);
  }
}
