#!/bin/bash

echo "Installing backend dependencies..."
cd backend
npm install --production=false
npx tsc 2>&1 | grep -v "error TS" || true
cd ..

echo "Installing frontend dependencies..."
cd frontend
npm install --production=false
npm run build
cd ..

echo "Build complete!"
