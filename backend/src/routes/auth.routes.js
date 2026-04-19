import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

const router = express.Router();

// SIMPLE TEST LOGIN - NO VALIDATION
router.post('/login', async (req, res) => {
  console.log('Login attempt:', req.body);
  
  const { email, password } = req.body;
  
  // HARDCODED ADMIN - ALWAYS WORKS
  if (email === 'admin@shambarecords.com' && password === 'admin123') {
    console.log('✅ Hardcoded admin login successful');
    const token = jwt.sign(
      { id: 7, email: 'admin@shambarecords.com', role: 'admin' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );
    return res.json({
      user: {
        id: 7,
        email: 'admin@shambarecords.com',
        name: 'Admin Coordinator',
        role: 'admin'
      },
      token
    });
  }
  
  // Database check for other users
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (valid) {
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '7d' }
        );
        return res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
      }
    }
    return res.status(401).json({ error: 'Invalid email or password' });
  } catch (error) {
    console.error('DB error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Simple register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, 'agent']
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );
    res.json({ user, token });
  } catch (error) {
    res.status(400).json({ error: 'Email already exists or invalid data' });
  }
});

export default router;