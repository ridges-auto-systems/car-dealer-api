#!/bin/bash

set -e

echo "🚗 Setting up Premier Auto Systems API development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. You have version $NODE_VERSION."
    exit 1
fi

echo "✅ Node.js version check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Set up environment file
if [ ! -f .env ]; then
    echo "📄 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual configuration values"
fi

# Set up Git hooks
echo "🔧 Setting up Git hooks..."
npx husky install

# Create logs directory
mkdir -p logs

# Set up database (if PostgreSQL is running)
if command -v psql &> /dev/null; then
    echo "🗃️ Setting up database..."
    npx prisma migrate dev --name init
    npx prisma db seed
else
    echo "⚠️  PostgreSQL not found. Please set up your database manually."
    echo "   Run: npx prisma migrate dev --name init"
    echo "   Then: npx prisma db seed"
fi

echo "🎉 Setup complete! You can now run:"
echo "   npm run dev    - Start development server"
echo "   npm test       - Run tests"
echo "   npm run lint   - Check code quality"