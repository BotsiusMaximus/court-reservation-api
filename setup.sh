#!/bin/bash

# Court Reservation API - Automated Setup Script
# Run this to set up everything automatically

set -e  # Exit on error

echo "╔═══════════════════════════════════════════════════╗"
echo "║  Court Reservation API - Automated Setup         ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js v14+ from https://nodejs.org/"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Please install PostgreSQL v12+ from https://www.postgresql.org/"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ PostgreSQL version: $(psql --version | head -1)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file with your PostgreSQL credentials!"
    echo "   Open .env and set: DB_USER, DB_PASSWORD"
    echo ""
    read -p "Press Enter after you've edited .env file..."
fi

# Create database (optional)
echo ""
read -p "🗄️  Do you want to create the database now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Source .env to get database name
    export $(cat .env | grep -v '^#' | xargs)
    
    echo "Creating database: $DB_NAME"
    createdb $DB_NAME 2>/dev/null || echo "Database already exists (that's ok)"
    echo "✓ Database ready"
fi

# Run migrations
echo ""
echo "🔧 Running database migrations..."
npm run db:migrate
echo "✓ Migrations complete"
echo ""

# Seed data
read -p "🌱 Do you want to seed test data? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run db:seed
    echo "✓ Test data seeded"
    echo ""
    echo "Test accounts created:"
    echo "  • user1@test.com / password123"
    echo "  • user2@test.com / password123"
    echo "  • admin@test.com / password123"
fi

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                              ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "To start the server:"
echo "  npm start"
echo ""
echo "To start with auto-reload (development):"
echo "  npm run dev"
echo ""
echo "API will be available at: http://localhost:3000"
echo ""
echo "Next steps:"
echo "  1. Start the server"
echo "  2. Import Postman collection"
echo "  3. Test the API"
echo ""
echo "Documentation:"
echo "  • README.md - Full API documentation"
echo "  • QUICKSTART.md - Quick setup guide"
echo "  • PROJECT_SUMMARY.md - Complete overview"
echo ""
echo "⚡ Built by Botsius Maximus - Vanguard Rank 4"
