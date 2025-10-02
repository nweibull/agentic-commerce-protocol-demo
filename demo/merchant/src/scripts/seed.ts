/**
 * Database seeding script
 * Populates the database with product catalog
 */

import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from '../config/database';

dotenv.config();

async function seed() {
  try {
    // Initialize database (includes product seeding)
    await initializeDatabase();

    console.log('✅ Database seeded successfully\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Run the seed
seed();