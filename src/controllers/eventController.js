const { db } = require('../config/firebase');
const multer = require('multer');
const supabase = require('../config/supabase');
const path = require('path');

// Configure multer for multiple file uploads
const upload = multer({ storage: multer.memoryStorage() });

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
  upload.fields([
    { name: 'media', maxCount: 10 },
    { name: 'imageUrl', maxCount: 1 },
  ])(req, res, async (err) => {
    try {
      if (err) return res.status(500).json({ error: 'Media upload failed' });

      const { title, description, location, tag, ageLimit, availableSpots, difficulty, eventDate } = req.body;

      // Validate files
      if (!req.files || !req.files.media || req.files.media.length === 0) {
        return res.status(400).json({ error: 'No media uploaded' });
      }

      const media = [];
      for (const file of req.files.media) {
        const fileType = file.mimetype.startsWith('video') ? 'video' : 'image';
        const filePath = `events/${Date.now()}_${file.originalname}`;

        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) return res.status(500).json({ error: 'Failed to upload media to Supabase' });

        const { data: publicUrlData } = supabase.storage.from('event-images').getPublicUrl(filePath);
        media.push({ url: publicUrlData.publicUrl, path: filePath, type: fileType });
      }

      let thumbnailUrl = '';
      if (req.files.imageUrl && req.files.imageUrl[0]) {
        const thumbnail = req.files.imageUrl[0];
        const thumbnailPath = `thumbnails/${Date.now()}_${thumbnail.originalname}`;

        const { error: thumbUploadError } = await supabase.storage
          .from('event-images')
          .upload(thumbnailPath, thumbnail.buffer, {
            contentType: thumbnail.mimetype,
            cacheControl: '3600',
            upsert: false,
          });

        if (thumbUploadError) return res.status(500).json({ error: 'Failed to upload thumbnail to Supabase' });

        const { data: thumbUrlData } = supabase.storage.from('event-images').getPublicUrl(thumbnailPath);
        thumbnailUrl = thumbUrlData.publicUrl;
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
        imageUrl: thumbnailUrl,
        media,
      };

      const eventRef = db.ref('events').push();
      await eventRef.set(newEvent);

      res.json({ message: 'Event added successfully', eventId: eventRef.key, media, thumbnailUrl });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });
};


const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.ref(`events/${id}`).once('value');
    const event = snapshot.val();

    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Delete all media from Supabase
    if (event.media && Array.isArray(event.media)) {
      const pathsToDelete = event.media.map((m) => m.path);
      const { error } = await supabase.storage.from('event-images').remove(pathsToDelete);
      if (error) console.error('❌ Error deleting media:', error);
    }

    await db.ref(`events/${id}`).remove();
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateEvent = async (req, res) => {
  upload.array('media')(req, res, async (err) => {
    try {
      if (err) return res.status(500).json({ error: 'Media upload failed' });

      const { id } = req.params;
      const { title, description, location, tag, ageLimit, availableSpots, difficulty, eventDate } = req.body;

      const snapshot = await db.ref(`events/${id}`).once('value');
      const existingEvent = snapshot.val();

      if (!existingEvent) return res.status(404).json({ message: 'Event not found' });

      const updatedEvent = {
        title,
        description,
        location,
        tag,
        ageLimit,
        availableSpots,
        difficulty,
        eventDate,
      };

      if (req.files && req.files.length > 0) {
        // Delete old media
        if (existingEvent.media && Array.isArray(existingEvent.media)) {
          const pathsToDelete = existingEvent.media.map((m) => m.path);
          const { error } = await supabase.storage.from('event-images').remove(pathsToDelete);
          if (error) console.error('❌ Error deleting old media:', error);
        }

        const media = [];

        for (const file of req.files) {
          const extension = path.extname(file.originalname).toLowerCase();
          const fileType = file.mimetype.startsWith('video') ? 'video' : 'image';
          const filePath = `events/${Date.now()}_${file.originalname}`;

          const { error: uploadError } = await supabase.storage
            .from('event-images')
            .upload(filePath, file.buffer, {
              contentType: file.mimetype,
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) return res.status(500).json({ error: 'Failed to upload media' });

          const { data: publicUrlData } = supabase.storage.from('event-images').getPublicUrl(filePath);
          media.push({ url: publicUrlData.publicUrl, path: filePath, type: fileType });
        }

        updatedEvent.media = media;
      }

      await db.ref(`events/${id}`).update(updatedEvent);
      res.json({ message: 'Event updated successfully', updatedEvent });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

module.exports = {
  getEvents,
  getEventById,
  addEvent,
  deleteEvent,
  updateEvent,
};
