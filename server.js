const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import Routes
const eventRoutes = require('./src/routes/eventRoutes');
const articleRoutes = require('./src/routes/articleRoutes');
const memberRoutes = require('./src/routes/memberRoutes');
const coachingRoutes = require('./src/routes/coachingRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const payementRoutes = require('./src/routes/payementRoutes');
const merchandiseRoutes = require('./src/routes/merchandiseRoutes');
const privateToursRoutes = require('./src/routes/privateToursRoutes');
const newsletterRoutes = require('./src/routes/newsletterRoutes'); // ✅ Add Newsletter Routes
const availabilityRoutes = require('./src/routes/availabilityRoutes'); // ✅ Add this line


const app = express();
const port = process.env.PORT || 3004;

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'],  // Allow Authorization header
  credentials: true,  // Allow credentials (cookies, sessions)
};
const allowedOrigins = [
  'http://localhost:3000',                 // for local dev
  'https://nautix-trek.web.app',           // deployed frontend
];

app.use(cors(corsOptions));  // Use the customized CORS middleware
app.use(express.json());

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/coaching', coachingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payement', payementRoutes);
app.use('/api/merchandise', merchandiseRoutes);
app.use('/api/private-tours', privateToursRoutes);
app.use('/api/newsletter', newsletterRoutes); // ✅ Add Newsletter API
app.use('/api/availability', availabilityRoutes); // ✅ Add this line



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
