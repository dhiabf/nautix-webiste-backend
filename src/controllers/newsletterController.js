const newsletterService = require('../services/newsletterService');

const subscribe = async (req, res) => {
  try {
    // Log the incoming request body for debugging
    console.log('Received subscribe request:', req.body);

    const { email } = req.body;

    // Validate the email
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if the email format is valid
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Call the service to subscribe the user
    const response = await newsletterService.subscribeUser(email);
    
    // Send success response
    res.status(200).json({ message: 'Successfully subscribed', data: response });
  } catch (error) {
    // Log the error for debugging
    console.error('Error in subscribe controller:', error);

    // Send error response
    res.status(400).json({ error: error.message });
  }
};

const sendNewsletter = async (req, res) => {
    try {
      console.log('Received sendNewsletter request:', req.body);
      const { subject, content } = req.body;
  
      if (!subject || !content) {
        return res.status(400).json({ error: 'Subject and content are required' });
      }
  
      // Ensure content is treated as HTML
      const response = await newsletterService.sendNewsletter(subject, content);
  
      res.status(200).json({ message: 'Newsletter sent successfully', data: response });
    } catch (error) {
      console.error('Error in sendNewsletter controller:', error);
      res.status(400).json({ error: error.message });
    }
  };
  

module.exports = { subscribe, sendNewsletter };
