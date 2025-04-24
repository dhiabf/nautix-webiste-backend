const express = require('express');
const { createPayment, webhookHandler } = require('../controllers/paymentController');

const router = express.Router();

router.post('/create-payment', createPayment);
router.get('/webhook', webhookHandler);

module.exports = router;
