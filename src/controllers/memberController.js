const { db } = require('../config/firebase');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const supabase = require('../config/supabase');

// Get all members
const getMembers = async (req, res) => {
  try {
    const snapshot = await db.ref('members').once('value');
    const members = snapshot.val() || {};

    // Convert to an array and filter null values
    const filteredMembers = Object.entries(members).map(([id, member]) => ({ id, ...member })).filter(member => member !== null);

    res.json(filteredMembers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add a new member
const addMember = async (req, res) => {
  upload.single('imgsrc')(req, res, async (err) => {
    if (err) {
      console.error("❌ Multer error:", err);
      return res.status(500).json({ error: "Image upload failed" });
    }

    try {
      const { name, description, role, additionalInfo } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
      }

      const filePath = `members/${Date.now()}_${req.file.originalname}`;

      // Upload image to Supabase
      const { data, error } = await supabase.storage.from('member-images').upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        console.error("❌ Supabase Upload Error:", error);
        return res.status(500).json({ error: "Failed to upload image to Supabase" });
      }

      // Get the public URL of the uploaded image
      const { data: publicURL } = supabase.storage.from('member-images').getPublicUrl(filePath);

      if (!publicURL || !publicURL.publicUrl) {
        console.error("❌ Public URL Error:", publicURL);
        return res.status(500).json({ error: "Failed to retrieve image URL" });
      }

      // Create member object
      const newMember = {
        name,
        description,
        role,
        additionalInfo,
        imgsrc: publicURL.publicUrl,
      };

      // Save to Firebase
      const memberRef = db.ref('members').push();
      await memberRef.set(newMember);

      res.json({ message: "Member added successfully", memberId: memberRef.key, imageUrl: publicURL.publicUrl });
    } catch (error) {
      console.error("❌ Unexpected Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
};


// Edit an existing member
const editMember = async (req, res) => {
  upload.single('imgsrc')(req, res, async (err) => {
    try {
      if (err) return res.status(500).json({ error: 'Image upload failed' });

      const { id } = req.params;
      const { name, description, role, additionalInfo } = req.body;

      if (!id) return res.status(400).json({ error: "Member ID is required." });

      const memberRef = db.ref(`members/${id}`);
      const snapshot = await memberRef.once('value');

      if (!snapshot.exists()) return res.status(404).json({ error: "Member not found." });

      let updatedMember = { name, description, role, additionalInfo };

      if (req.file) {
        const newFilePath = `members/${Date.now()}_${req.file.originalname}`;

        // Upload new image
        const { data, error } = await supabase.storage.from('member-images').upload(newFilePath, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: false,
        });

        if (error) return res.status(500).json({ error: 'Failed to upload new image to Supabase' });

        const newPublicURL = supabase.storage.from('member-images').getPublicUrl(newFilePath).data.publicUrl;
        if (!newPublicURL) return res.status(500).json({ error: 'Failed to retrieve new image URL' });

        updatedMember.imageUrl = newPublicURL;
        updatedMember.imagePath = newFilePath;

        // Delete old image from Supabase
        const oldImagePath = snapshot.val().imagePath;
        if (oldImagePath) {
          await supabase.storage.from('member-images').remove([oldImagePath]);
        }
      }

      await memberRef.update(updatedMember);

      res.json({ message: 'Member updated successfully', updatedMember });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

// Delete a member
const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ error: "Member ID is required." });

    const memberRef = db.ref(`members/${id}`);
    const snapshot = await memberRef.once('value');

    if (!snapshot.exists()) return res.status(404).json({ error: "Member not found." });

    // Delete image from Supabase if exists
    const { imagePath } = snapshot.val();
    if (imagePath) {
      await supabase.storage.from('member-images').remove([imagePath]);
    }

    await memberRef.remove();
    res.json({ message: "Member deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getMembers, addMember, editMember, deleteMember };
