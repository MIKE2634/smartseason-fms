import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Calculate field status based on stage and days since planting
const calculateFieldStatus = (field) => {
  const plantingDate = new Date(field.planting_date);
  const today = new Date();
  const daysSincePlanting = Math.floor((today - plantingDate) / (1000 * 60 * 60 * 24));
  
  // Status logic:
  // - Active: Planted/Growing stages and within normal timeline
  // - At Risk: Planted/Growing stages but beyond expected timeline or no updates for 7+ days
  // - Completed: Ready/Harvested stages
  
  if (field.current_stage === 'Ready' || field.current_stage === 'Harvested') {
    return 'Completed';
  }
  
  // Expected harvest time based on crop type (simplified)
  const cropExpectedDays = {
    'Corn': 100,
    'Wheat': 120,
    'Soybeans': 90,
    'Rice': 110,
    'Potatoes': 80,
    'Tomatoes': 70,
  };
  
  const expectedDays = cropExpectedDays[field.crop_type] || 90;
  
  if (field.current_stage === 'Planted' || field.current_stage === 'Growing') {
    // Check if overdue
    if (daysSincePlanting > expectedDays) {
      return 'At Risk';
    }
    
    // Check for recent updates (simplified - would need last update date)
    if (field.last_update_days_ago && field.last_update_days_ago > 7) {
      return 'At Risk';
    }
    
    return 'Active';
  }
  
  return 'Active';
};

// Get all fields (admin sees all, agent sees assigned)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query;
    let params;
    
    if (req.user.role === 'admin') {
      query = `
        SELECT f.*, u.name as agent_name,
          (SELECT MAX(created_at) FROM field_updates WHERE field_id = f.id) as last_update
        FROM fields f
        LEFT JOIN users u ON f.assigned_agent_id = u.id
        ORDER BY f.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT f.*, u.name as agent_name,
          (SELECT MAX(created_at) FROM field_updates WHERE field_id = f.id) as last_update
        FROM fields f
        LEFT JOIN users u ON f.assigned_agent_id = u.id
        WHERE f.assigned_agent_id = $1
        ORDER BY f.created_at DESC
      `;
      params = [req.user.id];
    }
    
    const result = await pool.query(query, params);
    
    // Calculate status for each field
    const fieldsWithStatus = result.rows.map(field => {
      let lastUpdateDaysAgo = null;
      if (field.last_update) {
        const lastUpdate = new Date(field.last_update);
        const today = new Date();
        lastUpdateDaysAgo = Math.floor((today - lastUpdate) / (1000 * 60 * 60 * 24));
      }
      
      const fieldWithLastUpdate = { ...field, last_update_days_ago: lastUpdateDaysAgo };
      const status = calculateFieldStatus(fieldWithLastUpdate);
      
      return { ...field, status };
    });
    
    res.json(fieldsWithStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create field (admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('name').notEmpty(),
  body('crop_type').notEmpty(),
  body('planting_date').isDate(),
  body('current_stage').isIn(['Planted', 'Growing', 'Ready', 'Harvested']),
  body('assigned_agent_id').optional().isInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { name, crop_type, planting_date, current_stage, assigned_agent_id } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO fields (name, crop_type, planting_date, current_stage, assigned_agent_id, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, crop_type, planting_date, current_stage, assigned_agent_id || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update field (admin only)
router.put('/:id', authenticateToken, requireAdmin, [
  body('name').optional().notEmpty(),
  body('crop_type').optional().notEmpty(),
  body('planting_date').optional().isDate(),
  body('current_stage').optional().isIn(['Planted', 'Growing', 'Ready', 'Harvested']),
  body('assigned_agent_id').optional(),
], async (req, res) => {
  const { id } = req.params;
  const { name, crop_type, planting_date, current_stage, assigned_agent_id } = req.body;
  
  try {
    const updates = [];
    const values = [];
    let valueCounter = 1;
    
    if (name) {
      updates.push(`name = $${valueCounter++}`);
      values.push(name);
    }
    if (crop_type) {
      updates.push(`crop_type = $${valueCounter++}`);
      values.push(crop_type);
    }
    if (planting_date) {
      updates.push(`planting_date = $${valueCounter++}`);
      values.push(planting_date);
    }
    if (current_stage) {
      updates.push(`current_stage = $${valueCounter++}`);
      values.push(current_stage);
    }
    if (assigned_agent_id !== undefined) {
      updates.push(`assigned_agent_id = $${valueCounter++}`);
      values.push(assigned_agent_id === '' ? null : assigned_agent_id);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updates.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    const query = `UPDATE fields SET ${updates.join(', ')} WHERE id = $${valueCounter} RETURNING *`;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete field (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM fields WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }
    
    res.json({ message: 'Field deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available agents (admin only)
router.get('/agents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE role = $1 ORDER BY name',
      ['agent']
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;