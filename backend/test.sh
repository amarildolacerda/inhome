#!/bin/bash
# Test script for the backend API

echo "Starting server..."
rm -f database.sqlite

# Start server in background
node src/server.js &
SERVER_PID=$!

# Wait for server to be ready
sleep 5

echo ""
echo "=== 1. Health Check ==="
curl -s http://localhost:3001/api/health
echo ""

echo ""
echo "=== 2. Register User ==="
REGISTER_RESULT=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"123456","name":"Admin User"}')
echo "$REGISTER_RESULT"
TOKEN=$(echo "$REGISTER_RESULT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).token)}catch(e){console.log('')}})")

echo ""
echo "=== 3. Login ==="
LOGIN_RESULT=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"123456"}')
echo "$LOGIN_RESULT"

echo ""
echo "=== 4. Create Project ==="
curl -s -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"First Project","description":"A test project"}'
echo ""

echo ""
echo "=== 5. List Projects ==="
curl -s http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 6. Create Task ==="
curl -s -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"First Task","description":"Task description","project_id":1,"priority":"high"}'
echo ""

echo ""
echo "=== 7. Dashboard Stats ==="
curl -s http://localhost:3001/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== ALL TESTS COMPLETE ==="
kill $SERVER_PID 2>/dev/null
