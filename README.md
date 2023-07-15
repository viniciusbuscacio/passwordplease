# passwordPlease

**A very simple ElectronJS app password manager.**

passwordPlease is a desktop application built with Electron.js that provides a secure and efficient way to store and manage your passwords.

This project is in its initial stages and is free to use. However, please be aware that it comes with no warranty. While every effort has been made to create a secure application, the author takes no responsibility for any consequences arising from its use.

It's also important to note that if you create a master password and forget it, the data encrypted by the program will not be recoverable. Please make sure to remember your master password!

**Application Structure**

- `package.json` - Points to the app's main file and lists its details and dependencies.
- `main.js` - Starts the app and creates a browser window to render HTML. This is the app's **main process**.
- `index.html` - A web page to render. This is the app's **renderer process**.
- `preload.js` - A content script that runs before the renderer process loads.

## To Use

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/viniciusbuscacio/passwordPlease
# Go into the repository
cd passwordPlease
# Install dependencies
npm install
# Run the app
npm start
```
## Windows Installer

If you just want to install the application, you can download the Windows installer [here](https://github.com/viniciusbuscacio/passwordplease/releases/).

## Electron JS

As this project is based on the [Electron Quick Start](https://github.com/electron/electron-quick-start), you can use it as a reference.

You can learn more about each of these components in depth within the [Tutorial](https://electronjs.org/docs/latest/tutorial/tutorial-prerequisites).

## Resources for Learning Electron

- [electronjs.org/docs](https://electronjs.org/docs) - all of Electron's documentation
- [Electron Fiddle](https://electronjs.org/fiddle) - Electron Fiddle, an app to test small Electron experiments


## License

[CC0 1.0 (Public Domain)](LICENSE.md)
