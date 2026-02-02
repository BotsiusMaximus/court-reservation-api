# 🚀 Quick Start Guide

Get the Court Reservation API running in **5 minutes**.

---

## Prerequisites Check

```bash
# Check if you have Node.js installed
node --version  # Should be v14+

# Check if you have PostgreSQL installed
psql --version  # Should be v12+
```

**Don't have them?**
- Node.js: https://nodejs.org/
- PostgreSQL: https://www.postgresql.org/download/

---

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd court-reservation-api
npm install
```

⏱️ **Time:** ~2 minutes

---

### 2. Create Database

```bash
# Open PostgreSQL terminal
psql postgres

# In psql, run:
CREATE DATABASE court_reservation;
\q
```

**Or** if you have a PostgreSQL user/password:

```bash
createdb court_reservation
```

---

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` file:

```env
PORT=3000
NODE_ENV=development

# Update these with your PostgreSQL credentials:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=court_reservation
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password

# This is fine for development:
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=7d
```

---

### 4. Setup Database

```bash
# Create tables
npm run db:migrate

# Add test data (optional but recommended)
npm run db:seed
```

**This creates:**
- ✅ 2 facilities (Downtown Pickleball Club, Riverside Courts)
- ✅ 6 courts
- ✅ 3 test users
- ✅ 3 sample reservations

**Test accounts:**
```
user1@test.com / password123
user2@test.com / password123
admin@test.com / password123
```

---

### 5. Start Server

```bash
npm start
```

You should see:

```
╔═══════════════════════════════════════╗
║   Court Reservation API Server       ║
║                                       ║
║   Port: 3000                          ║
║   Environment: development            ║
╚═══════════════════════════════════════╝

✓ Database connected successfully
API available at: http://localhost:3000
```

---

## Testing the API

### Option 1: Quick Browser Test

Open browser: http://localhost:3000

You should see:

```json
{
  "message": "Court Reservation API",
  "version": "1.0.0",
  "endpoints": { ... }
}
```

---

### Option 2: Postman Collection (Recommended)

1. **Open Postman** (download at https://postman.com if needed)

2. **Import Collection:**
   - Click "Import"
   - Select `Court-Reservation-API.postman_collection.json`

3. **Test Flow:**
   - Click "Login" request
   - Change email to: `user1@test.com`
   - Click "Send"
   - Token is auto-saved! ✨

4. **Try Other Requests:**
   - Get All Courts
   - Get Court Schedule
   - Create Reservation
   - Get My Reservations

---

### Option 3: Command Line (curl)

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@test.com","password":"password123"}'

# Copy the token from response, then:

# Get courts
curl http://localhost:3000/api/courts

# Create reservation (replace YOUR_TOKEN)
curl -X POST http://localhost:3000/api/reservations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "court_id": 1,
    "date": "2026-02-05",
    "start_time": "14:00",
    "duration": 90
  }'
```

---

## Common Issues

### ❌ "Database connection failed"

**Fix:** Check your `.env` file has correct PostgreSQL credentials

```bash
# Test connection manually:
psql -U your_username -d court_reservation -h localhost
```

---

### ❌ "Port 3000 already in use"

**Fix:** Change port in `.env`:

```env
PORT=3001
```

Or kill the process using port 3000:

```bash
lsof -ti:3000 | xargs kill
```

---

### ❌ "npm install" fails

**Fix:** Make sure you have Node.js v14+ installed:

```bash
node --version
```

Update Node.js if needed: https://nodejs.org/

---

## Next Steps

✅ API is running  
✅ Postman collection imported  
✅ Test accounts working  

**Now you can:**

1. **Customize courts** - Add your own facilities/courts
2. **Test booking flow** - Try creating/cancelling reservations
3. **Build iOS app** - Connect to this API
4. **Deploy** - Push to Railway/DigitalOcean when ready

---

## Quick Reference

| Action | Command |
|--------|---------|
| Start server | `npm start` |
| Start with auto-reload | `npm run dev` |
| Run migrations | `npm run db:migrate` |
| Seed test data | `npm run db:seed` |
| Run tests | `npm test` |

---

## Need Help?

- **API Documentation:** See `README.md`
- **Postman Collection:** Pre-configured examples
- **Check logs:** Server prints detailed logs in terminal

---

**🎾 Ready to book some courts! 🎾**

⚡ Built by Botsius Maximus - Vanguard Rank 4
