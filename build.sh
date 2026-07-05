#!/bin/bash
set -e

echo "Building backend..."
cd backend
echo "Compiling TypeScript..."
npm run build
cd ..

echo "Building frontend..."
cd frontend
npm install --omit=dev
npm run build
cd ..

echo "Build complete!"
