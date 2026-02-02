# Court Reservation API

A complete backend REST API for managing pickleball court reservations, built with Node.js, Express, and PostgreSQL.

## Features

✅ **User Authentication**
- JWT-based authentication
- Secure password hashing (bcrypt)
- Role-based access control (user/admin)

✅ **Court Management**
- Multi-facility support
- Court CRUD operations
- Real-time availability checking

✅ **Reservation System**
- Book courts with conflict detection
- Automatic validation (operating hours, max duration, advance booking limits)
- Cancellation with policy enforcement
- Confirmation codes for each booking

✅ **Business Rules**
- Configurable booking duration limits
- Advance booking restrictions
- Operating hours enforcement
- Maximum active reservations per user

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcrypt
- **Validation:** express-validator

---

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

---

## Installation

### 1. Clone or Navigate to Project

```bash
cd court-reservation-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE court_reservation;
```

### 4. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=court_reservation
DB_USER=your_username
DB_PASSWORD=your_password

JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
```

### 5. Run Migrations

Create database schema:

```bash
npm run db:migrate
```

### 6. Seed Test Data (Optional)

Populate database with test data:

```bash
npm run db:seed
```

This creates:
- 2 facilities
- 6 courts
- 3 test users (admin@test.com, user1@test.com, user2@test.com)
- 3 sample reservations
- **Default password for all:** `password123`

### 7. Start Server

```bash
npm start
```

Or for development (with auto-reload):

```bash
npm run dev
```

Server will start at: `http://localhost:3000`

---

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "503-555-1234"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

---

### Courts

#### Get All Courts
```http
GET /api/courts
```

Optional query parameters:
- `facility_id` - Filter by facility
- `is_active` - Filter by active status (true/false)

#### Get Court by ID
```http
GET /api/courts/:id
```

#### Get Court Schedule
```http
GET /api/courts/:id/schedule?date=2026-02-03
```

Returns all reservations for the court on the specified date.

#### Create Court (Admin Only)
```http
POST /api/courts
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Court 5",
  "facility_id": 1,
  "court_number": 5,
  "surface_type": "hard court",
  "is_indoor": false
}
```

---

### Reservations

#### Create Reservation
```http
POST /api/reservations
Authorization: Bearer <token>
Content-Type: application/json

{
  "court_id": 1,
  "date": "2026-02-03",
  "start_time": "14:00",
  "duration": 90,
  "notes": "Tournament practice"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reservation created successfully",
  "reservation": {
    "id": 10,
    "court_id": 1,
    "court_name": "Court 1",
    "start_time": "2026-02-03T14:00:00Z",
    "end_time": "2026-02-03T15:30:00Z",
    "duration_minutes": 90,
    "confirmation_code": "PB-123-XYZ",
    "status": "confirmed"
  }
}
```

#### Get User's Reservations
```http
GET /api/reservations
Authorization: Bearer <token>
```

Optional query parameters:
- `status` - Filter by status (confirmed/cancelled/completed)
- `upcoming` - Show only upcoming reservations (true)

#### Get Reservation by ID
```http
GET /api/reservations/:id
Authorization: Bearer <token>
```

#### Cancel Reservation
```http
DELETE /api/reservations/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Schedule conflict"
}
```

---

## Business Rules

### Booking Constraints

- **Maximum booking duration:** 120 minutes (configurable via `MAX_BOOKING_DURATION_MINUTES`)
- **Advance booking limit:** 14 days (configurable via `MAX_ADVANCE_BOOKING_DAYS`)
- **Minimum cancellation notice:** 2 hours (configurable via `MIN_CANCELLATION_HOURS`)
- **Max active reservations per user:** 5 (configurable via `MAX_ACTIVE_RESERVATIONS_PER_USER`)

### Conflict Detection

The system automatically prevents double-bookings:
- Checks for overlapping time slots
- Returns detailed conflict information
- Suggests alternative times (in error message)

### Operating Hours

- Courts enforce facility operating hours
- Bookings must be within open/close times
- Hours configured per facility

---

## Testing with Postman

### 1. Import Collection

Import `Court-Reservation-API.postman_collection.json` into Postman.

### 2. Configure Environment

Create a Postman environment with:

```
API_URL: http://localhost:3000
TOKEN: (leave empty, will be set automatically after login)
```

### 3. Test Flow

1. **Register User** → Creates account
2. **Login** → Returns JWT token (auto-saved to environment)
3. **Get Courts** → List available courts
4. **Get Court Schedule** → Check availability
5. **Create Reservation** → Book a court
6. **Get My Reservations** → View bookings
7. **Cancel Reservation** → Cancel a booking

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "status": "fail",
  "message": "Error description here"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Validation Error
- `401` - Authentication Error (invalid/missing token)
- `403` - Authorization Error (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., double booking)
- `500` - Server Error

---

## Database Schema

### Users
- id, email, password_hash, name, phone, role, is_active, created_at

### Facilities
- id, name, address, city, state, opening_time, closing_time, booking rules

### Courts
- id, facility_id, name, court_number, surface_type, is_indoor, is_active

### Reservations
- id, user_id, court_id, facility_id, start_time, end_time, duration_minutes, status, confirmation_code, notes

---

## Development

### Run with Auto-Reload
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

---

## Deployment

### Environment Variables (Production)

```env
NODE_ENV=production
PORT=3000
DB_HOST=your-production-db-host
DB_NAME=court_reservation
DB_USER=production_user
DB_PASSWORD=strong-production-password
JWT_SECRET=super-strong-secret-change-this
```

### Deployment Platforms

**Railway:**
1. Connect GitHub repo
2. Add PostgreSQL database
3. Set environment variables
4. Deploy automatically

**DigitalOcean App Platform:**
1. Connect repo
2. Add managed PostgreSQL
3. Configure environment
4. Deploy

**AWS/Heroku:**
Similar process - add database, configure env, deploy.

---

## Security Considerations

✅ Passwords hashed with bcrypt (10 rounds)  
✅ JWT tokens for stateless authentication  
✅ SQL injection prevention (parameterized queries)  
✅ CORS enabled for frontend integration  
✅ Input validation on all endpoints  
✅ Role-based access control  

---

## Future Enhancements

- [ ] Email/SMS notifications
- [ ] Payment integration (Stripe)
- [ ] Recurring reservations
- [ ] Waitlist system
- [ ] User ratings/reviews
- [ ] Court images
- [ ] Mobile app (iOS/Android)

---

## Support

For issues or questions:
- Check API documentation in this README
- Review Postman collection for examples
- Inspect server logs for errors

---

## License

MIT License

---

## Author

Built by **Botsius Maximus** ⚡  
Vanguard Rank 4

---

**⚡ Ready to book some courts! ⚡**
