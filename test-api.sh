#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Errandify Auth API Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Note: Backend must be running for these tests
API_URL="http://localhost:3000"

echo -e "${BLUE}1. Testing SIGNUP${NC}"
echo "Payload: Tan Wei Ming, age 51, mobile 98765432"

SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tan Wei Ming",
    "age": 51,
    "nric": "S1234567A",
    "address": "123 Clementi Road, Singapore 129742",
    "mobile": "98765432",
    "language": "en",
    "role": "asker"
  }')

echo "Response:"
echo "$SIGNUP_RESPONSE" | jq '.' 2>/dev/null || echo "$SIGNUP_RESPONSE"
echo ""

# Extract token if signup successful
TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.accessToken // empty' 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Signup failed - no token returned${NC}\n"
  exit 1
fi

echo -e "${GREEN}✅ Signup successful!${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

echo -e "${BLUE}2. Testing GET /api/auth/me (Protected Endpoint)${NC}"
ME_RESPONSE=$(curl -s -X GET "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$ME_RESPONSE" | jq '.' 2>/dev/null || echo "$ME_RESPONSE"
echo ""

echo -e "${BLUE}3. Testing REQUEST OTP${NC}"
OTP_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/request-otp" \
  -H "Content-Type: application/json" \
  -d '{"mobile": "98765432"}')

echo "Response:"
echo "$OTP_RESPONSE" | jq '.' 2>/dev/null || echo "$OTP_RESPONSE"
echo ""

echo -e "${BLUE}4. Testing VERIFY OTP (Using demo OTP: 123456)${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "98765432",
    "otp": "123456"
  }')

echo "Response:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}5. Database Verification${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${BLUE}Checking users table:${NC}"
psql errandify -c "SELECT id, display_name, mobile, font_size_pref, language_pref FROM users;" 2>/dev/null || echo "PostgreSQL command failed"

echo ""
echo -e "${GREEN}Test complete!${NC}"
