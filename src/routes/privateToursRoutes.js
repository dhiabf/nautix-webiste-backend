const express = require('express');
const { getPrivateTours, getPrivateTourById, addPrivateTour, deletePrivateTour, updatePrivateTour } = require('../controllers/privateToursController');

const { verifyAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', getPrivateTours);
router.get('/:id', getPrivateTourById);
router.post('/', verifyAdmin, addPrivateTour);
router.delete('/:id', verifyAdmin, deletePrivateTour);
router.put('/:id', verifyAdmin, updatePrivateTour);

module.exports = router;
