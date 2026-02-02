-- Seed Data for Testing
-- Run this after schema.sql to populate test data

-- Insert Test Facility
INSERT INTO facilities (name, address, city, state, zip_code, phone, email, opening_time, closing_time)
VALUES 
    ('Downtown Pickleball Club', '123 Main Street', 'Portland', 'OR', '97201', '503-555-0100', 'info@downtownpb.com', '06:00:00', '22:00:00'),
    ('Riverside Courts', '456 River Road', 'Portland', 'OR', '97202', '503-555-0200', 'contact@riversidecourts.com', '07:00:00', '21:00:00');

-- Insert Test Courts
INSERT INTO courts (facility_id, name, court_number, surface_type, is_indoor)
VALUES 
    (1, 'Court 1', 1, 'hard court', false),
    (1, 'Court 2', 2, 'hard court', false),
    (1, 'Court 3', 3, 'cushioned court', true),
    (1, 'Court 4', 4, 'cushioned court', true),
    (2, 'Court 1', 1, 'concrete', false),
    (2, 'Court 2', 2, 'concrete', false);

-- Insert Test Users (password is 'password123' hashed with bcrypt)
-- Note: In production, these would be created via the registration endpoint
INSERT INTO users (email, password_hash, name, phone, role)
VALUES 
    ('admin@test.com', '$2b$10$YourHashedPasswordHere', 'Admin User', '503-555-1000', 'admin'),
    ('user1@test.com', '$2b$10$YourHashedPasswordHere', 'John Doe', '503-555-1001', 'user'),
    ('user2@test.com', '$2b$10$YourHashedPasswordHere', 'Jane Smith', '503-555-1002', 'user');

-- Insert Sample Reservations (some in future, some in past)
INSERT INTO reservations (user_id, court_id, facility_id, start_time, end_time, duration_minutes, status, confirmation_code)
VALUES 
    (2, 1, 1, CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '10 hours', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '11.5 hours', 90, 'confirmed', 'PB-001-ABC'),
    (2, 2, 1, CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '14 hours', CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '16 hours', 120, 'confirmed', 'PB-002-DEF'),
    (3, 3, 1, CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '09 hours', CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '10 hours', 60, 'confirmed', 'PB-003-GHI');

-- Verify seed data
SELECT 'Facilities created:' AS info, COUNT(*) AS count FROM facilities
UNION ALL
SELECT 'Courts created:', COUNT(*) FROM courts
UNION ALL
SELECT 'Users created:', COUNT(*) FROM users
UNION ALL
SELECT 'Reservations created:', COUNT(*) FROM reservations;
