#!/bin/bash
set -e

echo "Installing and building backend..."
cd backend
npm install
echo "Compiling TypeScript..."
npm run build
cd ..

echo "Installing and building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Build complete!"
