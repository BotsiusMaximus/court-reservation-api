const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { pool, query } = require('../config/database');

async function seedDatabase() {
  console.log('🌱 Seeding database with test data...\n');

  try {
    // Insert facilities
    console.log('📍 Creating facilities...');
    const facilitiesResult = await query(`
      INSERT INTO facilities (name, address, city, state, zip_code, phone, email, opening_time, closing_time)
      VALUES 
        ('Downtown Pickleball Club', '123 Main Street', 'Portland', 'OR', '97201', '503-555-0100', 'info@downtownpb.com', '06:00:00', '22:00:00'),
        ('Riverside Courts', '456 River Road', 'Portland', 'OR', '97202', '503-555-0200', 'contact@riversidecourts.com', '07:00:00', '21:00:00')
      RETURNING id, name
    `);
    console.log(`✓ Created ${facilitiesResult.rows.length} facilities`);

    // Insert courts
    console.log('🎾 Creating courts...');
    const courtsResult = await query(`
      INSERT INTO courts (facility_id, name, court_number, surface_type, is_indoor)
      VALUES 
        (1, 'Court 1', 1, 'hard court', false),
        (1, 'Court 2', 2, 'hard court', false),
        (1, 'Court 3', 3, 'cushioned court', true),
        (1, 'Court 4', 4, 'cushioned court', true),
        (2, 'Court 1', 1, 'concrete', false),
        (2, 'Court 2', 2, 'concrete', false)
      RETURNING id, name
    `);
    console.log(`✓ Created ${courtsResult.rows.length} courts`);

    // Insert test users
    console.log('👥 Creating test users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const usersResult = await query(`
      INSERT INTO users (email, password_hash, name, phone, role)
      VALUES 
        ('admin@test.com', $1, 'Admin User', '503-555-1000', 'admin'),
        ('user1@test.com', $1, 'John Doe', '503-555-1001', 'user'),
        ('user2@test.com', $1, 'Jane Smith', '503-555-1002', 'user')
      RETURNING id, email, name
    `, [hashedPassword]);
    console.log(`✓ Created ${usersResult.rows.length} users`);
    console.log('  Default password for all users: password123');

    // Insert sample reservations
    console.log('📅 Creating sample reservations...');
    const reservationsResult = await query(`
      INSERT INTO reservations (user_id, court_id, facility_id, start_time, end_time, duration_minutes, status, confirmation_code)
      VALUES 
        (2, 1, 1, CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '10 hours', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '11.5 hours', 90, 'confirmed', 'PB-001-ABC'),
        (2, 2, 1, CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '14 hours', CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '16 hours', 120, 'confirmed', 'PB-002-DEF'),
        (3, 3, 1, CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '09 hours', CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '10 hours', 60, 'confirmed', 'PB-003-GHI')
      RETURNING id, confirmation_code
    `);
    console.log(`✓ Created ${reservationsResult.rows.length} reservations\n`);

    // Summary
    console.log('📊 Database seed summary:');
    console.log(`  • Facilities: ${facilitiesResult.rows.length}`);
    console.log(`  • Courts: ${courtsResult.rows.length}`);
    console.log(`  • Users: ${usersResult.rows.length}`);
    console.log(`  • Reservations: ${reservationsResult.rows.length}\n`);
    
    console.log('✅ Database seeded successfully!\n');
    console.log('Test accounts:');
    console.log('  Admin: admin@test.com / password123');
    console.log('  User 1: user1@test.com / password123');
    console.log('  User 2: user2@test.com / password123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedDatabase();
