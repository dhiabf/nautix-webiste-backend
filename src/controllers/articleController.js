const { db } = require('../config/firebase');
const { verifyAdmin } = require('../middlewares/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const supabase = require('../config/supabase');

const getArticles = async (req, res) => {
  try {
    const snapshot = await db.ref('articles').once('value');
    const articles = snapshot.val() || {};

    // Convert RTDB object into an array
    const articleList = Object.keys(articles).map((id) => ({
      id,
      ...articles[id],
    }));

    res.json(articleList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getArticleById = async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.ref(`articles/${id}`).once('value');
    const article = snapshot.val();

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    res.json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addArticle = async (req, res) => {
  try {
    console.log('Received request to add a new article');
    console.log('Request body:', req.body); // Log the incoming request body

    // Log the uploaded files information
    if (req.files && req.files.length > 0) {
      console.log(`Received ${req.files.length} files for upload`);
      req.files.forEach((file, index) => {
        console.log(`File ${index + 1}: ${file.originalname} | Type: ${file.mimetype} | Size: ${file.size}`);
      });
    } else {
      console.log('No files were uploaded');
    }

    // Use upload.array('images', maxCount) for multiple file uploads
    upload.array('images', 5)(req, res, async (err) => {
      if (err) {
        console.error('Error during file upload:', err);
        return res.status(500).json({ error: 'Image upload failed' });
      }

      const { title, subtitle, text } = req.body;
      console.log('Received article details:');
      console.log('Title:', title);
      console.log('Subtitle:', subtitle);
      console.log('Text (first 100 characters):', text.substring(0, 100));

      if (!req.files || req.files.length === 0) {
        console.log('No images uploaded');
        return res.status(400).json({ error: 'No images uploaded' });
      }

      const imageUrls = [];
      const imagePaths = [];
      console.log('Starting image uploads to Supabase...');

      // Iterate over all uploaded files and upload them to Supabase
      for (const file of req.files) {
        const filePath = `articles/${Date.now()}_${file.originalname}`;
        console.log(`Uploading file: ${file.originalname} to path: ${filePath}`);

        // Upload each image to Supabase
        const { data, error } = await supabase.storage.from('article-images').upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false,
        });

        if (error) {
          console.error('Failed to upload image to Supabase:', error);
          return res.status(500).json({ error: `Failed to upload image ${file.originalname} to Supabase` });
        }

        // Get the public URL for each image
        const { data: publicUrlData } = supabase.storage.from('article-images').getPublicUrl(filePath);
        const publicURL = publicUrlData.publicUrl;
        if (!publicURL) {
          console.error('Failed to retrieve public URL for image:', file.originalname);
          return res.status(500).json({ error: `Failed to retrieve public URL for image ${file.originalname}` });
        }

        console.log(`Image uploaded successfully: ${publicURL}`);
        imageUrls.push(publicURL); // Store the public URLs of the images
        imagePaths.push(filePath); // Store the paths of the images for potential deletion
      }

      const newArticle = {
        title,
        subtitle,
        text,
        images: imageUrls, // Store the image URLs in the 'images' field
        createdAt: new Date().toISOString(),
      };

      console.log('Saving new article to the database:', newArticle);

      const articleRef = db.ref('articles').push();
      await articleRef.set(newArticle);

      console.log('Article added successfully with ID:', articleRef.key);

      res.json({
        message: 'Article added successfully',
        articleId: articleRef.key,
        images: imageUrls, // Return the uploaded image URLs in the response
      });
    });
  } catch (error) {
    console.error('Error processing article:', error);
    res.status(500).json({ error: error.message });
  }
};



const updateArticle = async (req, res) => {
  try {
    console.log("Starting article update...");

    // Handle image upload
    upload.single('image')(req, res, async (err) => {
      if (err) {
        console.error("Image upload failed:", err);
        return res.status(500).json({ error: 'Image upload failed' });
      }

      const { id } = req.params;
      const { title, subtitle, text, existingImages } = req.body; // We include existingImages
      console.log(`Received data for article ID ${id}: title=${title}, subtitle=${subtitle}, text=${text}`);

      // Validate required fields
      if (!title || !text || !subtitle) {
        console.error("Missing required fields. Title, subtitle, text, author, and category are required.");
        return res.status(400).json({ error: "Missing required fields. Title, subtitle, text, author, and category are required." });
      }

      const snapshot = await db.ref(`articles/${id}`).once('value');
      const existingArticle = snapshot.val();

      if (!existingArticle) {
        console.error(`Article with ID ${id} not found`);
        return res.status(404).json({ message: 'Article not found' });
      }

      let updatedArticle = {
        title,
        subtitle,
        text,
        createdAt: new Date().toISOString(),
      };

      // Handle new image upload if any
      if (req.file) {
        const newFilePath = `articles/${Date.now()}_${req.file.originalname}`;

        // Upload new image to Supabase
        const { data, error } = await supabase.storage.from('article-images').upload(newFilePath, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: false,
        });

        if (error) {
          console.error('Failed to upload image to Supabase:', error);
          return res.status(500).json({ error: 'Failed to upload image to Supabase' });
        }

        const { data: publicUrlData } = supabase.storage.from('article-images').getPublicUrl(newFilePath);
        const newPublicURL = publicUrlData.publicUrl;

        if (!newPublicURL) {
          console.error('Failed to retrieve new image URL');
          return res.status(500).json({ error: 'Failed to retrieve new image URL' });
        }

        // Add the new image URL to the images array
        updatedArticle.images = existingImages ? [...existingImages, newPublicURL] : [newPublicURL];

        // Delete old image if exists
        if (existingArticle.images) {
          // If you need to delete the old images, do it here
          existingArticle.images.forEach(async (oldImage) => {
            const { error } = await supabase.storage.from('article-images').remove([oldImage]);
            if (error) {
              console.error('❌ Error deleting old image from Supabase:', error);
            }
          });
        }
      } else {
        // If no new image, retain existing images
        updatedArticle.images = existingImages || existingArticle.images || [];
      }

      // Update article in Firebase
      console.log(`Updating article in Firebase at path: articles/${id}`);
      await db.ref(`articles/${id}`).update(updatedArticle);

      res.json({ message: 'Article updated successfully', updatedArticle });
    });
  } catch (error) {
    console.error("Error during article update:", error);
    res.status(500).json({ error: error.message });
  }
};



const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const snapshot = await db.ref(`articles/${id}`).once('value');
    const article = snapshot.val();

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    // Delete images from Supabase
    if (article.images && article.images.length > 0) {
      const filePaths = article.images.map((url) => {
        const pathParts = url.split('/');
        return `articles/${pathParts[pathParts.length - 1]}`;
      });

      const { error } = await supabase.storage.from('article-images').remove(filePaths);
      if (error) {
        console.error('Error deleting images from Supabase:', error);
      }
    }

    // Delete article from RTDB
    await db.ref(`articles/${id}`).remove();

    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
module.exports = { getArticles, getArticleById, addArticle, updateArticle, deleteArticle };
