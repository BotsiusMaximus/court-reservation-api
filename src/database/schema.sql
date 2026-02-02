-- Court Reservation System Database Schema
-- PostgreSQL

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS courts CASCADE;
DROP TABLE IF EXISTS facilities CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Facilities Table
CREATE TABLE facilities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    opening_time TIME DEFAULT '06:00:00',
    closing_time TIME DEFAULT '22:00:00',
    booking_interval_minutes INTEGER DEFAULT 30,
    max_booking_duration_minutes INTEGER DEFAULT 120,
    max_advance_booking_days INTEGER DEFAULT 14,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courts Table
CREATE TABLE courts (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    court_number INTEGER,
    surface_type VARCHAR(50) DEFAULT 'hard court',
    is_indoor BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(facility_id, court_number)
);

-- Reservations Table
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    court_id INTEGER REFERENCES courts(id) ON DELETE CASCADE,
    facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no-show')),
    confirmation_code VARCHAR(20) UNIQUE,
    notes TEXT,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_past_reservations CHECK (start_time >= created_at),
    CONSTRAINT valid_duration CHECK (end_time > start_time)
);

-- Indexes for Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_court ON reservations(court_id);
CREATE INDEX idx_reservations_time ON reservations(start_time, end_time);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_date ON reservations(DATE(start_time));
CREATE INDEX idx_courts_facility ON courts(facility_id);
CREATE INDEX idx_courts_active ON courts(is_active);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courts_updated_at BEFORE UPDATE ON courts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check reservation conflicts
CREATE OR REPLACE FUNCTION check_reservation_conflict(
    p_court_id INTEGER,
    p_start_time TIMESTAMP,
    p_end_time TIMESTAMP,
    p_reservation_id INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO conflict_count
    FROM reservations
    WHERE court_id = p_court_id
      AND status = 'confirmed'
      AND (p_reservation_id IS NULL OR id != p_reservation_id)
      AND (
          (start_time <= p_start_time AND end_time > p_start_time) OR
          (start_time < p_end_time AND end_time >= p_end_time) OR
          (start_time >= p_start_time AND end_time <= p_end_time)
      );
    
    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;
