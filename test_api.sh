#!/bin/bash

# Get a token first (mock login)
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9123456789","otp":"123456"}')

echo "Login Response: $RESPONSE"
TOKEN=$(echo $RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token"
  exit 1
fi

echo "Got token: $TOKEN"

# Try to get errand ID 1
curl -s -X GET http://localhost:3000/api/errands/1 \
  -H "Authorization: Bearer $TOKEN" | jq .

