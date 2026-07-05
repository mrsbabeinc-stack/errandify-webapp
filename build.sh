#!/bin/bash
set -e

echo "Installing backend dependencies..."
cd backend
npm install --only=prod
echo "Compiling TypeScript..."
./node_modules/.bin/tsc
cd ..

echo "Installing frontend dependencies..."
cd frontend
npm install --only=prod
npm run build
cd ..

echo "Build complete!"
