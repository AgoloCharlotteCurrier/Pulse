const express = require('express');
const { getDB } = require('../database');

const router = express.Router();

// Get all search runs (list for history page)
router.get('/', (req, res) => {
  const db = getDB();
  
  db.all(`
    SELECT 
      id, 
      topic, 
      time_range, 
      created_at,
      (SELECT COUNT(*) FROM raw_posts WHERE search_run_id = search_runs.id) as post_count
    FROM search_runs 
    ORDER BY created_at DESC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(rows);
  });
});

// Get specific search run details
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDB();
  
  db.get(`
    SELECT id, topic, time_range, raw_results, synthesis, created_at
    FROM search_runs 
    WHERE id = ?
  `, [id], (err, run) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!run) {
      return res.status(404).json({ error: 'Search run not found' });
    }
    
    // Get associated posts
    db.all(`
      SELECT source, title, content, author, date, engagement_metrics, url
      FROM raw_posts 
      WHERE search_run_id = ?
      ORDER BY date DESC
    `, [id], (err, posts) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Parse JSON fields
      let rawResults = [];
      let synthesis = null;
      
      try {
        rawResults = run.raw_results ? JSON.parse(run.raw_results) : posts;
        synthesis = run.synthesis ? JSON.parse(run.synthesis) : null;
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        rawResults = posts;
      }
      
      res.json({
        id: run.id,
        topic: run.topic,
        timeRange: run.time_range,
        createdAt: run.created_at,
        posts: rawResults,
        synthesis,
        totalPosts: posts.length
      });
    });
  });
});

// Delete a search run
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDB();
  
  db.serialize(() => {
    // Delete posts first (foreign key constraint)
    db.run('DELETE FROM raw_posts WHERE search_run_id = ?', [id]);
    
    // Delete the search run
    db.run('DELETE FROM search_runs WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Search run not found' });
      }
      
      res.json({ message: 'Search run deleted successfully' });
    });
  });
});

module.exports = router;