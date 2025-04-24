const express = require('express');
const { getEvents, getEventById, addEvent, deleteEvent, updateEvent } = require('../controllers/eventController');
const { verifyAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', getEvents);
router.get('/:id', getEventById);
router.post('/', verifyAdmin, addEvent);
router.delete('/:id', verifyAdmin, deleteEvent);
router.put('/:id', verifyAdmin, updateEvent);

module.exports = router;
