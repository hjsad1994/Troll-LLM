# Design: Admin Endpoints for CreditsNew Management

## Overview
This change adds admin-only HTTP endpoints to manage the `creditsNew` field (OpenHands credits) with the same operations available for `credits` (OhMyGPT credits). The implementation follows the established patterns in `admin.routes.ts` and `user.repository.ts`.

## Architecture

### Component Diagram
```
┌─────────────────────┐
│  Admin Client       │
│  (HTTP Requests)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  admin.routes.ts                        │
│  ┌───────────────────────────────────┐  │
│  │ requireAdmin middleware           │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│  ┌───────────────▼───────────────────┐  │
│  │ PATCH /users/:username/creditsNew │  │
│  │ POST /users/:username/creditsNew/ │  │
│  │      add                          │  │
│  └───────────────┬───────────────────┘  │
└──────────────────┼─────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│  user.repository.ts                      │
│  ┌────────────────────────────────────┐  │
│  │ setCreditsNew(username, credits,   │  │
│  │              resetExpiration)      │  │
│  ├────────────────────────────────────┤  │
│  │ addCreditsNew(username, amount,    │  │
│  │              resetExpiration)      │  │
│  └───────────────┬────────────────────┘  │
└──────────────────┼──────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│  MongoDB: usersNew collection            │
│  { creditsNew, expiresAt, purchasedAt }  │
└──────────────────────────────────────────┘
```

## Implementation Details

### Repository Layer
Two new methods will be added to `userRepository`:

```typescript
// user.repository.ts

async setCreditsNew(
  username: string,
  creditsNew: number,
  resetExpiration: boolean = true
): Promise<IUserNew | null> {
  const updateData: any = { creditsNew };

  if (resetExpiration) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + VALIDITY_DAYS * 24 * 60 * 60 * 1000);
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
    const expiresAt = new Date(now.getTime() + VALIDITY_DAYS * 24 * 60 * 60 * 1000);
    updateData.expiresAt = expiresAt;
    updateData.purchasedAt = now;
  }

  return UserNew.findByIdAndUpdate(username, updateData, { new: true });
}
```

**Design Rationale:**
- Mirrors the existing `setCredits()` and `addCredits()` methods exactly
- Uses MongoDB `$inc` operator for atomic increment operations
- `resetExpiration` defaults to `true` for consistency with payment flow
- Returns the updated user document for response composition

### Route Layer
Two new routes will be added to `admin.routes.ts`:

```typescript
// admin.routes.ts

router.patch('/users/:username/creditsNew', requireAdmin, async (req, res) => {
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
});

router.post('/users/:username/creditsNew/add', requireAdmin, async (req, res) => {
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
});
```

**Design Rationale:**
- Follows identical patterns to existing `/users/:username/credits` and `/users/:username/credits/add` routes
- Applies `requireAdmin` middleware for authorization
- Validates input before calling repository methods
- Returns structured JSON responses with success flag and updated user state
- Error handling matches existing routes (400 for validation, 404 for not found)

## Data Flow

### Set CreditsNew Flow
1. Admin sends `PATCH /admin/users/alice/creditsNew` with `{ creditsNew: 100, resetExpiration: true }`
2. `requireAdmin` middleware validates admin privileges
3. Route handler validates `creditsNew >= 0`
4. `userRepository.setCreditsNew()` updates MongoDB:
   - Sets `creditsNew: 100`
   - Sets `expiresAt: now + 7 days`
   - Sets `purchasedAt: now`
5. Updated user document returned to client

### Add CreditsNew Flow
1. Admin sends `POST /admin/users/bob/creditsNew/add` with `{ amount: 25, resetExpiration: false }`
2. `requireAdmin` middleware validates admin privileges
3. Route handler validates `amount > 0`
4. `userRepository.addCreditsNew()` updates MongoDB:
   - Increments `creditsNew` by 25 (atomic operation)
   - Does NOT modify `expiresAt` or `purchasedAt` (resetExpiration: false)
5. Updated user document returned to client

## Security Considerations

### Authorization
- Both endpoints require `requireAdmin` middleware
- Non-admin users receive 401/403 responses
- No privilege escalation vectors introduced

### Input Validation
- `creditsNew` must be non-negative number (>= 0)
- `amount` must be positive number (> 0)
- Non-numeric inputs rejected with 400 status
- Missing required fields rejected with 400 status

### Audit Trail
- No explicit audit logging implemented in this change
- MongoDB change streams or application logs can track modifications
- Future enhancement: Add admin action logging

## Consistency with Existing System

### Pattern Alignment
This implementation maintains consistency with:
- Existing `credits` endpoints structure and behavior
- Repository method naming conventions (`setX`, `addX`)
- Validation error message format
- Response JSON structure
- Expiration calculation using `VALIDITY_DAYS` constant

### Dual Credit System
The system maintains two independent credit balances:
- `credits`: OhMyGPT (port 8005) - existing admin endpoints
- `creditsNew`: OpenHands (port 8004) - **new admin endpoints (this change)**

Both share the same `expiresAt` field, which expires both balances simultaneously. This design is intentional and matches the current payment flow behavior.

## Testing Strategy

### Unit Tests (Optional)
- Repository method tests (mocked MongoDB)
- Route handler tests (mocked repository)

### Integration Tests (Recommended)
- End-to-end API tests with test database
- Verify expiration reset behavior
- Test validation edge cases
- Confirm error responses

### Manual Testing (Required)
- Use curl/Postman to test both endpoints
- Verify MongoDB state changes
- Test authorization with non-admin user
- Confirm expiration calculation accuracy

## Migration and Rollout

### Database Migration
**None required.** The `creditsNew` field already exists in the `usersNew` collection schema.

### Deployment Steps
1. Deploy backend changes (new routes + repository methods)
2. Verify endpoints accessible via admin credentials
3. Test with non-production user accounts
4. Document endpoints in admin API reference (if exists)

### Rollback Plan
- Remove route handlers from `admin.routes.ts`
- Remove repository methods from `user.repository.ts`
- No database changes to revert

## Future Enhancements

### Potential Improvements (Out of Scope)
1. **Admin UI Integration**: Add frontend controls in admin dashboard to manage `creditsNew`
2. **Audit Logging**: Track admin credit modifications in dedicated `admin_actions` collection
3. **Bulk Operations**: Support batch credit updates for multiple users
4. **Credit Transfer**: Allow transferring credits between `credits` and `creditsNew` fields
5. **Rate Conversion API**: Automate credit conversion based on current exchange rates
6. **Notifications**: Send email/Discord notifications when admin modifies user credits

### Related Work
- Existing `configure-dual-domain-deployment` change
- `display-creditsnew-dashboard` change (UI side)
- `fix-billing-routing-main-target` change (routing logic)

## Open Questions
None at this time.
