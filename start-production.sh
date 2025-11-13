#!/bin/bash

# Production startup script for Edarna
echo "🚀 Starting Edarna in production mode..."

# Set environment variables
export NODE_ENV=production
export PORT=5000

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with required variables:"
    echo "- DATABASE_URL"
    echo "- SESSION_SECRET"
    echo "- BROKER_PASSWORD"
    exit 1
fi

# Load environment variables
source .env

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not set in .env file"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ ! -d "dist/public" ]; then
    echo "❌ Build failed! dist/public directory not found."
    exit 1
fi

# Push database schema
echo "🗄️  Pushing database schema..."
npm run db:push

# Start the application
echo "✅ Starting server on port $PORT..."
node dist/index.js
