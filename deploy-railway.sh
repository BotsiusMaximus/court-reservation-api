#!/bin/bash

# Quick deployment script for Railway
# Makes deploying to production easy

set -e

echo "🚀 Court Reservation API - Railway Deployment"
echo "=============================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "   Run this script from the project root directory"
    exit 1
fi

echo "✓ Railway CLI ready"
echo ""

# Login to Railway
echo "🔐 Logging into Railway..."
echo "   (This will open your browser for authentication)"
railway login

echo ""
echo "📋 Project Setup Options:"
echo "   1. Create new project"
echo "   2. Link to existing project"
read -p "Choose option (1 or 2): " option

if [ "$option" = "1" ]; then
    echo ""
    echo "📦 Creating new Railway project..."
    railway init
    
    echo ""
    echo "🗄️  Adding PostgreSQL database..."
    railway add --database postgresql
    
    echo ""
    echo "⚙️  Setting environment variables..."
    
    # Generate JWT secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    
    railway variables set NODE_ENV=production
    railway variables set JWT_SECRET="$JWT_SECRET"
    railway variables set JWT_EXPIRES_IN=7d
    railway variables set MAX_BOOKING_DURATION_MINUTES=120
    railway variables set MAX_ADVANCE_BOOKING_DAYS=14
    railway variables set MIN_CANCELLATION_HOURS=2
    railway variables set MAX_ACTIVE_RESERVATIONS_PER_USER=5
    
    echo "✓ Environment variables set"
    echo "  Note: Configure email settings in Railway dashboard if needed"
    
elif [ "$option" = "2" ]; then
    echo ""
    echo "🔗 Linking to existing project..."
    railway link
else
    echo "❌ Invalid option"
    exit 1
fi

echo ""
echo "🔄 Running database migrations..."
railway run npm run db:migrate

read -p "📊 Do you want to seed test data? (y/n): " seed_option
if [ "$seed_option" = "y" ]; then
    echo "🌱 Seeding database..."
    railway run npm run db:seed
    echo "✓ Test data seeded"
    echo "  Test accounts:"
    echo "    admin@test.com / password123"
    echo "    user1@test.com / password123"
fi

echo ""
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "⏳ Waiting for deployment..."
sleep 10

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📍 Your API is live at:"
railway open
echo ""
echo "🔍 Check deployment status:"
echo "   railway logs"
echo ""
echo "⚙️  Configure additional settings:"
echo "   1. Go to https://railway.app/dashboard"
echo "   2. Select your project"
echo "   3. Add email settings (SMTP_HOST, SMTP_USER, etc.)"
echo "   4. Configure custom domain (optional)"
echo ""
echo "📚 Next steps:"
echo "   1. Test the API health check: curl https://your-url.railway.app/health"
echo "   2. Access admin dashboard: https://your-url.railway.app/admin.html"
echo "   3. Create your admin account via API"
echo ""
echo "✅ All done! Your API is production-ready."
