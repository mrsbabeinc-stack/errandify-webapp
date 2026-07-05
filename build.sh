#!/bin/bash
set -e

echo "Installing backend dependencies..."
cd backend
npm install
echo "Compiling TypeScript..."
$(pwd)/node_modules/.bin/tsc
cd ..

echo "Installing frontend dependencies..."
cd frontend
npm install
npm run build
cd ..

echo "Build complete!"
