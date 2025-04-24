const { db } = require('../config/firebase');

const getCoachingSessions = async (req, res) => {
  try {
    const snapshot = await db.ref('coaching_sessions').once('value');
    res.json(snapshot.val() || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const bookSession = async (req, res) => {
  try {
    const { user_email, session_id } = req.body;
    const sessionRef = db.ref(`coaching_sessions/${session_id}`);
    const sessionSnapshot = await sessionRef.once('value');
    const session = sessionSnapshot.val();

    if (!session || session.user_email) {
      return res.status(400).json({ message: 'Session already booked or does not exist' });
    }

    await sessionRef.update({ user_email, status: 'booked' });
    res.json({ message: 'Session booked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getCoachingSessions, bookSession };
