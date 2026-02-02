# Production Deployment Guide

Complete guide to deploying the Court Reservation API to production.

---

## 🎯 Deployment Options

### Quick Comparison

| Platform | Difficulty | Cost | Best For |
|----------|------------|------|----------|
| **Railway** | ⭐ Easy | $5-20/mo | Quick launch, auto-deploy |
| **DigitalOcean** | ⭐⭐ Medium | $12-24/mo | More control, droplets |
| **AWS** | ⭐⭐⭐ Complex | Variable | Enterprise, scalability |
| **Heroku** | ⭐ Easy | $7-25/mo | Simple, established |

---

## 🚀 Option 1: Railway (Recommended for Quick Start)

**Why Railway:**
- Automatic deployments from GitHub
- Built-in PostgreSQL
- Zero-config HTTPS
- Simple pricing

### Step-by-Step:

#### 1. Prepare Repository
```bash
# Make sure code is in Git
cd court-reservation-api
git init
git add .
git commit -m "Initial commit - Court Reservation API"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/court-reservation-api.git
git push -u origin main
```

#### 2. Create Railway Account
- Go to https://railway.app
- Sign up with GitHub
- Connect your GitHub account

#### 3. Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `court-reservation-api`
4. Railway will detect Node.js automatically

#### 4. Add PostgreSQL Database
1. In your project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway provisions database automatically
4. Database credentials auto-injected as environment variables

#### 5. Configure Environment Variables
Click on your app → "Variables" tab:

```env
NODE_ENV=production
PORT=3000

# Database (Railway auto-provides these)
DATABASE_URL=${{Postgres.DATABASE_URL}}
# Or manually:
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}

# JWT
JWT_SECRET=YOUR_SUPER_SECRET_KEY_GENERATE_RANDOM
JWT_EXPIRES_IN=7d

# Email (optional)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=YOUR_SENDGRID_API_KEY
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Court Reservation

# Business rules
MAX_BOOKING_DURATION_MINUTES=120
MAX_ADVANCE_BOOKING_DAYS=14
MIN_CANCELLATION_HOURS=2
MAX_ACTIVE_RESERVATIONS_PER_USER=5
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### 6. Run Database Migrations

Railway provides a shell:
1. Click on your app → "Settings" → "Deploy"
2. Add build command: `npm install`
3. Add start command: `npm start`
4. For migrations, use Railway CLI:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migrations
railway run npm run db:migrate
railway run npm run db:seed
```

#### 7. Deploy
- Push to GitHub → Railway auto-deploys
- Or click "Deploy" in Railway dashboard
- Wait ~2 minutes for build
- Railway provides public URL: `https://your-app.up.railway.app`

#### 8. Custom Domain (Optional)
1. In Railway → Settings → Domains
2. Add custom domain
3. Update DNS records as instructed
4. SSL certificate auto-provisioned

---

## 🌊 Option 2: DigitalOcean App Platform

**Why DigitalOcean:**
- More control than Railway
- Good documentation
- Predictable pricing
- Managed database

### Step-by-Step:

#### 1. Create DigitalOcean Account
- Go to https://www.digitalocean.com
- Sign up (get $200 credit with referral)
- Verify account

#### 2. Create Managed PostgreSQL Database
1. Click "Create" → "Databases"
2. Choose PostgreSQL 14+
3. Select plan (Basic $15/mo)
4. Choose region (closest to users)
5. Create database cluster

#### 3. Configure Database
1. Go to database → "Users & Databases"
2. Create database: `court_reservation`
3. Note connection details

#### 4. Create App Platform App
1. Click "Create" → "Apps"
2. Connect GitHub repository
3. Select `court-reservation-api` repo
4. DigitalOcean detects Node.js

#### 5. Configure Build Settings
**Build Command:**
```bash
npm install && npm run db:migrate
```

**Run Command:**
```bash
npm start
```

#### 6. Add Environment Variables
Same as Railway (see above), but use DigitalOcean database credentials:

```env
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
```

#### 7. Deploy
- Click "Create Resources"
- Wait ~5 minutes
- App available at: `https://your-app.ondigitalocean.app`

---

## ☁️ Option 3: AWS (Advanced)

**Why AWS:**
- Maximum scalability
- Enterprise-grade
- Most features
- Pay-as-you-go

### Components Needed:
- **EC2** or **Elastic Beanstalk** (app hosting)
- **RDS PostgreSQL** (database)
- **Route 53** (DNS)
- **Certificate Manager** (SSL)
- **CloudWatch** (monitoring)

### Quick Start with Elastic Beanstalk:

#### 1. Install AWS CLI & EB CLI
```bash
# macOS
brew install awscli
brew install aws-elasticbeanstalk

# Configure AWS credentials
aws configure
```

#### 2. Initialize Elastic Beanstalk
```bash
cd court-reservation-api

# Initialize
eb init

# Select:
# - Region: us-east-1 (or closest)
# - Application name: court-reservation-api
# - Platform: Node.js
# - SSH: Yes
```

#### 3. Create Environment
```bash
# Create environment with database
eb create production-env --database

# Or create database separately via RDS console
```

#### 4. Configure Environment Variables
```bash
# Set environment variables
eb setenv NODE_ENV=production \
  JWT_SECRET=your_secret \
  DB_HOST=your-rds-endpoint \
  DB_NAME=court_reservation \
  DB_USER=postgres \
  DB_PASSWORD=your_password
```

#### 5. Deploy
```bash
# Deploy
eb deploy

# Open in browser
eb open
```

#### 6. Run Migrations
```bash
# SSH into instance
eb ssh

# Run migrations
cd /var/app/current
npm run db:migrate
npm run db:seed
exit
```

---

## 🔧 Post-Deployment Configuration

### 1. Run Database Migrations

**Railway/DigitalOcean:**
Use their CLI or web shell

**AWS:**
```bash
eb ssh
cd /var/app/current
npm run db:migrate
npm run db:seed
```

### 2. Seed Initial Data

Create admin user:
```bash
# Via API
curl -X POST https://your-api.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "SecurePassword123!",
    "name": "Admin User",
    "role": "admin"
  }'
```

Or directly in database:
```sql
-- Connect to production database
-- Update user role to admin
UPDATE users SET role = 'admin' WHERE email = 'admin@yourdomain.com';
```

### 3. Configure Email Service

**SendGrid (Recommended):**
1. Sign up at https://sendgrid.com
2. Verify sender email
3. Create API key
4. Add to environment variables:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
```

**Gmail:**
1. Enable 2FA
2. Create app password
3. Add to environment:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 4. Test Deployment

```bash
# Health check
curl https://your-api.com/health

# Create test reservation
curl -X POST https://your-api.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"your_password"}'

# Use returned token to test
curl -X GET https://your-api.com/api/courts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔒 Security Checklist

### Environment Variables
- [ ] `JWT_SECRET` is random and secure (64+ characters)
- [ ] Database password is strong
- [ ] SMTP credentials are app-specific passwords
- [ ] `NODE_ENV=production` is set

### Database
- [ ] SSL/TLS enabled for database connections
- [ ] Database not publicly accessible (private network only)
- [ ] Regular backups configured
- [ ] Connection pooling configured

### API
- [ ] CORS configured for your domain only
- [ ] Rate limiting enabled (optional, add express-rate-limit)
- [ ] HTTPS enforced (platforms handle this automatically)
- [ ] Error messages don't leak sensitive info

### Monitoring
- [ ] Health check endpoint accessible
- [ ] Logging configured
- [ ] Alerts set up for errors
- [ ] Database performance monitoring

---

## 📊 Monitoring & Maintenance

### Health Checks

All platforms support health checks. Configure:
- **URL:** `/health`
- **Expected:** 200 status
- **Interval:** 30 seconds
- **Timeout:** 10 seconds

### Logging

**Railway:** Built-in logs in dashboard

**DigitalOcean:** Runtime logs in app dashboard

**AWS:** CloudWatch Logs

**Custom logging:**
```javascript
// Add to production (optional)
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Database Backups

**Railway:** Automatic daily backups (paid plan)

**DigitalOcean:** Automatic daily backups included

**AWS RDS:** Configure automated backups in RDS console

### Scaling

**Vertical (more power):**
- Railway: Upgrade plan
- DigitalOcean: Change app size
- AWS: Change instance type

**Horizontal (more instances):**
- Railway: Not directly supported (use AWS)
- DigitalOcean: Scale to multiple instances
- AWS: Auto-scaling groups

---

## 🐛 Troubleshooting

### "Cannot connect to database"

**Check:**
1. Environment variables are correct
2. Database is running
3. Firewall allows connection
4. SSL mode is correct

**Fix:**
```bash
# Test database connection
psql "postgresql://user:pass@host:port/db?sslmode=require"
```

### "Port already in use"

**Fix:** Don't hardcode port 3000. Use `process.env.PORT`:
```javascript
const PORT = process.env.PORT || 3000;
```

### "npm install fails"

**Check:**
1. Node version (use 18+)
2. package.json is valid
3. Network access to npm registry

**Fix:** Add `.nvmrc` file:
```
18
```

### "Migrations fail"

**Check:**
1. Database exists
2. User has CREATE permissions
3. Tables don't already exist

**Fix:** Reset database (WARNING: deletes data):
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO your_user;
```

---

## 💰 Cost Estimates

### Small Scale (<1000 users, <10K requests/day)

**Railway:**
- App: $5/mo
- PostgreSQL: $5/mo
- **Total: ~$10/mo**

**DigitalOcean:**
- App Platform: $12/mo
- Managed PostgreSQL: $15/mo
- **Total: ~$27/mo**

**AWS:**
- t3.micro EC2: $8/mo
- RDS t3.micro: $16/mo
- **Total: ~$24/mo**

### Medium Scale (<10K users, <100K requests/day)

**Railway:**
- App: $10-20/mo
- PostgreSQL: $10-20/mo
- **Total: ~$30-40/mo**

**DigitalOcean:**
- App Platform: $24/mo
- Managed PostgreSQL: $30/mo
- **Total: ~$54/mo**

**AWS:**
- t3.small EC2: $17/mo
- RDS t3.small: $27/mo
- **Total: ~$44/mo**

---

## 🎓 Best Practices

### Code

- [ ] Use environment variables for all config
- [ ] Log errors properly
- [ ] Handle graceful shutdown
- [ ] Implement health checks
- [ ] Version your API (optional: `/api/v1/...`)

### Database

- [ ] Use connection pooling
- [ ] Close connections properly
- [ ] Handle timeouts
- [ ] Index frequently queried columns
- [ ] Regular vacuum/analyze (PostgreSQL)

### Deployment

- [ ] Use CI/CD (GitHub Actions)
- [ ] Test before deploying
- [ ] Deploy during low-traffic hours
- [ ] Keep rollback strategy ready
- [ ] Monitor after deployment

---

## 🔄 CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Deploy to Railway
      env:
        RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
      run: |
        npm install -g @railway/cli
        railway up
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Code tested locally
- [ ] All tests passing
- [ ] Environment variables documented
- [ ] Database schema finalized
- [ ] Email service configured
- [ ] Admin account planned

### Deployment
- [ ] Platform account created
- [ ] Database provisioned
- [ ] Environment variables set
- [ ] Code deployed
- [ ] Migrations run
- [ ] Seed data loaded

### Post-Deployment
- [ ] Health check passing
- [ ] Admin login working
- [ ] Test reservation creation
- [ ] Email notifications working
- [ ] Admin dashboard accessible
- [ ] Custom domain configured (if applicable)

### Monitoring
- [ ] Health check alerts set
- [ ] Error logging configured
- [ ] Database backups enabled
- [ ] Performance monitoring active

---

## 📞 Support

**Platform Documentation:**
- Railway: https://docs.railway.app
- DigitalOcean: https://docs.digitalocean.com
- AWS: https://docs.aws.amazon.com

**Common Issues:**
- Check platform status page
- Review deployment logs
- Test database connectivity
- Verify environment variables
- Check firewall rules

---

**🚀 Your API is production-ready. Choose a platform and deploy!**

⚡ Built by Botsius Maximus - Vanguard Captain Rank 1
