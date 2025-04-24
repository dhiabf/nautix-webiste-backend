const express = require('express');
const {
  getMerchandise,
  getMerchandiseById,
  addMerchandise,
  deleteMerchandise,
  updateMerchandise,
} = require('../controllers/merchandiseController');
const { verifyAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', getMerchandise);
router.get('/:id', getMerchandiseById);
router.post('/', verifyAdmin, addMerchandise);
router.delete('/:id', verifyAdmin, deleteMerchandise);
router.put('/:id', verifyAdmin, updateMerchandise);

module.exports = router;
