const { ipcRenderer } = require('electron');    // ipcRenderer is used to communicate with the main process
var xssFilters = require('xss-filters');        // xssFilters is used to sanitize the input fields
const { shell } = require('electron');           // shell is used to open the URL in the user's default browser

// add new register to the database via a new entry
// check if we are in the addpass.html page
if (location.pathname.includes('addpass.html')) {
  ipcRenderer.invoke('get-dbPath').then((dbPath) => {
    const formElement = document.getElementById('passwordForm');
    if (formElement) {
      formElement.addEventListener('submit', (event) => {
        event.preventDefault(); // Impede o envio padrão do formulário

        var title = document.getElementById('title').value;
        var username = document.getElementById('username').value;
        var password = document.getElementById('password').value;
        var URL = document.getElementById('URL').value;
        var notes = document.getElementById('notes').value;
        var category = document.getElementById('categoryDropdown').value;
        
        // Aplicando os filtros XSS
        title = xssFilters.inHTMLData(title);
        username = xssFilters.inHTMLData(username);
        password = xssFilters.inHTMLData(password);
        URL = xssFilters.inHTMLData(URL);
        notes = xssFilters.inHTMLData(notes);
        category = xssFilters.inHTMLData(category);

        const record = {
          title: title,
          username: username,
          password: password,
          URL: URL,
          notes: notes,
          categoryId: category,
          dbPath: dbPath
        };
  
        // verify if dbPath exists before calling insertRecord
        if (dbPath) {
          // send a message to the main process to insert the record
          ipcRenderer.send('insert-record', record);
        } else {
          console.error('dbPath is not set. Cannot insert record.');
        }
      });
    } else {
      console.error('Form not found');
    }
  });
}

// receive the message from the main process when the record insertion is successful
ipcRenderer.on('insert-record-success', () => {
  // clean the form fields after the successful insertion
  document.getElementById('title').value = '';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('URL').value = '';
  document.getElementById('notes').value = '';
  document.getElementById('categoryDropdown').value = '';
});

// receive the message from the main process when the record insertion fails
ipcRenderer.on('insert-record-error', (event, error) => {
  console.error(error);
});

// always open external links in the user's default browser, not electron js window
document.addEventListener('click', (event) => {
  if (event.target.tagName === 'A' && event.target.href.startsWith('http')) {
    event.preventDefault()
    shell.openExternal(event.target.href)
  }
})




// edit register on the database via editpass page
if (window.location.pathname.endsWith('editpass.html')) {
  ipcRenderer.invoke('get-dbPath').then((dbPath) => {
    // now the dbPath is available and can be used here 

    const editForm = document.getElementById('editForm');

    if(editForm){
      editForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const id = document.getElementById('id').value; 
        var title = document.getElementById('title').value;
        var username = document.getElementById('username').value;
        var password = document.getElementById('password').value;
        var URL = document.getElementById('URL').value;
        var notes = document.getElementById('notes').value;
        var category = document.getElementById('categoryDropdown').value;

        // Aplicando os filtros XSS
        title = xssFilters.inHTMLData(title);
        username = xssFilters.inHTMLData(username);
        password = xssFilters.inHTMLData(password);
        URL = xssFilters.inHTMLData(URL);
        notes = xssFilters.inHTMLData(notes);
        category = xssFilters.inHTMLData(category);

        const record = {
          title: title,
          username: username,
          password: password,
          URL: URL,
          notes: notes,
          categoryId: category
        };

        // Use IPC to call the function in main process instead of calling directly
        ipcRenderer.invoke('update-record-by-id', id, record, dbPath)
        .then(() => {
          // clean the form fields after the successful update
          document.getElementById('title').value = '';
          document.getElementById('username').value = '';
          document.getElementById('password').value = '';
          document.getElementById('URL').value = '';
          document.getElementById('notes').value = '';
          document.getElementById('categoryDropdown').value = '';
        })
        .catch((error) => {
          console.error(error);
        });
      });
    } else {

    }

  }).catch((error) => {
    console.error('Error fetching dbPath', error);
  });
}


// back button on following pages
// will reload the password pages
if (location.pathname.includes('editpass.html') || location.pathname.includes('addpass.html')) {
  
  const backButton = document.getElementById('backButton');

  if (backButton) {
    backButton.addEventListener('click', () => {
      // send a message to the main process to load the passwords page
      ipcRenderer.send('update-passwords-page');
    });
  }
}

// add the categories to the dropdown list on editpass.html and addpass.html
if (location.pathname.includes('editpass.html') || location.pathname.includes('addpass.html')) {
  ipcRenderer.invoke('getcategories').then((categories) => {
    const categoryDropdown = document.getElementById('categoryDropdown');
    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.categoryId;
      option.text = category.categoryName;
      categoryDropdown.add(option);
    });
  }).catch((error) => {
    console.error(`Error loading categories: ${error}`);
  });
  
  
}


// back button on about page
if (location.pathname.includes('about.html')) {
  const backButton = document.getElementById('backButton');

  if (backButton) {
    backButton.addEventListener('click', () => {
      ipcRenderer.invoke('get-dbPath').then((dbPath) => {
        // check if dbPath is not null
        if (dbPath) {
          // send a message to the main process to load the passwords page
          ipcRenderer.send('update-passwords-page');
        } else {
          // if no database is open, then send the command to load the index page
          ipcRenderer.send('load-index-page');
        }
      }).catch((error) => {
        console.error('Error fetching dbPath', error);
      });
    });
  }
}


// password visibility toggle
// used in editpass.html and addpass.html
function togglePasswordVisibility() {
  const passwordInput = document.getElementById('password');
  const showPasswordButton = document.getElementById('showPasswordButton');
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    showPasswordButton.innerHTML = '<i class="bi bi-eye-slash"></i>';
  } else {
    passwordInput.type = 'password';
    showPasswordButton.innerHTML = '<i class="bi bi-eye"></i>';
  }
}

// confirmation password visibility toggle
function toggleConfirmationPasswordVisibility() {
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const showConfirmationPasswordButton = document.getElementById('showConfirmationPasswordButton');

  if (confirmPasswordInput.type === 'password') {
    confirmPasswordInput.type = 'text';
    showConfirmationPasswordButton.innerHTML = '<i class="bi bi-eye-slash"></i>';
  } else {
    confirmPasswordInput.type = 'password';
    showConfirmationPasswordButton.innerHTML = '<i class="bi bi-eye"></i>';
  }
}

if (location.pathname.includes('createDatabase.html')) {
  window.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const submitButton = document.querySelector('input[type="submit"]');
    
    function validatePasswords() {
      if (passwordInput.value !== confirmPasswordInput.value) {
        submitButton.disabled = true;
      } else {
        submitButton.disabled = false;
      }
    }
    
    // Add event listener to the input fields
    passwordInput.addEventListener('input', validatePasswords);
    confirmPasswordInput.addEventListener('input', validatePasswords);
    
    // Initial validation in case the form is reloaded with data
    validatePasswords();

    // Add event listener to handle form submission
    document.getElementById('createDatabaseForm').addEventListener('submit', (event) => {
      // Prevent form from submitting if passwords do not match or are empty
      if (passwordInput.value !== confirmPasswordInput.value || passwordInput.value === '' || confirmPasswordInput.value === '') {
        event.preventDefault();
      } else {
        ipcRenderer.send('createNewDatabaseMasterPwd', passwordInput.value);
      }
    });
  });
}



if (location.pathname.includes('changeMasterPassword.html')) {

  // cancel button
  document.getElementById('cancelPasswordChangeButton').addEventListener('click', () => {
    ipcRenderer.send('closeSettings');
  });

  function togglePasswordVisibility() {
    const passwordField = document.getElementById('actualPassword');
    const passwordButton = document.getElementById('showPasswordButton');
    if (passwordField.type === "password") {
      passwordField.type = "text";
      passwordButton.innerHTML = '<i class="bi bi-eye-slash"></i>';
    } else {
      passwordField.type = "password";
      passwordButton.innerHTML = '<i class="bi bi-eye"></i>';
    }
  }

  function toggleConfirmationPasswordVisibility() {
    const passwordField = document.getElementById('confirmPassword');
    const passwordButton = document.getElementById('showConfirmationPasswordButton');
    if (passwordField.type === "password") {
      passwordField.type = "text";
      passwordButton.innerHTML = '<i class="bi bi-eye-slash"></i>';
    } else {
      passwordField.type = "password";
      passwordButton.innerHTML = '<i class="bi bi-eye"></i>';
    }
  }

  function toggleNewPasswordVisibility() {
    const passwordField = document.getElementById('newPassword');
    const passwordButton = document.getElementById('showNewPasswordButton');
    if (passwordField.type === "password") {
      passwordField.type = "text";
      passwordButton.innerHTML = '<i class="bi bi-eye-slash"></i>';
    } else {
      passwordField.type = "password";
      passwordButton.innerHTML = '<i class="bi bi-eye"></i>';
    }
  }

  function toggleNewConfirmationPasswordVisibility() {
    const passwordField = document.getElementById('confirmNewPassword');
    const passwordButton = document.getElementById('showNewPasswordButtonConfirmation');
    if (passwordField.type === "password") {
      passwordField.type = "text";
      passwordButton.innerHTML = '<i class="bi bi-eye-slash"></i>';
    } else {
      passwordField.type = "password";
      passwordButton.innerHTML = '<i class="bi bi-eye"></i>';
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const actualPasswordInput = document.getElementById('actualPassword');
    const confirmActualPasswordInput = document.getElementById('confirmPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    const submitButton = document.querySelector('input[type="submit"]');

    function validatePasswords() {
      if (actualPasswordInput.value !== confirmActualPasswordInput.value || newPasswordInput.value !== confirmNewPasswordInput.value || actualPasswordInput.value === newPasswordInput.value || actualPasswordInput.value === '' || confirmActualPasswordInput.value === '' || newPasswordInput.value === '' || confirmNewPasswordInput.value === '') {
        submitButton.disabled = true;
      } else {
        submitButton.disabled = false;
      }
    }

    // Add event listener to the input fields
    actualPasswordInput.addEventListener('input', validatePasswords);
    confirmActualPasswordInput.addEventListener('input', validatePasswords);
    newPasswordInput.addEventListener('input', validatePasswords);
    confirmNewPasswordInput.addEventListener('input', validatePasswords);

    // Initial validation in case the form is reloaded with data
    validatePasswords();

    // Add event listener to handle form submission
    document.getElementById('changeMasterPasswordForm').addEventListener('submit', (event) => {
      // Prevent form from submitting if passwords do not match or are empty
      if (actualPasswordInput.value !== confirmActualPasswordInput.value || newPasswordInput.value !== confirmNewPasswordInput.value || actualPasswordInput.value === newPasswordInput.value || actualPasswordInput.value === '' || confirmActualPasswordInput.value === '' || newPasswordInput.value === '' || confirmNewPasswordInput.value === '') {
        event.preventDefault();
      } else {
        // Prevent form from being submitted normally
        event.preventDefault();
        ipcRenderer.invoke('ipcChangeMasterPassword', actualPasswordInput.value, newPasswordInput.value)
        .then((response) => {
          if (response === 'password-changed-sucessfuly') {
            alert('Password has been changed successfully!');
            // send a message to the main process to load the passwords page
            ipcRenderer.send('update-passwords-page');
          } else {
            alert(response);
          }
        })
        .catch((error) => {
          // Handle error here
          console.error(error);
          alert('An error occurred. Please try again.');
        })
        .finally(() => {
          // Reset or unlock the form here
          actualPasswordInput.value = '';
          confirmActualPasswordInput.value = '';
          newPasswordInput.value = '';
          confirmNewPasswordInput.value = '';
        });
      }
    });
  });
}


// read the new database master password from the form
// and send it to the main process to check if it is correct
if (location.pathname.includes('openDatabase.html')) {
  document.getElementById('openDatabaseForm').addEventListener('submit', (event) => {
    event.preventDefault();
    
    // Get the master password from the form
    let masterPassword = document.getElementById('password').value;
    ipcRenderer.send('checkMasterPassword', masterPassword); 
  });
}

// auto fill the password field on addpass page 
if (location.pathname.includes('addpass.html')) {
  generateRandomPassword();
}


// receives the random password request and calls the function to generate the password
function generateRandomPassword() {
  ipcRenderer.invoke('getGeneratePasswordSize').then((generatePasswordSize) => {
    const recommendedPassword = generateRandomString(generatePasswordSize); // generate a random string with 
    document.getElementById('password').value = recommendedPassword;
  }); // Adicionado o parêntese de fechamento aqui.
}


// function to generate random password
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-={}[]|:;<>,.?~"*'; 
  let randomString = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }

  return randomString;
}

ipcRenderer.on('incorrect-password', () => {
  document.getElementById('error-message').style.display = 'block';
});


// button to unlock the database
if (location.pathname.includes('databaseLocked.html')) {
  document.getElementById('unlockForm').addEventListener('submit', (event) => {
    event.preventDefault(); // Impede o envio do formulário

    const password = document.getElementById('password').value;
    ipcRenderer.send('checkMasterPassword', password);
  });
}


// always update the title bar with the current database name
ipcRenderer.send('update-title-bar');


// send the database file path to the openDatabase.html page
if (location.pathname.includes('openDatabase.html')) {
  ipcRenderer.invoke('get-dbPath').then((dbPath) => {
    document.getElementById('databaseFile').textContent = dbPath;
  });
}



////// settings page //////

// check if we are in the settings page
if (location.pathname.includes('settings.html')) {
  // wait for the page to be loaded
  document.addEventListener('DOMContentLoaded', (event) => {
    // get the current settings from the main process
    ipcRenderer.invoke('getSettings').then((settings) => {
      // update these values on the settingsForm
      document.getElementById('flexSwitchCheckChecked').checked = settings.timerToLockEnabled;
      document.getElementById('autoLockTime').value = settings.timerToLock;
      document.getElementById('autoLockTimeUnit').value = settings.timerToLockUnit;
      document.getElementById('lockOnMinimizeSwitch').checked = settings.lockOnMinimize;
      document.getElementById('closeToTray').checked = settings.closeToTray;
      document.getElementById('generatePasswordSize').value = settings.generatePasswordSize;
    }).catch((error) => {
      console.error(error);
    });
  }); // this is the end of addEventListener

  // save the settings from the form to the json file
  document.getElementById('saveSettingsButton').addEventListener('click', () => {
  // Read current values from the form
  const timerToLockEnabled = document.getElementById('flexSwitchCheckChecked').checked;
  const timerToLock = parseInt(document.getElementById('autoLockTime').value);
  const timerToLockUnit = document.getElementById('autoLockTimeUnit').value;
  const lockOnMinimize = document.getElementById('lockOnMinimizeSwitch').checked;
  const closeToTray = document.getElementById('closeToTray').checked;
  const generatePasswordSize = parseInt(document.getElementById('generatePasswordSize').value);
  // Form an object to save
  const settings = {
    timerToLockEnabled,
    timerToLock,
    timerToLockUnit,
    lockOnMinimize,
    closeToTray,
    generatePasswordSize
  };
  
  // Send settings object to the main process
  ipcRenderer.send('saveSettings', settings);
  }); 


  // cancel the settings from the form to the json file
  document.getElementById('cancelSettingsButton').addEventListener('click', () => {
    ipcRenderer.send('closeSettings');
  }); // this is the end of addEventListener event cancelSettingsButton


} 



// fill the editpass form with the data from the selected register
if (location.pathname.includes('editpass.html')) {
  ipcRenderer.on('load-edit-page', (event, data) => {
    document.getElementById('id').value = data.id;
    document.getElementById('title').value = data.title;
    document.getElementById('username').value = data.username;
    document.getElementById('password').value = data.password;
    document.getElementById('URL').value = data.URL; 
    document.getElementById('notes').value = data.notes;
    document.getElementById('categoryDropdown').value = data.categoryId;

    // Add a delay before trying to select the value in the dropdown
    setTimeout(() => {
      const categoryDropdown = document.getElementById('categoryDropdown');
      if (categoryDropdown) {
        // read the categoryDropdown with JSON Stringify
        const options = categoryDropdown.options;
        // read the options with JSON Stringify
        if(options.length > 0){
          for (let i = 0; i < options.length; i++) {
            if (options[i].value === data.categoryId) {
              // read the options[i].value with JSON Stringify
              categoryDropdown.selectedIndex = i;
              break;
            }
          }
        } else {
        }
      } else {
        console.error("Element with id 'categoryDropdown' not found");
      }
    }, 0);  // The '0' value means "run this code as soon as all other scripts have finished running"
  });

  // After the page is loaded, add the click event to the 'Open URL' button
  document.getElementById('openURL').addEventListener('click', () => {
    // Gets the URL from the input field
    const url = document.getElementById('URL').value;

    // Checks if the URL starts with 'http://' or 'https://'
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Opens the URL in the user's default browser
      shell.openExternal(url);
    } else {
      // The URL is not valid
      console.error('Invalid URL:', url);
    }
  });
}