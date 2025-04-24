const { auth } = require('../config/firebase');

const verifyAdmin = async (req, res, next) => {
  // Get the custom token from the Authorization header
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    // Step 1: Verify the custom token directly (this is the correct server-side way)
    const decodedToken = await auth.verifyIdToken(token); // Verify the custom token (which will return an ID token)
    
    // Step 2: Check if the user has admin privileges (you can add custom claims here)
    if (decodedToken.isAdmin) {
      req.user = decodedToken; // Attach user details to request object
      return next(); // Continue to the next middleware or route handler
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }
  } catch (error) {
    console.error('Error verifying Firebase custom token:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { verifyAdmin };
