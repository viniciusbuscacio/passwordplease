const { ipcRenderer } = require('electron');
const fs = require('fs');  // this module is used to allow access to the file system

// check if the last opened database file exists
window.onload = () => {
    ipcRenderer.invoke('checklastOpenedDatabaseFile')
      .then((fileExists) => {
        if (!fileExists) {
          // if the file does not exist, we hide the button
           document.getElementById('openLastDatabaseFileButton').style.display = 'none';
        } else {
          // if the file exists, we show the button
          document.getElementById('openLastDatabaseFileButton').style.display = '';
        }
      })
      .catch((error) => {
        console.error(error);
        // if there is an error, we hide the button
        document.getElementById('openLastDatabaseFileButton').style.display = 'none';
      });
  };
  


// open the last opened database file
document.getElementById('openLastDatabaseFileButton').addEventListener('click', function() {
    ipcRenderer.invoke('openLastDatabaseFile')
    .then(() => {

    })
    .catch((error) => {
        alert(error.message);
    });

});




