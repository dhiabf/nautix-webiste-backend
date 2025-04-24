const nodemailer = require('nodemailer');
const { db } = require('../config/firebase');

// Create a safe path for the email by replacing special characters
const getSafeEmailPath = (email) => {
  return email.replace(/[.#$[\]]/g, '_'); // Replace problematic characters with an underscore
};

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Subscribe User to Newsletter
const subscribeUser = async (email) => {
  const safeEmail = getSafeEmailPath(email);  // Get a safe email path
  const userRef = db.ref('newsletterSubscribers').child(safeEmail);  // Use safe email path for Firebase

  const snapshot = await userRef.once('value');  // Retrieve the data

  if (snapshot.exists()) {
    throw new Error('Email already subscribed.');
  }

  // Save new subscription
  await userRef.set({ email });
  return { message: 'Successfully subscribed!' };
};

// Send Newsletter to All Subscribers
// Send Newsletter to All Subscribers
const sendNewsletter = async (subject, content) => {
    const snapshot = await db.ref('newsletterSubscribers').once('value');  // Access the subscribers' data
    const emails = [];
    snapshot.forEach((childSnapshot) => {
      emails.push(childSnapshot.val().email);  // Collect all email addresses
    });
  
    if (emails.length === 0) {
      throw new Error('No subscribers found.');
    }
  
    // Send the email to all collected email addresses with HTML content
    await transporter.sendMail({
      from: `"Newsletter" <${process.env.EMAIL_USER}>`,
      to: emails.join(','),
      subject,
      html: content, // Use `html` to send the email as HTML content
    });
  
    return { message: 'Newsletter sent successfully!' };
  };
  

module.exports = { subscribeUser, sendNewsletter };
