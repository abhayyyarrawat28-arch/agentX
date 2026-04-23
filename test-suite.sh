#!/bin/bash
BASE="http://localhost:5001/api"
PASS=0
FAIL=0
ISSUES=""
TS=$(date +%s)
TEST_EMP_ID="TESTAGENT${TS}"
TEST_PAN="ABCDE${TS: -4}F"
TEST_EMAIL="test${TS}@example.com"
CUST_PAN="BXZPS${TS: -4}K"
TEST_MOBILE="98${TS: -8}"

pass() { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); ISSUES="$ISSUES\n  ❌ $1"; echo "  ❌ $1"; }

echo "============================================"
echo "  COMPREHENSIVE API & SECURITY TEST SUITE"
echo "============================================"

# ── AUTH TESTS ──
echo ""
echo "── AUTH TESTS ──"

echo "1. Agent login (valid)"
RES=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"employeeId":"ADV001","password":"advisor123"}')
if echo "$RES" | grep -q '"success":true'; then pass "Agent login OK"; else fail "Agent login FAILED: $RES"; fi
AGENT_TOKEN=$(echo "$RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null)

echo "2. Admin login (valid)"
RES=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"employeeId":"ADMIN001","password":"admin123"}')
if echo "$RES" | grep -q '"success":true'; then pass "Admin login OK"; else fail "Admin login FAILED: $RES"; fi
ADMIN_TOKEN=$(echo "$RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null)

echo "3. Wrong password"
RES=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"employeeId":"ADV001","password":"wrong"}')
if echo "$RES" | grep -q '"success":false'; then pass "Wrong password rejected"; else fail "Wrong password NOT rejected"; fi

echo "4. Missing fields"
RES=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{}')
if echo "$RES" | grep -q '"success":false'; then pass "Missing fields rejected"; else fail "Missing fields NOT rejected"; fi

echo "5. Non-existent user"
RES=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"employeeId":"FAKE999","password":"test"}')
if echo "$RES" | grep -q '"success":false'; then pass "Non-existent user rejected"; else fail "Non-existent user NOT rejected"; fi

# ── SECURITY: TOKEN TESTS ──
echo ""
echo "── SECURITY: TOKEN TESTS ──"

echo "6. No token → 401"
RES=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/agent/dashboard")
if [ "$RES" = "401" ]; then pass "No token returns 401"; else fail "No token returns $RES (expected 401)"; fi

echo "7. Invalid token → 401"
RES=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/agent/dashboard" -H "Authorization: Bearer invalidtoken123")
if [ "$RES" = "401" ]; then pass "Invalid token returns 401"; else fail "Invalid token returns $RES (expected 401)"; fi

echo "8. Agent can't access admin dashboard"
RES=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/dashboard" -H "Authorization: Bearer $AGENT_TOKEN")
if [ "$RES" = "403" ]; then pass "Agent blocked from admin dashboard (403)"; else fail "Agent got $RES on admin dashboard (expected 403)"; fi

echo "9. Agent can't access admin configs"
RES=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/configs" -H "Authorization: Bearer $AGENT_TOKEN")
if [ "$RES" = "403" ]; then pass "Agent blocked from configs (403)"; else fail "Agent got $RES on configs (expected 403)"; fi

echo "10. Agent can't access admin users"
RES=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/users" -H "Authorization: Bearer $AGENT_TOKEN")
if [ "$RES" = "403" ]; then pass "Agent blocked from users (403)"; else fail "Agent got $RES on users (expected 403)"; fi

echo "11. Admin can't access calculators"
RES=$(curl -s "$BASE/calculator/mdrt" -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/calculator/mdrt" -H "Authorization: Bearer $ADMIN_TOKEN")
if [ "$HTTP" = "403" ]; then pass "Admin blocked from calculators (403)"; else fail "Admin got $HTTP on calculators (expected 403): $RES"; fi

# ── REGISTRATION WORKFLOW ──
echo ""
echo "── REGISTRATION WORKFLOW ──"

echo "12. Agent self-registration"
RES=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{
  \"fullName\":\"Test Agent\",\"dateOfBirth\":\"1990-01-15\",\"gender\":\"male\",
  \"employeeId\":\"$TEST_EMP_ID\",\"branchId\":\"BR001\",\"mobile\":\"$TEST_MOBILE\",
  \"email\":\"$TEST_EMAIL\",\"panNumber\":\"$TEST_PAN\",
  \"licenseNumber\":\"LIC123456\",\"licenseExpiry\":\"2028-12-31\",\"yearsOfExperience\":3
}")
echo "  Register response: $RES"
if echo "$RES" | grep -q 'pending\|success'; then pass "Registration submitted"; else fail "Registration FAILED: $RES"; fi
REG_ID=$(echo "$RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('registrationId',''))" 2>/dev/null)

echo "13. Check registration status"
if [ -n "$REG_ID" ] && [ "$REG_ID" != "" ]; then
  RES=$(curl -s "$BASE/auth/register/status/$REG_ID")
  if echo "$RES" | grep -q 'pending'; then pass "Registration status = pending"; else fail "Registration status FAILED: $RES"; fi
else
  fail "No registration ID to check status"
fi

echo "14. Admin lists registrations"
RES=$(curl -s "$BASE/admin/registrations" -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$RES" | grep -q '"success":true'; then pass "Admin list registrations OK"; else fail "Admin list registrations FAILED: $RES"; fi

echo "15. Admin approves registration"
if [ -n "$REG_ID" ] && [ "$REG_ID" != "" ]; then
  RES=$(curl -s -X POST "$BASE/admin/registrations/$REG_ID/approve" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{}')
  echo "  Approve response: $RES"
  if echo "$RES" | grep -q 'approved\|success\|userId'; then pass "Registration approved"; else fail "Approval FAILED: $RES"; fi
else
  fail "No registration ID to approve"
fi

# ── AGENT DASHBOARD ──
echo ""
echo "── AGENT DASHBOARD ──"

echo "16. Agent dashboard"
RES=$(curl -s "$BASE/agent/dashboard" -H "Authorization: Bearer $AGENT_TOKEN")
if echo "$RES" | grep -q '"success":true'; then pass "Agent dashboard OK"; else fail "Agent dashboard FAILED: $RES"; fi

# ── CUSTOMER CRUD ──
echo ""
echo "── CUSTOMER CRUD ──"

echo "17. Create customer"
RES=$(curl -s -X POST "$BASE/customers" -H "Authorization: Bearer $AGENT_TOKEN" -H "Content-Type: application/json" -d "{
  \"firstName\":\"Rahul\",\"lastName\":\"Sharma\",\"dateOfBirth\":\"1985-06-15\",\"gender\":\"male\",
  \"panNumber\":\"$CUST_PAN\",\"aadhaarLast4\":\"5678\",\"mobile\":\"9988776655\",
  \"address\":{\"street\":\"123 Main St\",\"city\":\"Mumbai\",\"state\":\"Maharashtra\",\"pincode\":\"400001\"},
  \"relationToProposer\":\"self\"
}")
echo "  Create customer response: $RES"
if echo "$RES" | grep -q '"success":true\|Rahul'; then pass "Customer created"; else fail "Customer create FAILED: $RES"; fi
CUST_ID=$(echo "$RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('_id',''))" 2>/dev/null)

echo "18. List customers"
RES=$(curl -s "$BASE/customers" -H "Authorization: Bearer $AGENT_TOKEN")
if echo "$RES" | grep -q '"success":true'; then pass "List customers OK"; else fail "List customers FAILED: $RES"; fi

echo "19. Get customer by ID"
if [ -n "$CUST_ID" ] && [ "$CUST_ID" != "" ]; then
  RES=$(curl -s "$BASE/customers/$CUST_ID" -H "Authorization: Bearer $AGENT_TOKEN")
  if echo "$RES" | grep -q '"success":true\|Rahul'; then pass "Get customer OK"; else fail "Get customer FAILED: $RES"; fi
else
  fail "No customer ID to fetch"
fi

echo "20. Update customer"
if [ -n "$CUST_ID" ] && [ "$CUST_ID" != "" ]; then
  RES=$(curl -s -X PATCH "$BASE/customers/$CUST_ID" -H "Authorization: Bearer $AGENT_TOKEN" -H "Content-Type: application/json" -d '{"mobile":"9988776600"}')
  if echo "$RES" | grep -q '"success":true'; then pass "Update customer OK"; else fail "Update customer FAILED: $RES"; fi
else
  fail "No customer ID to update"
fi

# ── POLICY CRUD ──
echo ""
echo "── POLICY CRUD ──"

echo "21. List policies"
RES=$(curl -s "$BASE/policies" -H "Authorization: Bearer $AGENT_TOKEN")
echo "  List policies: $RES"
if echo "$RES" | grep -q '"success":true'; then pass "List policies OK"; else fail "List policies FAILED: $RES"; fi

echo "22. Get products"
RES=$(curl -s "$BASE/products" -H "Authorization: Bearer $AGENT_TOKEN")
if echo "$RES" | grep -q '"success":true'; then pass "List products OK"; else fail "List products FAILED: $RES"; fi
PROD_ID=$(echo "$RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',[])[0].get('_id',''))" 2>/dev/null)

# ── CALCULATORS ──
echo ""
echo "── CALCULATOR TESTS ──"

echo "23. Forward calculator"
RES=$(curl -s -X POST "$BASE/calculator/forward" -H "Authorization: Bearer $AGENT_TOKEN" -H "Content-Type: application/json" -d '{
  "policiesSold":10,"averageAnnualPremium":50000,"productType":"Savings Plan","persistencyRate":0.8
}')
if echo "$RES" | grep -q '"success":true'; then pass "Forward calculator OK"; else fail "Forward calculator FAILED: $RES"; fi

echo "24. Reverse calculator"
RES=$(curl -s -X POST "$BASE/calculator/reverse" -H "Authorization: Bearer $AGENT_TOKEN" -H "Content-Type: application/json" -d '{
  "targetIncome":100000,"incomePeriod":"monthly","productType":"Savings Plan"
}')
if echo "$RES" | grep -q '"success":true'; then pass "Reverse calculator OK"; else fail "Reverse calculator FAILED: $RES"; fi

echo "25. Simulation module"
RES=$(curl -s "$BASE/calculator/simulation/conditions" -H "Authorization: Bearer $AGENT_TOKEN")
SIM_CONDITION=$(echo "$RES" | python3 -c "import sys,json; d=json.load(sys.stdin); conditions=d.get('data',{}).get('conditions',[]); print(conditions[0].get('key','') if conditions else '')" 2>/dev/null)
if [ -z "$SIM_CONDITION" ]; then
  fail "Simulation conditions FAILED: $RES"
else
  RES=$(curl -s -X POST "$BASE/calculator/simulation" -H "Authorization: Bearer $AGENT_TOKEN" -H "Content-Type: application/json" -d "{
    \"policiesSold\":10,\"averageAnnualPremium\":50000,\"productType\":\"Savings Plan\",\"selectedConditionKey\":\"$SIM_CONDITION\"
  }")
  if echo "$RES" | grep -q '"success":true'; then pass "Simulation module OK"; else fail "Simulation module FAILED: $RES"; fi
fi

echo "26. MDRT tracker"
RES=$(curl -s "$BASE/calculator/mdrt" -H "Authorization: Bearer $AGENT_TOKEN")
if echo "$RES" | grep -q '"success":true'; then pass "MDRT tracker OK"; else fail "MDRT tracker FAILED: $RES"; fi

echo "27. Activity predictor"
RES=$(curl -s -X POST "$BASE/calculator/activity" -H "Authorization: Bearer $AGENT_TOKEN" -H "Content-Type: application/json" -d '{
  "meetingsPerWeek":10,"conversionRate":0.2,"averagePremiumPerSale":50000,"productType":"Term Plan"
}')
if echo "$RES" | grep -q '"success":true'; then pass "Activity predictor OK"; else fail "Activity predictor FAILED: $RES"; fi

# ── ADMIN ENDPOINTS ──
echo ""
echo "── ADMIN ENDPOINTS ──"

echo "28. Admin dashboard"
RES=$(curl -s "$BASE/admin/dashboard" -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$RES" | grep -q '"success":true'; then pass "Admin dashboard OK"; else fail "Admin dashboard FAILED: $RES"; fi

echo "29. Get configs"
RES=$(curl -s "$BASE/admin/configs" -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$RES" | grep -q '"success":true'; then pass "Get configs OK"; else fail "Get configs FAILED: $RES"; fi

echo "30. List users"
RES=$(curl -s "$BASE/admin/users" -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$RES" | grep -q '"success":true'; then pass "List users OK"; else fail "List users FAILED: $RES"; fi

echo "31. List logs"
RES=$(curl -s "$BASE/admin/logs" -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$RES" | grep -q '"success":true'; then pass "List logs OK"; else fail "List logs FAILED: $RES"; fi

echo "32. Admin agents overview"
RES=$(curl -s "$BASE/admin/agents" -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$RES" | grep -q '"success":true'; then pass "Admin agents overview OK"; else fail "Admin agents overview FAILED: $RES"; fi

# ── SECURITY: INPUT VALIDATION ──
echo ""
echo "── SECURITY: INPUT VALIDATION ──"

echo "33. NoSQL injection attempt in login"
RES=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"employeeId":{"$gt":""},"password":"test"}')
if echo "$RES" | grep -q '"success":false'; then pass "NoSQL injection blocked"; else fail "NoSQL injection NOT blocked: $RES"; fi

echo "34. XSS in registration"
RES=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{
  \"fullName\":\"<script>alert(1)</script>\",\"dateOfBirth\":\"1990-01-15\",\"gender\":\"male\",
  \"employeeId\":\"XSS${TS}\",\"branchId\":\"BR001\",\"mobile\":\"97${TS: -8}\",
  \"email\":\"xss${TS}@example.com\",\"panNumber\":\"ABCDE${TS: -4}G\",
  \"licenseNumber\":\"LIC123\",\"licenseExpiry\":\"2028-12-31\",\"yearsOfExperience\":1
}")
echo "  XSS test response: $RES"
# Should at minimum not crash

echo "35. Oversized payload"
BIGDATA=$(python3 -c "print('A'*100000)")
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d "{\"employeeId\":\"$BIGDATA\",\"password\":\"test\"}")
if [ "$HTTP" != "500" ]; then pass "Oversized payload handled (HTTP $HTTP)"; else fail "Server error on oversized payload"; fi

# ── CORS ──
echo ""
echo "── CORS TEST ──"

echo "36. CORS headers present"
RES=$(curl -s -I -X OPTIONS "$BASE/auth/login" -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST" 2>&1)
if echo "$RES" | grep -qi "access-control"; then pass "CORS headers present"; else fail "CORS headers MISSING"; fi

# ── FRONTEND TESTS ──
echo ""
echo "── FRONTEND TESTS ──"

echo "37. Agent app serves HTML"
RES=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
if [ "$RES" = "200" ]; then pass "Agent app serves (200)"; else fail "Agent app HTTP $RES"; fi

echo "38. Admin app serves HTML"
RES=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/)
if [ "$RES" = "200" ]; then pass "Admin app serves (200)"; else fail "Admin app HTTP $RES"; fi

# ── SUMMARY ──
echo ""
echo "============================================"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "============================================"
if [ $FAIL -gt 0 ]; then
  echo "ISSUES:"
  echo -e "$ISSUES"
fi
