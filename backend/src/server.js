import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import fieldRoutes from './routes/field.routes.js';
import updateRoutes from './routes/update.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

    console.log('Database initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

app.listen(PORT, async () => {
  await initDatabase();
  console.log(`Server running on port ${PORT}`);
});