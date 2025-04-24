const { db } = require('../config/firebase');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const supabase = require('../config/supabase');

const getPrivateTours = async (req, res) => {
  try {
    const snapshot = await db.ref('private_tours').once('value');
    res.json(snapshot.val() || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPrivateTourById = async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.ref(`private_tours/${id}`).once('value');
    const tour = snapshot.val();

    if (!tour) {
      return res.status(404).json({ message: 'Private tour not found' });
    }

    res.json(tour);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addPrivateTour = async (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      return res.status(500).json({ error: 'Image upload failed' });
    }

    try {
      console.log("Received request body:", req.body);

      const { title, description, location, type, minPeople, maxPeople, startingPrice } = req.body;

      if (!req.file) {
        console.error("No image uploaded.");
        return res.status(400).json({ error: 'No image uploaded' });
      }

      console.log("File uploaded:", req.file.originalname);

      const filePath = `private_tours/${Date.now()}_${req.file.originalname}`;

      console.log("Uploading image to Supabase:", filePath);

      const { error: uploadError } = await supabase.storage.from('tour-images').upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return res.status(500).json({ error: 'Failed to upload image to Supabase' });
      }

      // Corrected: Get the actual public URL
      const publicUrl = supabase.storage.from('tour-images').getPublicUrl(filePath).data.publicUrl;

      if (!publicUrl) {
        console.error("Supabase URL retrieval error");
        return res.status(500).json({ error: 'Failed to retrieve image URL' });
      }

      console.log("Image successfully uploaded. Public URL:", publicUrl);

      const newTour = {
        title,
        description,
        location,
        type,
        min_ppl_nb: Number(minPeople),
        max_ppl_nb: Number(maxPeople),
        starting_price: Number(startingPrice),
        imageUrl: publicUrl,
        imagePath: filePath,
      };

      console.log("Saving to Firebase RTDB:", newTour);

      const tourRef = db.ref('private_tours').push();
      await tourRef.set(newTour);

      console.log("Private tour added successfully with ID:", tourRef.key);

      res.json({ message: 'Private tour added successfully', tourId: tourRef.key, imageUrl: publicUrl });

    } catch (error) {
      console.error("Error adding private tour:", error);
      res.status(500).json({ error: error.message });
    }
  });
};

const deletePrivateTour = async (req, res) => {
  try {
    const { id } = req.params;

    const snapshot = await db.ref(`private_tours/${id}`).once('value');
    const tour = snapshot.val();

    if (!tour) {
      return res.status(404).json({ message: 'Private tour not found' });
    }

    if (tour.imagePath) {
      await supabase.storage.from('tour-images').remove([tour.imagePath]);
    }

    await db.ref(`private_tours/${id}`).remove();
    res.json({ message: 'Private tour deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updatePrivateTour = async (req, res) => {
  try {
    // Handle file upload manually before processing other data
    upload.single('image')(req, res, async (err) => {
      if (err) {
        return res.status(500).json({ error: 'Image upload failed' });
      }

      const { id } = req.params;
      const snapshot = await db.ref(`private_tours/${id}`).once('value');
      const existingTour = snapshot.val();

      if (!existingTour) {
        return res.status(404).json({ message: 'Private tour not found' });
      }

      // Ensure only defined values are included
      let updatedTour = {};
      if (req.body.title !== undefined) updatedTour.title = req.body.title;
      if (req.body.description !== undefined) updatedTour.description = req.body.description;
      if (req.body.location !== undefined) updatedTour.location = req.body.location;
      if (req.body.type !== undefined) updatedTour.type = req.body.type;
      if (req.body.min_ppl_nb !== undefined) updatedTour.min_ppl_nb = Number(req.body.min_ppl_nb);
      if (req.body.max_ppl_nb !== undefined) updatedTour.max_ppl_nb = Number(req.body.max_ppl_nb);
      if (req.body.starting_price !== undefined) updatedTour.starting_price = Number(req.body.starting_price);

      console.log("Updating private tour:", updatedTour);

      // Handle image upload if a new image is provided
      if (req.file) {
        const newFilePath = `private_tours/${Date.now()}_${req.file.originalname}`;
        console.log("Uploading image to Supabase:", newFilePath);

        const { error: uploadError } = await supabase.storage.from('tour-images').upload(newFilePath, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: false,
        });

        if (uploadError) {
          console.error("Supabase Upload Error:", uploadError);
          return res.status(500).json({ error: 'Failed to upload image to Supabase' });
        }

        const { publicUrl } = supabase.storage.from('tour-images').getPublicUrl(newFilePath);
        if (!publicUrl) {
          console.error("Supabase URL retrieval error");
          return res.status(500).json({ error: 'Failed to retrieve new image URL' });
        }

        updatedTour.imageUrl = publicUrl;
        updatedTour.imagePath = newFilePath;

        // Delete old image from storage if it exists
        if (existingTour.imagePath) {
          console.log("Removing old image from Supabase:", existingTour.imagePath);
          await supabase.storage.from('tour-images').remove([existingTour.imagePath]);
        }
      }

      if (Object.keys(updatedTour).length === 0) {
        return res.status(400).json({ error: "No valid fields provided for update" });
      }

      // Update the private tour in Firebase
      await db.ref(`private_tours/${id}`).update(updatedTour);
      res.json({ message: 'Private tour updated successfully', updatedTour });
    });

  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ error: error.message });
  }
};


module.exports = { getPrivateTours, getPrivateTourById, addPrivateTour, deletePrivateTour, updatePrivateTour };