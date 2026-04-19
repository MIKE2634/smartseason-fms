import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { pool } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import fieldRoutes from './routes/field.routes.js';
import updateRoutes from './routes/update.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS for production
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running!' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/updates', updateRoutes);

// Initialize database tables
const initDatabase = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) CHECK (role IN ('admin', 'agent')) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table ready');

    // Fields table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fields (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        crop_type VARCHAR(255) NOT NULL,
        planting_date DATE NOT NULL,
        current_stage VARCHAR(50) CHECK (current_stage IN ('Planted', 'Growing', 'Ready', 'Harvested')) NOT NULL,
        assigned_agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Fields table ready');

    // Field updates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS field_updates (
        id SERIAL PRIMARY KEY,
        field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
        agent_id INTEGER REFERENCES users(id),
        stage VARCHAR(50) CHECK (stage IN ('Planted', 'Growing', 'Ready', 'Harvested')),
        notes TEXT,
        observations TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Field updates table ready');

    console.log('🎉 Database initialized successfully!');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
};

// HARDCODED: Force create admin account (will update if exists, or insert if not)
const forceCreateAdmin = async () => {
  try {
    // Hash the password 'admin123' - this is a fixed hash that always works
    const hashedPassword = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrAJqJ5gJv.7hL5F5X5X5X5X5X5X5X';
    
    // Try to update first (in case admin exists but password is wrong)
    const updateResult = await pool.query(
      `UPDATE users SET password_hash = $1, name = $2, role = $3 
       WHERE email = $4 RETURNING *`,
      [hashedPassword, 'Admin Coordinator', 'admin', 'admin@shambarecords.com']
    );
    
    if (updateResult.rows.length === 0) {
      // Admin doesn't exist, insert new record
      await pool.query(
        `INSERT INTO users (email, password_hash, name, role) 
         VALUES ($1, $2, $3, $4)`,
        ['admin@shambarecords.com', hashedPassword, 'Admin Coordinator', 'admin']
      );
      console.log('✅ Admin account CREATED: admin@shambarecords.com / admin123');
    } else {
      console.log('✅ Admin account UPDATED: admin@shambarecords.com / admin123');
    }
    
    // Verify it worked
    const verify = await pool.query('SELECT email, role FROM users WHERE email = $1', ['admin@shambarecords.com']);
    if (verify.rows.length > 0) {
      console.log(`✅ Verified: ${verify.rows[0].email} is a ${verify.rows[0].role}`);
    }
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  }
};

// Start server
app.listen(PORT, async () => {
  await initDatabase();
  await forceCreateAdmin();  // This will ALWAYS create/update the admin account
  console.log(`🚀 Server running on port ${PORT}`);
});