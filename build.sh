#!/bin/bash

echo "Installing backend dependencies..."
cd backend
npm install
npx tsc
cd ..

echo "Installing frontend dependencies..."
cd frontend
npm install
npm run build
cd ..

echo "Build complete!"
