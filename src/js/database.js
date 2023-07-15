// Import necessary modules from sqlite3 and other dependencies
const sqlite3 = require('sqlite3').verbose();     // The sqlite3 module is used to interact with SQLite databases
const { v4: uuidv4 } = require('uuid');           // uuid is used to generate unique identifiers for records 
const dbManager = require('./dbConfig.js');        // dbConfig is a module containing configuration details for the database.
const dbCrypto = require('./dbCrypto.js');        // dbCrypto is a module containing functions to encrypt and decrypt data.
const global = require('./global.js');          // globals is a module containing global variables used in the project.   

// Create variables for sql, and mainWindow
let sql;
let mainWindow = null;


// Function used to establish a connection with the SQLite3 database.
function connectToDatabase(dbPath) {
  if(global.dbPath == null){
      console.error('function connectToDatabase - Database path is not set.');
      return;
  }

  return new sqlite3.Database(global.dbPath, (err) => {
    if (err) {
    console.error(`function connectToDatabase - ${err.message}`);
    } else {

    }
  });
}

// // // // create a table named passwords in the SQLite database if it doesn't exist. 
// // // // The table includes columns for id, title, username, password, URL, and notes.
// create tables named passwords, categories and masterPwd in the SQLite database if they don't exist. 
function createTable(mountKeyCiphered, masterPasswordhash) {
  global.dbPath = dbManager.getDbPath();
  const db = connectToDatabase(global.dbPath);

  /* if the user is overwrittening the database, drop the tables and create them again
  this is necessary to avoid errors when the user is overwriting the database with a new one
  when values can be saved in the database with different encryption keys
  */

  db.serialize(() => {
    db.run('DROP TABLE IF EXISTS passwords');
    db.run('DROP TABLE IF EXISTS categories');
    db.run('DROP TABLE IF EXISTS masterPwd');
  });

  const sqlPasswords = `CREATE TABLE passwords (
    id TEXT PRIMARY KEY,
    title TEXT,
    username TEXT,
    password TEXT,
    URL TEXT,
    notes TEXT,
    categoryId TEXT,
    FOREIGN KEY(categoryId) REFERENCES categories(categoryId) ON DELETE SET NULL
  )`;

  const sqlCategories = `CREATE TABLE categories (
    categoryId TEXT PRIMARY KEY,
    categoryName TEXT
  )`;

  const sqlMasterPwd = `CREATE TABLE masterPwd (
    mountKeyCiphered TEXT PRIMARY KEY,
    masterPasswordhash TEXT
  )`;
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(sqlCategories, (err) => {
        if (err) {
          console.error(err.message);
          reject(err);
          return;  // Don't proceed to the next steps
        } else {

        }
      });
  
      db.run(sqlPasswords, (err) => {
        if (err) {
          console.error(err.message);
          reject(err);
          return;  // Don't proceed to the next steps
        } else {

        }
      });
  
      db.run(sqlMasterPwd, (err) => {
        if (err) {
          console.error(err.message);
          reject(err);
          return;  // Don't proceed to the next steps
        } else {

        }
      });

      // After all tables have been created, insert the data into 'masterPwd' table
      const sql = `INSERT INTO masterPwd (mountKeyCiphered, masterPasswordhash) VALUES (?, ?)`;
      db.run(sql, [mountKeyCiphered, masterPasswordhash], (err) => {
        if (err) {
          console.error(err.message);
          reject(err);
          return;  // Don't proceed to the next steps
        } else {

          // Close the database connection here, after all operations have been done
          db.close((err) => {
            if (err) {
              console.error(err.message);
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });
    });
  });
}  


// used to insert a new record into the passwords table. 
// It uses a promise to ensure the successful insertion of data.
function insertRecord(record) {
  checkUserAuthentication();
  return new Promise((resolve, reject) => {
    const { title, username, password, URL, notes, categoryId, dbPath } = record;
    const db = connectToDatabase(global.dbPath);
    const id = Buffer.from(uuidv4()).toString('base64'); // create a UUID, convert it to Base64, and use it as ID 
    global.mountKey = dbCrypto.getMountKey();
    //Encrypt the data before inserting it into the database
    const encryptedTitle = title ? dbCrypto.encryptData(title, global.mountKey) : null;
    const encryptedUsername = username ? dbCrypto.encryptData(username, global.mountKey) : null;
    const encryptedPassword = password ? dbCrypto.encryptData(password, global.mountKey) : null;
    const encryptedURL = URL ? dbCrypto.encryptData(URL, global.mountKey) : null;
    const encryptedNotes = notes ? dbCrypto.encryptData(notes, global.mountKey) : null;
    //const encryptedcategoryId = categoryId ? dbCrypto.encryptData(categoryId, global.mountKey) : null;

    const sql = `INSERT INTO passwords (id, title, username, password, URL, notes, categoryId) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [id, encryptedTitle, encryptedUsername, encryptedPassword, encryptedURL, encryptedNotes, categoryId], (err) => {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        loadPasswordsPage();
        resolve();
      }
      db.close();
    });
  });
}



//  used to update a specific record identified by its id in the passwords table.
function updateRecordById(id, data, dbPath) {
  checkUserAuthentication();
  db = connectToDatabase(global.dbPath);

  // Get the mountKey
  global.mountKey= dbCrypto.getMountKey();

  // Encrypt the data before updating it in the database
  data.title = dbCrypto.encryptData(data.title, global.mountKey);
  data.username = dbCrypto.encryptData(data.username, global.mountKey);
  data.password = dbCrypto.encryptData(data.password, global.mountKey);
  data.URL = dbCrypto.encryptData(data.URL, global.mountKey);
  data.notes = dbCrypto.encryptData(data.notes, global.mountKey);

  return new Promise((resolve, reject) => {
    const sql = `UPDATE passwords SET title = ?, username = ?, password = ?, URL = ?, notes = ?, categoryId = ? WHERE id = ?`;
    db.run(sql, [data.title, data.username, data.password, data.URL, data.notes, data.categoryId, id], function(err) {
      if (err) {
        return reject(err);
      }
      loadPasswordsPage();
      resolve();
    });
  });
}



//  retrieve all the records from the passwords table.
async function getAllRecords() {
  checkUserAuthentication();
  // Ensure global.dbPath is defined before calling connectToDatabase
  global.dbPath = dbManager.getDbPath();
  const db = connectToDatabase(global.dbPath);
  const sql = `SELECT * FROM passwords`;

  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        
      // Decrypt the data
      rows.forEach(row => {
        global.mountKey = dbCrypto.getMountKey(); // get the mountKey

        // Ensure global.mountKeyis valid
        if (global.mountKey) {
          ['title', 'username', 'password', 'URL', 'notes'].forEach(field => {
            try {
              row[field] = dbCrypto.decryptData(row[field], global.mountKey);
            } catch (err) {
              console.error(`Error decrypting ${field}: ${err.message}`);
              // Set the field to some error value or leave it as is
              row[field] = `<Error: ${err.message}>`;
            }
          });
        }
      });


        getAllCategories();
        resolve(rows);
      }
    });
  });
}

// retrieve all the records from the categories table.
async function getAllCategories() {
  checkUserAuthentication();
  // Ensure global.dbPath is defined before calling connectToDatabase
  global.dbPath = dbManager.getDbPath();
  const db = connectToDatabase(global.dbPath);
  const sql = `SELECT * FROM categories`;

  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        // Decrypt the data
        rows.forEach(row => {
          global.mountKey = dbCrypto.getMountKey(); // get the mountKey

          // Ensure global.mountKey is valid
          if (global.mountKey) {
            try {
              row.categoryId = row.categoryId;
              row.categoryName = dbCrypto.decryptData(row.categoryName, global.mountKey);
            } catch (err) {
              console.error(`Error decrypting categoryName: ${err.message}`);
              row.categoryName = `<Error: ${err.message}>`;
            }
          }
        });
        global.categories = rows; // fill the global.categories variable with the categories from the database
        resolve(rows);
      }
    });
  });
}



// insert a new record into the categories table of the database
async function addCategory(category) {
  checkUserAuthentication();
  // Ensure global.dbPath is defined before calling connectToDatabase
  global.dbPath = dbManager.getDbPath();
  const db = connectToDatabase(global.dbPath);
  const id = Buffer.from(uuidv4()).toString('base64'); // create a UUID, convert it to Base64, and use it as ID
  const encryptedCategoryName = category.categoryName ? dbCrypto.encryptData(category.categoryName, global.mountKey) : null;
  const sql = `INSERT INTO categories (categoryID, categoryName) VALUES (?, ?)`;

  return new Promise((resolve, reject) => {
    db.run(sql, [id, encryptedCategoryName], function(err) {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        category.categoryId = this.lastID; // set the ID of the category
        resolve(category); // return the category with its ID
      }
    });
  });
}

// update a record in the categories table of the database
async function updateCategory(category) {
  checkUserAuthentication();
  // Ensure global.dbPath is defined before calling connectToDatabase
  global.dbPath = dbManager.getDbPath();
  const db = connectToDatabase(global.dbPath);
  const encryptedCategoryName = category.categoryName ? dbCrypto.encryptData(category.categoryName, global.mountKey) : null;
  const sql = `UPDATE categories SET categoryName = ? WHERE categoryId = ?`;

  return new Promise((resolve, reject) => {
    db.run(sql, [encryptedCategoryName, category.categoryId], function(err) {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        resolve(category); // return the updated category
      }
    });
  });
}


// add the default categories to the database
async function addDefaultCategories() {
  const defaultCategories = ['Email', 'Work', 'Personal'];
  for (let categoryName of defaultCategories) {
    let category = { categoryName: categoryName };
    try {
      await addCategory(category);
    } catch (err) {
      console.error(`Failed to insert default category "${categoryName}":`, err.message);
    }
  }
}



// delete a specific category identified by its id.
async function deleteCategory(category) {
  // clear the categoryId field of the passwords table before deleting the category
  try {
    deleteCategoryFromPasswordTable(category);
  }
  catch (err) {
    console.error(err);
  };

  checkUserAuthentication();

  // Ensure global.dbPath is defined before calling connectToDatabase
  global.dbPath = dbManager.getDbPath();
  const db = connectToDatabase(global.dbPath);
  
  const sql = `DELETE FROM categories WHERE categoryId = ?;`;

  return new Promise((resolve, reject) => {
    db.run(sql, category, function(err) {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        resolve(category);
      }
    });
  });
}

// delete the categoryId field of the passwords table before deleting the category
// if the user have any password with this category, the categoryId field will be set to NULL
async function deleteCategoryFromPasswordTable(categoryId) {

  // ensure global.dbPath is defined before calling connectToDatabase
  global.dbPath = dbManager.getDbPath();
  const db = connectToDatabase(global.dbPath);

  const sql = `UPDATE passwords SET categoryId = NULL WHERE categoryId = ?;`;

  return new Promise((resolve, reject) => {
    db.run(sql, [categoryId], function(err) {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}



// fetch a specific record identified by its id in order to edit it.
function editRecordById(id) {
  checkUserAuthentication();
  //setDatabasePath(global.dbPath);
  const db = connectToDatabase(global.dbPath);
  return new Promise((resolve, reject) => {
    // Aqui você pode realizar a lógica de busca do registro pelo id no banco de dados
    // Utilize consultas SQL para recuperar os valores do registro que deseja editar

    // Exemplo de consulta SQL para buscar o registro pelo id
    const sql = `SELECT * FROM passwords WHERE id = ?`;
    db.get(sql, id, (err, row) => {
      if (err) {
        reject(err);
      } else {
        // Get the global.mountKey
        global.mountKey = dbCrypto.getMountKey();

        // Decrypt the data before loading it to the edit page
        ['title', 'username', 'password', 'URL', 'notes'].forEach(field => {
          try {
            row[field] = dbCrypto.decryptData(row[field], global.mountKey);
          } catch (err) {
            console.error(`Error decrypting ${field}: ${err.message}`);
            row[field] = `<Error: ${err.message}>`;
          }
        });

        // Aqui você pode chamar a função para carregar a página addpass.html
        // Passando o objeto `row` com os valores preenchidos automaticamente
        // para que sejam exibidos no formulário de edição
        loadEditPage(row);
        resolve();
      }
    });
  });
}



// Call the loadPasswordsPage function after the table is created
function loadEditPage(data) {
  mainWindow.loadFile('src/html/editpass.html').then(() => {
    mainWindow.webContents.send('load-edit-page', data);
  });
}



// delete a specific record identified by its id.
function deleteRecordById(id) {
  checkUserAuthentication();
  return new Promise((resolve, reject) => {
    const db = connectToDatabase(global.dbPath);
    const sql = `DELETE FROM passwords WHERE id = ?`;
    db.run(sql, id, (err) => {
      if (err) {
        reject(err);
      } else {
        loadPasswordsPage();
        resolve();
      }
      db.close();
    });
  });
}




// Set the main window reference
function setMainWindow(window) {
  mainWindow = window;
}

// function to validate the user before accessing protected pages
function checkUserAuthentication() {
  // check if variable isDatabaseLocked is true
  if (global.isDatabaseLocked) {
    mainWindow.loadFile('src/html/databaseLocked.html');
    return;
  } else {

  }
  
  // check if variable isDatabaseOpened is false
  if (!global.isDatabaseOpened) {

    mainWindow.loadFile('src/html/index.html');
    return;
  } else {

  }
}


function loadPasswordsPage() {
  checkUserAuthentication() // check if the user is authenticated before loading the page
  mainWindow.loadFile('src/html/passwords.html');
  mainWindow.webContents.once('dom-ready', async () => {
    try {
      var rows = await getAllRecords(global.dbPath);

      var script = `
        window.processRows = function(rows) {
          var tableBody = document.querySelector('#passwordsTable tbody');
          tableBody.innerHTML = '';
          rows.forEach(function(row) {
            var newRow = document.createElement('tr');
            newRow.innerHTML = '<td class="hidden id-column" style="display: none;">' + row.id + '</td><td class="limited-cell title-column" style="text-align: center;">' + row.title + '</td><td class="username-column limited-cell" style="text-align: center;">' + row.username + '</td><td class="password-column hidden" style="display: none;" type="password">' + row.password + '</td><td class="hidden url-column" style="display: none;">' + row.URL + '</td><td class="hidden notes-column" style="display: none;">' + row.notes + '</td><td style="text-align: center;"><button class="btn btn-outline-primary copy-username-button border-0 btn-lg" data-id="' + row.id + '" data-toggle="tooltip" title="Copy Username"><i class="bi bi-clipboard"></i></button>&nbsp;&nbsp;<button class="btn btn-outline-primary copy-password-button border-0 btn-lg" data-id="' + row.id + '" data-toggle="tooltip" title="Copy Password"><i class="bi bi-file-lock"></i></button>&nbsp;&nbsp;<button class="btn btn-outline-success edit-button border-0 btn-lg" data-id="' + row.id + '" data-toggle="tooltip" title="Edit Password"><i class="bi bi-pen"></i></button>&nbsp;&nbsp;<button class="btn btn-outline-danger delete-button border-0 btn-lg" data-id="' + row.id + '" data-toggle="tooltip" title="Delete Password"><i class="bi bi-trash"></i></button></td><td class="hidden categoryId-column" style="display: none;">' + row.categoryId + '</td>';
            tableBody.appendChild(newRow);
          });
        };

        try {
          window.processRows(JSON.parse(${JSON.stringify(JSON.stringify(rows))}));
        } catch (error) {
          console.error('Error updating passwords page:', error);
        }
      `;
      mainWindow.webContents.executeJavaScript(script).catch((error) => {
        console.error('Error executing script:', error);
      });
      setTitleBarDatabaseName();
    } catch (err) {
      console.error(err);
    }
  });
}

// function to set the database name to the title of the window
function setTitleBarDatabaseName() {
  const path = require('path');   // The path module provides utilities for working with file and directory paths
  //global.dbPath = dbManager.getDbPath(); // collect the value from dbConfig.js file and set it to the global.dbPath variable
  if (global.dbPath === null) {
    mainWindow.setTitle(`passwordPlease`);
  }
  else if (!global.dbPath) {
    mainWindow.setTitle(`passwordPlease`);
  }
  else {
  const dbFileName = path.basename(global.dbPath); // get the database file name without the full file path
  mainWindow.setTitle(`passwordPlease - ${dbFileName}`); // set the title of the window to the database name
  }
}



// Function to export the functions to be used in other modules
module.exports = {
  connectToDatabase,
  createTable,
  insertRecord,
  getAllRecords,
  getAllCategories,
  deleteCategory,
  addCategory,
  updateCategory,
  addDefaultCategories,
  editRecordById,
  updateRecordById,
  deleteRecordById,
  setMainWindow,
  loadPasswordsPage,
  setTitleBarDatabaseName
};