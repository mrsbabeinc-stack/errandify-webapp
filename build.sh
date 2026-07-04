#!/bin/bash
set -e

echo "Installing backend dependencies..."
cd backend
npm install
npm run build
cd ..

echo "Installing frontend dependencies..."
cd frontend
npm install --production=false
npm run build
cd ..

echo "Build complete!"
