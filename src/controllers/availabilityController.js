const { db } = require('../config/firebase');

// 🔹 Add Availability
const addAvailability = async (req, res) => {
  try {
    const { date, startTime, endTime, type,available_spots } = req.body;

    if (!date || !startTime || !endTime || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newSlot = {
      date,
      startTime,
      endTime,
      type, // "private_tour" or "coaching_session"
      isBooked: false,
      createdAt: Date.now(),
      available_spots

    };

    const ref = db.ref('availability').push();
    await ref.set(newSlot);

    res.json({ message: 'Availability added', id: ref.key });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Get All Availabilities
const getAllAvailability = async (req, res) => {
  try {
    const snapshot = await db.ref('availability').once('value');
    res.json(snapshot.val() || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Get Availability by Type
const getAvailabilityByType = async (req, res) => {
  try {
    const { type } = req.params; // "private_tour" or "coaching_session"
    const snapshot = await db.ref('availability').once('value');
    const all = snapshot.val() || {};

    const filtered = Object.entries(all).filter(([_, v]) => v.type === type);
    res.json(Object.fromEntries(filtered));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Get Upcoming Availability (after today)
const getUpcomingAvailability = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const snapshot = await db.ref('availability').once('value');
    const all = snapshot.val() || {};

    const upcoming = Object.entries(all).filter(([_, v]) => v.date >= today);
    res.json(Object.fromEntries(upcoming));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Edit Availability
const updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const snapshot = await db.ref(`availability/${id}`).once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ message: 'Availability not found' });
    }

    await db.ref(`availability/${id}`).update(updateData);
    res.json({ message: 'Availability updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Delete Availability
const deleteAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    const snapshot = await db.ref(`availability/${id}`).once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ message: 'Availability not found' });
    }

    await db.ref(`availability/${id}`).remove();
    res.json({ message: 'Availability deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  addAvailability,
  getAllAvailability,
  getAvailabilityByType,
  getUpcomingAvailability,
  updateAvailability,
  deleteAvailability
};
