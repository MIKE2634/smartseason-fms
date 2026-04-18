import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Get updates for a field
router.get('/field/:fieldId', authenticateToken, async (req, res) => {
  const { fieldId } = req.params;
  
  try {
    // Check if user has access to this field
    if (req.user.role !== 'admin') {
      const fieldCheck = await pool.query(
        'SELECT assigned_agent_id FROM fields WHERE id = $1',
        [fieldId]
      );
      
      if (fieldCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Field not found' });
      }
      
      if (fieldCheck.rows[0].assigned_agent_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const result = await pool.query(
      `SELECT fu.*, u.name as agent_name 
       FROM field_updates fu
       JOIN users u ON fu.agent_id = u.id
       WHERE fu.field_id = $1
       ORDER BY fu.created_at DESC`,
      [fieldId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create update (agent only)
router.post('/', authenticateToken, [
  body('field_id').isInt(),
  body('stage').isIn(['Planted', 'Growing', 'Ready', 'Harvested']),
  body('notes').optional().isString(),
  body('observations').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { field_id, stage, notes, observations } = req.body;
  
  try {
    // Verify agent is assigned to this field
    const fieldCheck = await pool.query(
      'SELECT assigned_agent_id FROM fields WHERE id = $1',
      [field_id]
    );
    
    if (fieldCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }
    
    if (fieldCheck.rows[0].assigned_agent_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not assigned to this field' });
    }
    
    // Create update
    const result = await pool.query(
      `INSERT INTO field_updates (field_id, agent_id, stage, notes, observations)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [field_id, req.user.id, stage, notes || null, observations || null]
    );
    
    // Update field's current stage
    await pool.query(
      'UPDATE fields SET current_stage = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [stage, field_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;