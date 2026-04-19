import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all fields
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query;
    
    if (req.user.role === 'admin') {
      query = `
        SELECT f.*, u.name as agent_name
        FROM fields f
        LEFT JOIN users u ON f.assigned_agent_id = u.id
        ORDER BY f.created_at DESC
      `;
    } else {
      query = `
        SELECT f.*, u.name as agent_name
        FROM fields f
        LEFT JOIN users u ON f.assigned_agent_id = u.id
        WHERE f.assigned_agent_id = ${req.user.id}
        ORDER BY f.created_at DESC
      `;
    }
    
    const result = await pool.query(query);
    
    // Add simple status calculation
    const fieldsWithStatus = result.rows.map(field => {
      let status = 'Active';
      if (field.current_stage === 'Ready' || field.current_stage === 'Harvested') {
        status = 'Completed';
      }
      return { ...field, status };
    });
    
    res.json(fieldsWithStatus);
  } catch (error) {
    console.error('GET /fields error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create field - SIMPLIFIED WORKING VERSION
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  console.log('Received POST to /api/fields');
  console.log('Request body:', req.body);
  console.log('User:', req.user);
  
  const { name, crop_type, planting_date, current_stage, assigned_agent_id } = req.body;
  
  // Validate required fields
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!crop_type) {
    return res.status(400).json({ error: 'Crop type is required' });
  }
  if (!planting_date) {
    return res.status(400).json({ error: 'Planting date is required' });
  }
  if (!current_stage) {
    return res.status(400).json({ error: 'Current stage is required' });
  }
  
  try {
    // Handle assigned_agent_id - convert empty string to null
    let agentId = null;
    if (assigned_agent_id && assigned_agent_id !== '') {
      agentId = parseInt(assigned_agent_id);
    }
    
    const result = await pool.query(
      `INSERT INTO fields (name, crop_type, planting_date, current_stage, assigned_agent_id, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [name, crop_type, planting_date, current_stage, agentId, req.user.id]
    );
    
    console.log('Field created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Update field
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, crop_type, planting_date, current_stage, assigned_agent_id } = req.body;
  
  try {
    let agentId = null;
    if (assigned_agent_id && assigned_agent_id !== '') {
      agentId = parseInt(assigned_agent_id);
    }
    
    const result = await pool.query(
      `UPDATE fields 
       SET name = $1, crop_type = $2, planting_date = $3, current_stage = $4, 
           assigned_agent_id = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [name, crop_type, planting_date, current_stage, agentId, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('PUT /fields error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete field
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM fields WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }
    
    res.json({ message: 'Field deleted successfully' });
  } catch (error) {
    console.error('DELETE /fields error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available agents
router.get('/agents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE role = $1 ORDER BY name',
      ['agent']
    );
    res.json(result.rows);
  } catch (error) {
    console.error('GET /agents error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;