#!/bin/bash

echo "Installing backend dependencies..."
cd backend
npm install --production=false
mkdir -p dist
cp -r src/* dist/ 2>/dev/null || true
cd ..

echo "Installing frontend dependencies..."
cd frontend
npm install --production=false
npm run build
cd ..

echo "Build complete!"
