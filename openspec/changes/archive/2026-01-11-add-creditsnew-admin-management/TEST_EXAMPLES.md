# Test Examples for CreditsNew Admin Endpoints

## Prerequisites
- Backend server running on `http://localhost:3005`
- Admin JWT token (get from login endpoint)
- Test user account created in database

## Get Admin Token
```bash
# Login as admin
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-admin-password"
  }'

# Response will include JWT token
# Copy the token for use in subsequent requests
```

## Test Suite

### Test 1: Set CreditsNew with Expiration Reset ✅
```bash
curl -X PATCH http://localhost:3005/api/admin/users/testuser/creditsNew \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "creditsNew": 100,
    "resetExpiration": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Set creditsNew to $100 for testuser",
  "user": {
    "username": "testuser",
    "creditsNew": 100,
    "expiresAt": "2026-01-18T10:00:00.000Z"
  }
}
```

**Verify in MongoDB:**
```javascript
db.usersNew.findOne({ _id: "testuser" })
// Should show:
// - creditsNew: 100
// - expiresAt: ~7 days from now
// - purchasedAt: current timestamp
```

---

### Test 2: Add CreditsNew Without Expiration Reset ✅
```bash
curl -X POST http://localhost:3005/api/admin/users/testuser/creditsNew/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "amount": 25,
    "resetExpiration": false
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Added $25 creditsNew to testuser",
  "user": {
    "username": "testuser",
    "creditsNew": 125,
    "expiresAt": "2026-01-18T10:00:00.000Z"
  }
}
```

**Verify in MongoDB:**
```javascript
db.usersNew.findOne({ _id: "testuser" })
// Should show:
// - creditsNew: 125 (100 + 25)
// - expiresAt: unchanged from previous test
// - purchasedAt: unchanged from previous test
```

---

### Test 3: Add CreditsNew With Expiration Reset ✅
```bash
curl -X POST http://localhost:3005/api/admin/users/testuser/creditsNew/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "amount": 50,
    "resetExpiration": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Added $50 creditsNew to testuser",
  "user": {
    "username": "testuser",
    "creditsNew": 175,
    "expiresAt": "2026-01-18T11:00:00.000Z"
  }
}
```

**Verify in MongoDB:**
```javascript
db.usersNew.findOne({ _id: "testuser" })
// Should show:
// - creditsNew: 175 (125 + 50)
// - expiresAt: updated to 7 days from current time
// - purchasedAt: updated to current timestamp
```

---

### Test 4: Set CreditsNew to Zero ✅
```bash
curl -X PATCH http://localhost:3005/api/admin/users/testuser/creditsNew \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "creditsNew": 0,
    "resetExpiration": false
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Set creditsNew to $0 for testuser",
  "user": {
    "username": "testuser",
    "creditsNew": 0,
    "expiresAt": "2026-01-18T11:00:00.000Z"
  }
}
```

---

### Test 5: Validation Error - Negative Value ❌
```bash
curl -X PATCH http://localhost:3005/api/admin/users/testuser/creditsNew \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "creditsNew": -10
  }'
```

**Expected Response:**
```json
{
  "error": "CreditsNew must be a non-negative number"
}
```
**HTTP Status:** 400

---

### Test 6: Validation Error - Non-Number ❌
```bash
curl -X PATCH http://localhost:3005/api/admin/users/testuser/creditsNew \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "creditsNew": "invalid"
  }'
```

**Expected Response:**
```json
{
  "error": "CreditsNew must be a non-negative number"
}
```
**HTTP Status:** 400

---

### Test 7: Validation Error - Zero Amount in Add ❌
```bash
curl -X POST http://localhost:3005/api/admin/users/testuser/creditsNew/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "amount": 0
  }'
```

**Expected Response:**
```json
{
  "error": "Amount must be a positive number"
}
```
**HTTP Status:** 400

---

### Test 8: Validation Error - Negative Amount ❌
```bash
curl -X POST http://localhost:3005/api/admin/users/testuser/creditsNew/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "amount": -25
  }'
```

**Expected Response:**
```json
{
  "error": "Amount must be a positive number"
}
```
**HTTP Status:** 400

---

### Test 9: User Not Found ❌
```bash
curl -X PATCH http://localhost:3005/api/admin/users/nonexistentuser/creditsNew \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "creditsNew": 100
  }'
```

**Expected Response:**
```json
{
  "error": "User not found"
}
```
**HTTP Status:** 404

---

### Test 10: Unauthorized - No Token ❌
```bash
curl -X PATCH http://localhost:3005/api/admin/users/testuser/creditsNew \
  -H "Content-Type: application/json" \
  -d '{
    "creditsNew": 100
  }'
```

**Expected Response:**
```json
{
  "error": "Unauthorized"
}
```
**HTTP Status:** 401

---

### Test 11: Forbidden - Non-Admin User ❌
```bash
# First login as regular user
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "regularuser",
    "password": "password"
  }'

# Then try to use admin endpoint with regular user token
curl -X PATCH http://localhost:3005/api/admin/users/testuser/creditsNew \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer REGULAR_USER_JWT_TOKEN" \
  -d '{
    "creditsNew": 100
  }'
```

**Expected Response:**
```json
{
  "error": "Forbidden: Admin access required"
}
```
**HTTP Status:** 403

---

## MongoDB Verification Queries

### Check User State
```javascript
// View full user document
db.usersNew.findOne({ _id: "testuser" })

// View only credits-related fields
db.usersNew.findOne(
  { _id: "testuser" },
  {
    _id: 1,
    credits: 1,
    creditsNew: 1,
    creditsUsed: 1,
    tokensUserNew: 1,
    expiresAt: 1,
    purchasedAt: 1
  }
)
```

### Check All Users with CreditsNew
```javascript
db.usersNew.find(
  { creditsNew: { $gt: 0 } },
  { _id: 1, creditsNew: 1, expiresAt: 1 }
).sort({ creditsNew: -1 })
```

### Aggregate Statistics
```javascript
db.usersNew.aggregate([
  {
    $group: {
      _id: null,
      totalCredits: { $sum: "$credits" },
      totalCreditsNew: { $sum: "$creditsNew" },
      usersWithCreditsNew: { $sum: { $cond: [{ $gt: ["$creditsNew", 0] }, 1, 0] } },
      avgCreditsNew: { $avg: "$creditsNew" }
    }
  }
])
```

---

## Postman Collection

You can import these as a Postman collection:

```json
{
  "info": {
    "name": "CreditsNew Admin Endpoints",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Set CreditsNew",
      "request": {
        "method": "PATCH",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{admin_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"creditsNew\": 100,\n  \"resetExpiration\": true\n}"
        },
        "url": {
          "raw": "http://localhost:3005/api/admin/users/{{username}}/creditsNew",
          "host": ["http://localhost"],
          "port": "3005",
          "path": ["api", "admin", "users", "{{username}}", "creditsNew"]
        }
      }
    },
    {
      "name": "Add CreditsNew",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{admin_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"amount\": 25,\n  \"resetExpiration\": false\n}"
        },
        "url": {
          "raw": "http://localhost:3005/api/admin/users/{{username}}/creditsNew/add",
          "host": ["http://localhost"],
          "port": "3005",
          "path": ["api", "admin", "users", "{{username}}", "creditsNew", "add"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "admin_token",
      "value": "YOUR_ADMIN_JWT_TOKEN"
    },
    {
      "key": "username",
      "value": "testuser"
    }
  ]
}
```

---

## Test Checklist

- [ ] Test 1: Set creditsNew with expiration reset
- [ ] Test 2: Add creditsNew without expiration reset
- [ ] Test 3: Add creditsNew with expiration reset
- [ ] Test 4: Set creditsNew to zero
- [ ] Test 5: Validation error - negative value
- [ ] Test 6: Validation error - non-number
- [ ] Test 7: Validation error - zero amount in add
- [ ] Test 8: Validation error - negative amount
- [ ] Test 9: User not found
- [ ] Test 10: Unauthorized - no token
- [ ] Test 11: Forbidden - non-admin user
- [ ] Verify MongoDB state after each test
- [ ] Check UserKey collection sync (if user has active credits)
