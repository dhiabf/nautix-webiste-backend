const express = require('express');
const { getCoachingSessions, bookSession } = require('../controllers/coachingController');

const router = express.Router();

router.get('/sessions', getCoachingSessions);
router.post('/book', bookSession);

module.exports = router;
