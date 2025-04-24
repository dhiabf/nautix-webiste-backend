const { auth } = require('../config/firebase');

const loginAdmin = async (req, res) => {
  const { email, password } = req.body; // Assuming password-based login
  try {
    // Authenticate user
    const userRecord = await auth.getUserByEmail(email);

    if (userRecord.customClaims?.isAdmin) {
      // Sign in the user and get an ID token
      const user = await auth.createCustomToken(userRecord.uid); // Custom token

      return res.status(200).json({ customToken: user });
    }
    
    return res.status(403).json({ message: 'Unauthorized' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { loginAdmin };
