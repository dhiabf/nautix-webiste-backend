const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://nautix-trek-default-rtdb.europe-west1.firebasedatabase.app',
});

const db = admin.database();
const auth = admin.auth();

module.exports = { db, auth };
