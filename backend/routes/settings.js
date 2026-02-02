const express = require('express');
const { getDB } = require('../database');

const router = express.Router();

// Get all API keys (masked)
router.get('/', (req, res) => {
  const db = getDB();
  
  db.all('SELECT key_name, key_value FROM api_keys', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Mask the keys for security
    const maskedKeys = rows.reduce((acc, row) => {
      acc[row.key_name] = row.key_value ? '****' + row.key_value.slice(-4) : '';
      return acc;
    }, {});
    
    res.json(maskedKeys);
  });
});

// Update API keys
router.post('/', (req, res) => {
  const db = getDB();
  const keys = req.body;
  
  const promises = Object.entries(keys).map(([keyName, keyValue]) => {
    return new Promise((resolve, reject) => {
      if (!keyValue || keyValue.includes('****')) {
        // Skip if empty or masked value
        resolve();
        return;
      }
      
      db.run(
        `INSERT OR REPLACE INTO api_keys (key_name, key_value, updated_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [keyName, keyValue],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });
  
  Promise.all(promises)
    .then(() => {
      res.json({ message: 'API keys updated successfully' });
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
});

// Get actual key value (for internal use)
function getApiKey(keyName) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.get('SELECT key_value FROM api_keys WHERE key_name = ?', [keyName], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.key_value : process.env[keyName.toUpperCase()]);
    });
  });
}

module.exports = router;
module.exports.getApiKey = getApiKey;