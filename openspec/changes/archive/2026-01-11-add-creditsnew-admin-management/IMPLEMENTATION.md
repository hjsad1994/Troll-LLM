# Implementation Example

This file shows the exact code changes needed to implement the creditsNew admin endpoints.

## 1. Repository Layer (`backend/src/repositories/user.repository.ts`)

Add these two methods to the `UserRepository` class:

```typescript
// Add these methods to the UserRepository class

async setCreditsNew(
  username: string,
  creditsNew: number,
  resetExpiration: boolean = true
): Promise<IUserNew | null> {
  const updateData: any = { creditsNew };

  if (resetExpiration) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    updateData.expiresAt = expiresAt;
    updateData.purchasedAt = now;
  }

  return UserNew.findByIdAndUpdate(username, updateData, { new: true });
}

async addCreditsNew(
  username: string,
  amount: number,
  resetExpiration: boolean = true
): Promise<IUserNew | null> {
  const updateData: any = { $inc: { creditsNew: amount } };

  if (resetExpiration) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    updateData.expiresAt = expiresAt;
    updateData.purchasedAt = now;
  }

  return UserNew.findByIdAndUpdate(username, updateData, { new: true });
}
```

## 2. Route Layer (`backend/src/routes/admin.routes.ts`)

Add these two route handlers after the existing `/users/:username/refCredits/add` route (around line 226):

```typescript
// Set creditsNew (absolute value) - admin only
router.patch('/users/:username/creditsNew', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { creditsNew, resetExpiration = true } = req.body;

    if (typeof creditsNew !== 'number' || creditsNew < 0) {
      return res.status(400).json({ error: 'CreditsNew must be a non-negative number' });
    }

    const user = await userRepository.setCreditsNew(req.params.username, creditsNew, resetExpiration);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: `Set creditsNew to $${creditsNew} for ${req.params.username}`,
      user: {
        username: user._id,
        creditsNew: user.creditsNew,
        expiresAt: user.expiresAt,
      }
    });
  } catch (error) {
    console.error('Failed to update user creditsNew:', error);
    res.status(500).json({ error: 'Failed to update user creditsNew' });
  }
});

// Add creditsNew (increment) - admin only
router.post('/users/:username/creditsNew/add', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { amount, resetExpiration = true } = req.body;

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const user = await userRepository.addCreditsNew(req.params.username, amount, resetExpiration);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: `Added $${amount} creditsNew to ${req.params.username}`,
      user: {
        username: user._id,
        creditsNew: user.creditsNew,
        expiresAt: user.expiresAt,
      }
    });
  } catch (error) {
    console.error('Failed to add user creditsNew:', error);
    res.status(500).json({ error: 'Failed to add user creditsNew' });
  }
});
```

## 3. Testing Examples

### Test 1: Set creditsNew with expiration reset
```bash
curl -X PATCH http://localhost:3005/api/admin/users/testuser/creditsNew \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "creditsNew": 100,
    "resetExpiration": true
  }'
```

Expected response:
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

### Test 2: Add creditsNew without expiration reset
```bash
curl -X POST http://localhost:3005/api/admin/users/testuser/creditsNew/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "amount": 25,
    "resetExpiration": false
  }'
```

Expected response:
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

### Test 3: Validation error (negative value)
```bash
curl -X PATCH http://localhost:3005/api/admin/users/testuser/creditsNew \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "creditsNew": -10
  }'
```

Expected response:
```json
{
  "error": "CreditsNew must be a non-negative number"
}
```
HTTP Status: 400

### Test 4: User not found
```bash
curl -X PATCH http://localhost:3005/api/admin/users/nonexistent/creditsNew \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "creditsNew": 100
  }'
```

Expected response:
```json
{
  "error": "User not found"
}
```
HTTP Status: 404

### Test 5: Unauthorized (non-admin)
```bash
curl -X PATCH http://localhost:3005/api/admin/users/testuser/creditsNew \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer NON_ADMIN_JWT_TOKEN" \
  -d '{
    "creditsNew": 100
  }'
```

Expected response:
```json
{
  "error": "Forbidden: Admin access required"
}
```
HTTP Status: 403

## 4. MongoDB Verification

After setting creditsNew to 100 with expiration reset:

```javascript
// Connect to MongoDB and check
db.usersNew.findOne({ _id: "testuser" })

// Should show:
{
  _id: "testuser",
  creditsNew: 100,
  expiresAt: ISODate("2026-01-18T10:00:00.000Z"),
  purchasedAt: ISODate("2026-01-11T10:00:00.000Z"),
  // ... other fields
}
```

After adding 25 creditsNew without expiration reset:

```javascript
db.usersNew.findOne({ _id: "testuser" })

// Should show:
{
  _id: "testuser",
  creditsNew: 125,  // 100 + 25
  expiresAt: ISODate("2026-01-18T10:00:00.000Z"),  // unchanged
  purchasedAt: ISODate("2026-01-11T10:00:00.000Z"),  // unchanged
  // ... other fields
}
```

## 5. Integration with Existing System

These new endpoints complement the existing dual credit system:

```
┌─────────────────────────────────────────────────────────┐
│                    User Credit Balances                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  credits (OhMyGPT - port 8005)                          │
│  ├─ PATCH /admin/users/:username/credits      ✅ Exists │
│  └─ POST  /admin/users/:username/credits/add  ✅ Exists │
│                                                          │
│  creditsNew (OpenHands - port 8004)                     │
│  ├─ PATCH /admin/users/:username/creditsNew   🆕 NEW    │
│  └─ POST  /admin/users/:username/creditsNew/  🆕 NEW    │
│           add                                            │
│                                                          │
│  refCredits (Referral credits)                          │
│  ├─ PATCH /admin/users/:username/refCredits   ✅ Exists │
│  └─ POST  /admin/users/:username/refCredits/  ✅ Exists │
│           add                                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 6. Common Use Cases

### Use Case 1: Customer Support - Refund for failed request
Admin refunds $10 to user after a failed OpenHands request:

```bash
curl -X POST http://localhost:3005/api/admin/users/alice/creditsNew/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"amount": 10, "resetExpiration": false}'
```

### Use Case 2: Promotional Credit Grant
Admin grants $50 promotional credits to new user:

```bash
curl -X POST http://localhost:3005/api/admin/users/newuser/creditsNew/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"amount": 50, "resetExpiration": true}'
```

### Use Case 3: Credit Correction
Admin corrects user balance to exact amount ($100):

```bash
curl -X PATCH http://localhost:3005/api/admin/users/bob/creditsNew \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"creditsNew": 100, "resetExpiration": false}'
```

## 7. Deployment Checklist

- [ ] Add `setCreditsNew()` and `addCreditsNew()` methods to `user.repository.ts`
- [ ] Add two route handlers to `admin.routes.ts`
- [ ] Compile TypeScript: `npm run build` in backend directory
- [ ] Test locally with curl/Postman
- [ ] Verify MongoDB updates correctly
- [ ] Test validation error cases
- [ ] Test authorization (admin vs non-admin)
- [ ] Deploy to staging environment
- [ ] Smoke test in staging
- [ ] Deploy to production
- [ ] Update admin documentation (if exists)
