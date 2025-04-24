const nodemailer = require('nodemailer');

const sendEmail = async (to, status) => {
  let transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: '"Event Payments" <your-email@gmail.com>',
    to,
    subject: 'Payment Status',
    text: `Your payment was ${status}.`,
  });
};

module.exports = sendEmail;
