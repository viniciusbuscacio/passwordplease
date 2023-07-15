// post-build.js

// this script will delete all files in the build/dist folder except for the .exe file
const fs = require('fs');
const path = require('path');
const outputDirectory = path.resolve(__dirname, './build/dist');

fs.readdir(outputDirectory, (err, files) => {
  if (err) throw err;

  for (const file of files) {
    if (!/^passwordplease Setup.*\.exe$/.test(file)) {
      fs.rm(path.join(outputDirectory, file), { recursive: true }, (err) => {
        if (err) throw err;
      });
    }   
  }
});
