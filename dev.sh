#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the script directory
cd "$SCRIPT_DIR"

echo "🎧 Starting Hence in development mode..."
echo "======================================="

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies first..."
    npm install
fi

echo "🚀 Starting development server..."
echo "   The application will be available at: http://localhost:3000"
echo "   Server will auto-restart when you make changes"
echo "   Press Ctrl+C to stop the server"
echo ""

# Start the server in development mode
npm run dev 