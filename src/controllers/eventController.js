const { db } = require('../config/firebase');
const { verifyAdmin } = require('../middlewares/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const supabase = require('../config/supabase');

const getEvents = async (req, res) => {
  try {
    const snapshot = await db.ref('events').once('value');
    res.json(snapshot.val() || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.ref(`events/${id}`).once('value');
    const event = snapshot.val();

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addEvent = async (req, res) => {
  try {
    upload.single('image')(req, res, async (err) => {
      if (err) {
        return res.status(500).json({ error: 'Image upload failed' });
      }

      const { title, description, location, tag, ageLimit, availableSpots, difficulty, eventDate } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }

      const filePath = `events/${Date.now()}_${req.file.originalname}`;

      const { data, error } = await supabase.storage.from('event-images').upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        return res.status(500).json({ error: 'Failed to upload image to Supabase' });
      }

      const { data: publicUrlData } = supabase.storage.from('event-images').getPublicUrl(filePath);
      const publicURL = publicUrlData.publicUrl;

      if (!publicURL) {
        return res.status(500).json({ error: 'Public URL is undefined or empty' });
      }

      const newEvent = {
        title,
        description,
        location,
        tag,
        ageLimit,
        availableSpots,
        difficulty,
        eventDate,
        imageUrl: publicURL,
        imagePath: filePath, // Store image path for deletion purposes
      };

      const eventRef = db.ref('events').push();
      await eventRef.set(newEvent);

      res.json({ message: 'Event added successfully', eventId: eventRef.key, imageUrl: publicURL });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const snapshot = await db.ref(`events/${id}`).once('value');
    const event = snapshot.val();

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Delete image from Supabase
    if (event.imagePath) {
      const { error } = await supabase.storage.from('event-images').remove([event.imagePath]);
      if (error) {
        console.error('❌ Error deleting image from Supabase:', error);
      }
    }

    // Delete event from Firebase
    await db.ref(`events/${id}`).remove();

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    upload.single('image')(req, res, async (err) => {
      if (err) {
        return res.status(500).json({ error: 'Image upload failed' });
      }

      const { id } = req.params;
      const { title, description, location, tag, ageLimit, availableSpots, difficulty, eventDate } = req.body;

      const snapshot = await db.ref(`events/${id}`).once('value');
      const existingEvent = snapshot.val();

      if (!existingEvent) {
        return res.status(404).json({ message: 'Event not found' });
      }

      let updatedEvent = {
        title,
        description,
        location,
        tag,
        ageLimit,
        availableSpots,
        difficulty,
        eventDate,
      };

      if (req.file) {
        const newFilePath = `events/${Date.now()}_${req.file.originalname}`;

        // Upload new image
        const { data, error } = await supabase.storage.from('event-images').upload(newFilePath, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: false,
        });

        if (error) {
          return res.status(500).json({ error: 'Failed to upload image to Supabase' });
        }

        const { data: publicUrlData } = supabase.storage.from('event-images').getPublicUrl(newFilePath);
        const newPublicURL = publicUrlData.publicUrl;

        if (!newPublicURL) {
          return res.status(500).json({ error: 'Failed to retrieve new image URL' });
        }

        updatedEvent.imageUrl = newPublicURL;
        updatedEvent.imagePath = newFilePath;

        // Delete old image if exists
        if (existingEvent.imagePath) {
          const { error } = await supabase.storage.from('event-images').remove([existingEvent.imagePath]);
          if (error) {
            console.error('❌ Error deleting old image from Supabase:', error);
          }
        }
      }

      // Update event in Firebase
      await db.ref(`events/${id}`).update(updatedEvent);

      res.json({ message: 'Event updated successfully', updatedEvent });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getEvents, getEventById, addEvent, deleteEvent, updateEvent };
