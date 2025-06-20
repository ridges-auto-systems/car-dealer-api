const express = require('express');

const router = express.Router();

// Basic auth routes (we'll expand these later)
router.get('/me', (req, res) => {
  res.json({
    message: 'Authentication endpoint - coming soon!',
    company: 'Rides Automotors',
  });
});

router.post('/login', (req, res) => {
  res.json({
    message: 'Login endpoint - coming soon!',
    company: 'Rides Automotors',
  });
});

module.exports = router;
