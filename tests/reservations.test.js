const request = require('supertest');
const app = require('../src/server');
const { pool } = require('../src/config/database');

// Test data
let authToken;
let userId;
let courtId = 1;

beforeAll(async () => {
  // Login to get auth token
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'user1@test.com',
      password: 'password123'
    });
  
  authToken = loginResponse.body.token;
  userId = loginResponse.body.user.id;
});

afterAll(async () => {
  // Clean up test reservations
  await pool.query(`DELETE FROM reservations WHERE notes LIKE '%TEST_%'`);
  await pool.end();
});

describe('Reservation Conflict Detection', () => {
  
  test('Should create first reservation successfully', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];
    
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        court_id: courtId,
        date: date,
        start_time: '10:00',
        duration: 60,
        notes: 'TEST_CONFLICT_1'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.reservation).toHaveProperty('confirmation_code');
  });

  test('Should reject exact duplicate booking', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];
    
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        court_id: courtId,
        date: date,
        start_time: '10:00',
        duration: 60,
        notes: 'TEST_CONFLICT_DUPLICATE'
      });
    
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('already booked');
  });

  test('Should reject overlapping booking (starts during existing)', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];
    
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        court_id: courtId,
        date: date,
        start_time: '10:30',
        duration: 60,
        notes: 'TEST_CONFLICT_OVERLAP'
      });
    
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('already booked');
  });

  test('Should reject overlapping booking (ends during existing)', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];
    
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        court_id: courtId,
        date: date,
        start_time: '09:30',
        duration: 60,
        notes: 'TEST_CONFLICT_ENDS_DURING'
      });
    
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('already booked');
  });

  test('Should reject booking that completely contains existing', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];
    
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        court_id: courtId,
        date: date,
        start_time: '09:00',
        duration: 180,
        notes: 'TEST_CONFLICT_CONTAINS'
      });
    
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('already booked');
  });

  test('Should allow back-to-back booking (ends when next starts)', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];
    
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        court_id: courtId,
        date: date,
        start_time: '11:00',
        duration: 60,
        notes: 'TEST_BACK_TO_BACK'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  test('Should allow booking on different court same time', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];
    
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        court_id: 2, // Different court
        date: date,
        start_time: '10:00',
        duration: 60,
        notes: 'TEST_DIFFERENT_COURT'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});

describe('Reservation Validation', () => {
  
  test('Should reject booking in the past', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = yesterday.toISOString().split('T')[0];
    
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        court_id: courtId,
        date: date,
        start_time: '10:00',
        duration: 60
      });
    
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('past');
  });

  test('Should reject booking exceeding max duration', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];
    
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        court_id: courtId,
        date: date,
        start_time: '10:00',
        duration: 240 // Exceeds 120 minute max
      });
    
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Maximum booking duration');
  });

  test('Should reject booking too far in advance', async () => {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 30); // Exceeds 14 day limit
    const date = farFuture.toISOString().split('T')[0];
    
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        court_id: courtId,
        date: date,
        start_time: '10:00',
        duration: 60
      });
    
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Cannot book more than');
  });
});

describe('Reservation Cancellation', () => {
  
  let reservationId;

  beforeAll(async () => {
    // Create a reservation to cancel
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 5);
    const date = farFuture.toISOString().split('T')[0];
    
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        court_id: courtId,
        date: date,
        start_time: '15:00',
        duration: 60,
        notes: 'TEST_FOR_CANCELLATION'
      });
    
    reservationId = response.body.reservation.id;
  });

  test('Should cancel reservation successfully', async () => {
    const response = await request(app)
      .delete(`/api/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reason: 'Test cancellation'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('Should not allow double cancellation', async () => {
    const response = await request(app)
      .delete(`/api/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reason: 'Test double cancel'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('already cancelled');
  });
});

describe('Authentication & Authorization', () => {
  
  test('Should reject reservation without token', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];
    
    const response = await request(app)
      .post('/api/reservations')
      .send({
        court_id: courtId,
        date: date,
        start_time: '14:00',
        duration: 60
      });
    
    expect(response.status).toBe(401);
  });

  test('Should only show user their own reservations', async () => {
    const response = await request(app)
      .get('/api/reservations')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.reservations.every(r => r.user_id === userId)).toBe(true);
  });
});
