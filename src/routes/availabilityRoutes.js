const express = require('express');
const router = express.Router();
const {
  addAvailability,
  getAllAvailability,
  getAvailabilityByType,
  getUpcomingAvailability,
  updateAvailability,
  deleteAvailability
} = require('../controllers/availabilityController');


router.post('/', addAvailability);
router.get('/', getAllAvailability);
router.get('/type/:type', getAvailabilityByType);
router.get('/upcoming', getUpcomingAvailability);
router.put('/:id', updateAvailability);
router.delete('/:id', deleteAvailability);

module.exports = router;
