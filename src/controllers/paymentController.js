const axios = require('axios');

const createPayment = async (req, res) => {
  const { amount, email, firstName, lastName, phoneNumber, orderId } = req.body;

  try {
    const response = await axios.post('https://api.konnect.network/api/v2/payments/init-payment', {
      receiverWalletId: process.env.KONNECT_WALLET_ID,
      amount,
      token: 'TND',
      type: 'immediate',
      description: 'Event Payment',
      acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'],
      lifespan: 10,
      checkoutForm: true,
      addPaymentFeesToAmount: true,
      firstName,
      lastName,
      phoneNumber,
      email,
      orderId,
      webhook: process.env.KONNECT_WEBHOOK_URL,
      successUrl: 'https://your-site.com/success',
      failUrl: 'https://your-site.com/failure',
    }, {
      headers: { 'x-api-key': process.env.KONNECT_API_KEY }
    });

    res.json({ paymentUrl: response.data.payUrl, paymentRef: response.data.paymentRef });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const webhookHandler = async (req, res) => {
  const { payment_ref } = req.query;
  try {
    const response = await axios.get(`https://api.konnect.network/api/v2/payments/${payment_ref}`, {
      headers: { 'x-api-key': process.env.KONNECT_API_KEY },
    });

    console.log('Payment Status:', response.data.payment.status);
    res.status(200).send('Webhook received');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createPayment, webhookHandler };
