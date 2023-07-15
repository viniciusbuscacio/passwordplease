
// import necessary modules
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const assert = require('assert');
const CryptoJS = require('crypto-js');
const saltRounds = 12;

// initialize the mountKey variable
let mountKey = null;

// use a fixed iv for encrypting and decrypting the mountKey
const ivMountKey = crypto.randomBytes(32);

// create the mountKey key randomly
function createMountKey() {
  mountKey = crypto.randomBytes(32).toString('hex');
  updateMountKey(mountKey);
  return mountKey;
}

// function to get the mountKey
function getMountKey() {
    return mountKey;
}

// function to update the mountKey
function updateMountKey(newMountKey) {
    mountKey = newMountKey;
}

// use the mountKey to crypt the data
function encryptData(data, mountKey) {
  
  // Check if data is null
  if (data === null) {
    return null;
  }

  // Check if mountKey is null
  mountKey = getMountKey();
  if (mountKey === null) {
    return;
  }
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(mountKey, 'hex'), iv);
  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

// // use the mountKey to decrypt the data
// use the mountKey to decrypt the data
function decryptData(data, mountKey) {
  // Check if data is null
  if (data === null) {
    return "";
  }

  const textParts = data.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(mountKey, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// function to calculate the hash of the masterPassword
function hashMasterPassword(masterPassword) {
    const salt = bcrypt.genSaltSync(saltRounds);
    const hash = bcrypt.hashSync(masterPassword, salt);
    return hash;
}

// function to check if the masterPassword is correct
function checkMasterPassword(masterPassword, masterPasswordhash) {
    var check = bcrypt.compareSync(masterPassword, masterPasswordhash);
    if (check)
        return true;
    else
        return false;
}

// function to encrypt the mountKey with the user's password
function encryptMountKey(mountKey, masterPassword) {
    
    var ciphertext = CryptoJS.AES.encrypt(mountKey, masterPassword).toString();
    return ciphertext;
}

// function to decrypt the mountKey with the user's password
function decryptMountKey(encryptedMountKey, masterPassword) {
    var bytes = CryptoJS.AES.decrypt(encryptedMountKey, masterPassword);
    var originalText = bytes.toString(CryptoJS.enc.Utf8);
    
    return originalText;
}

// export the functions
module.exports = {
  createMountKey,
  encryptData,
  decryptData,
  encryptMountKey,
  decryptMountKey,
  hashMasterPassword,
  checkMasterPassword,
  getMountKey,
  updateMountKey
};

// tests
let tests = false;
if (tests) {   

    let mountKeyExample = createMountKey()

    let masterPassword = '123456';
    hashMasterPassword(masterPassword)

    let encryptedMountKey = encryptMountKey(mountKeyExample, masterPassword)

    let decryptedMountKey = decryptMountKey(encryptedMountKey, masterPassword)
    assert.strictEqual(mountKeyExample, decryptedMountKey, 'The decrypted mountKey does not match the original');

    let dados = "dados a serem criptografados";

    let encryptedData = encryptData(dados, mountKeyExample);

    let decryptedData = decryptData(encryptedData, mountKeyExample);
    assert.strictEqual(dados, decryptedData, 'The decrypted data does not match the original');
}
