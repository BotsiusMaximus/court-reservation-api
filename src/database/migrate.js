const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigrations() {
  console.log('🔄 Running database migrations...\n');

  try {
    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📋 Executing schema.sql...');
    await pool.query(schemaSql);
    console.log('✓ Schema created successfully\n');

    console.log('✅ All migrations completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigrations();
