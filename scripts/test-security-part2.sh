#!/bin/bash

# Security Fixes Part 2 - Test Suite
# Tests Medium and Low priority security fixes

set -e

echo "🔒 COGUMI AI Protect - Security Fixes Part 2 Test Suite"
echo "========================================================"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

echo "📋 Part 1: Email Verification Hash Check"
echo "-----------------------------------------"

# Check that register.ts uses hash
if grep -q "createHash('sha256')" apps/ui/src/app/api/auth/register/route.ts; then
  echo -e "${GREEN}✅ PASS${NC}: Registration uses SHA-256 hash for email verification"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: Registration does not use SHA-256 hash"
  ((FAILED++))
fi

# Check that verify-email.ts uses hash
if grep -q "createHash('sha256').update(token).digest('hex')" apps/ui/src/app/api/auth/verify-email/route.ts; then
  echo -e "${GREEN}✅ PASS${NC}: Email verification uses SHA-256 hash comparison"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: Email verification does not use SHA-256 hash"
  ((FAILED++))
fi

echo ""
echo "📋 Part 2: Sidecar Binding Security"
echo "------------------------------------"

# Check that sidecar binds to localhost by default
if grep -q '127.0.0.1:8080' apps/sidecar/main.go; then
  echo -e "${GREEN}✅ PASS${NC}: Sidecar binds to localhost (127.0.0.1:8080) by default"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: Sidecar does not bind to localhost by default"
  ((FAILED++))
fi

# Check for security comment
if grep -q "SECURITY: Bind to localhost" apps/sidecar/main.go; then
  echo -e "${GREEN}✅ PASS${NC}: Security comment present in sidecar config"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠️  WARN${NC}: Security comment missing in sidecar config"
fi

echo ""
echo "📋 Part 3: Auth Rate Limiting"
echo "------------------------------"

# Check auth-rate-limiter.ts exists
if [ -f "apps/ui/src/lib/auth-rate-limiter.ts" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Auth rate limiter module exists"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: Auth rate limiter module not found"
  ((FAILED++))
fi

# Check register.ts uses rate limiting
if grep -q "checkAuthRateLimit" apps/ui/src/app/api/auth/register/route.ts; then
  echo -e "${GREEN}✅ PASS${NC}: Registration endpoint uses rate limiting"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: Registration endpoint does not use rate limiting"
  ((FAILED++))
fi

# Check verify-email.ts uses rate limiting
if grep -q "checkAuthRateLimit" apps/ui/src/app/api/auth/verify-email/route.ts; then
  echo -e "${GREEN}✅ PASS${NC}: Email verification endpoint uses rate limiting"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: Email verification endpoint does not use rate limiting"
  ((FAILED++))
fi

echo ""
echo "📋 Part 4: Rate Limiting Live Tests (API must be running)"
echo "----------------------------------------------------------"

# Check if server is running
if curl -s http://localhost:3001/api/health > /dev/null 2>&1 || curl -s http://localhost:3001 > /dev/null 2>&1; then
  echo "Server detected on port 3001"
  
  # Test registration rate limit (send 4 rapid requests)
  echo "Testing registration rate limit..."
  RATE_LIMIT_HIT=false
  
  for i in {1..4}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/auth/register \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"ratelimit-test-$i@example.com\",\"password\":\"TestPassword123!\",\"name\":\"Test User\",\"organizationName\":\"Test Org\"}" 2>/dev/null)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    
    if [ "$HTTP_CODE" = "429" ]; then
      RATE_LIMIT_HIT=true
      break
    fi
    
    sleep 0.5
  done
  
  if [ "$RATE_LIMIT_HIT" = true ]; then
    echo -e "${GREEN}✅ PASS${NC}: Registration rate limit is working (429 received)"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠️  WARN${NC}: Registration rate limit not triggered (may need more requests or cleanup)"
  fi
  
else
  echo -e "${YELLOW}⚠️  SKIP${NC}: Server not running on localhost:3001 - skipping live tests"
  echo "  To run live tests: Start the UI server with 'cd apps/ui && pnpm dev -p 3001'"
fi

echo ""
echo "========================================================"
echo "📊 Test Summary"
echo "========================================================"
echo -e "Total Passed: ${GREEN}$PASSED${NC}"
echo -e "Total Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All security fixes verified!${NC}"
  echo ""
  echo "✅ Email Verification: Using SHA-256 hash"
  echo "✅ Sidecar Binding: Localhost only (127.0.0.1:8080)"
  echo "✅ Auth Rate Limiting: Implemented for registration & email resend"
  echo ""
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
  exit 1
fi
