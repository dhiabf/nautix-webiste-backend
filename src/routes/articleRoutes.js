const express = require('express');
const {
  getArticles,
  getArticleById,
  addArticle,
  updateArticle,
  deleteArticle,
} = require('../controllers/articleController');
const { verifyAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', getArticles); // Get all articles
router.get('/:id', getArticleById); // Get article by ID

// Protected routes (Admin only)
router.post('/', verifyAdmin, addArticle); // Add a new article
router.put('/:id', verifyAdmin, updateArticle); // Update an article by ID
router.delete('/:id', verifyAdmin, deleteArticle); // Delete an article by ID

module.exports = router;
