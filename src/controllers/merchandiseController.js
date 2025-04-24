const { db } = require('../config/firebase');
const { verifyAdmin } = require('../middlewares/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const supabase = require('../config/supabase');

// Get all merchandise
const getMerchandise = async (req, res) => {
  try {
    const snapshot = await db.ref('merchandise').once('value');
    res.json(snapshot.val() || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get merchandise by ID
const getMerchandiseById = async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.ref(`merchandise/${id}`).once('value');
    const merchandise = snapshot.val();

    if (!merchandise) {
      return res.status(404).json({ message: 'Merchandise not found' });
    }

    res.json(merchandise);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addMerchandise = async (req, res) => {
  try {
    upload.single('image')(req, res, async (err) => {
      if (err) {
        return res.status(500).json({ error: 'Image upload failed' });
      }

      const { name, price, quantity, available } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }

      const filePath = `merchandise/${Date.now()}_${req.file.originalname}`;

      const { error } = await supabase.storage.from('merchandise-images').upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        return res.status(500).json({ error: 'Failed to upload image to Supabase' });
      }

      // Correctly retrieve public URL
      const publicURL = supabase.storage.from('merchandise-images').getPublicUrl(filePath);

      if (!publicURL) {
        return res.status(500).json({ error: 'Failed to retrieve image public URL' });
      }

      const newMerchandise = {
        name,
        price: parseFloat(price),
        quantity: parseInt(quantity, 10),
        available: available === 'true',
        imageUrl: publicURL.data.publicUrl,
        imagePath: filePath, // Store image path for deletion purposes
      };

      const merchandiseRef = db.ref('merchandise').push();
      await merchandiseRef.set(newMerchandise);

      res.json({ message: 'Merchandise added successfully', merchandiseId: merchandiseRef.key, imageUrl: publicURL });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Delete merchandise
const deleteMerchandise = async (req, res) => {
  try {
    const { id } = req.params;

    const snapshot = await db.ref(`merchandise/${id}`).once('value');
    const merchandise = snapshot.val();

    if (!merchandise) {
      return res.status(404).json({ message: 'Merchandise not found' });
    }

    if (merchandise.imagePath) {
      const { error } = await supabase.storage.from('merchandise-images').remove([merchandise.imagePath]);
      if (error) {
        console.error('❌ Error deleting image from Supabase:', error);
      }
    }

    await db.ref(`merchandise/${id}`).remove();

    res.json({ message: 'Merchandise deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update merchandise
const updateMerchandise = async (req, res) => {
  try {
    upload.single('image')(req, res, async (err) => {
      if (err) {
        return res.status(500).json({ error: 'Image upload failed' });
      }

      const { id } = req.params;
      let { name, price, quantity, available } = req.body;

      const snapshot = await db.ref(`merchandise/${id}`).once('value');
      const existingMerchandise = snapshot.val();

      if (!existingMerchandise) {
        return res.status(404).json({ message: 'Merchandise not found' });
      }

      // Ensure price and quantity are valid numbers
      price = price && !isNaN(price) ? parseFloat(price) : existingMerchandise.price;
      quantity = quantity && !isNaN(quantity) ? parseInt(quantity, 10) : existingMerchandise.quantity;

      let updatedMerchandise = {
        name: name || existingMerchandise.name,
        price,
        quantity,
        available: available !== undefined ? available === 'true' : existingMerchandise.available,
      };

      if (req.file) {
        const newFilePath = `merchandise/${Date.now()}_${req.file.originalname}`;

        const { error } = await supabase.storage.from('merchandise-images').upload(newFilePath, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: false,
        });

        if (error) {
          return res.status(500).json({ error: 'Failed to upload image to Supabase' });
        }

        const { publicUrl } = supabase.storage.from('merchandise-images').getPublicUrl(newFilePath);

        updatedMerchandise.imageUrl = publicUrl;
        updatedMerchandise.imagePath = newFilePath;

        if (existingMerchandise.imagePath) {
          const { error } = await supabase.storage.from('merchandise-images').remove([existingMerchandise.imagePath]);
          if (error) {
            console.error('❌ Error deleting old image from Supabase:', error);
          }
        }
      }

      await db.ref(`merchandise/${id}`).update(updatedMerchandise);

      res.json({ message: 'Merchandise updated successfully', updatedMerchandise });
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ error: error.message });
  }
};


module.exports = { getMerchandise, getMerchandiseById, addMerchandise, deleteMerchandise, updateMerchandise };
