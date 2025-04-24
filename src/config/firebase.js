const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:   process.env.databaseURL,
});

const db = admin.database();
const auth = admin.auth();

module.exports = { db, auth };
