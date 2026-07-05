#!/bin/bash
set -e

echo "Installing backend dependencies..."
cd backend
npm install
echo "Compiling TypeScript..."
npx tsc
cd ..

echo "Installing frontend dependencies..."
cd frontend
npm install
npm run build
cd ..

echo "Build complete!"
