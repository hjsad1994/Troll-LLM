# Design: Troll-Key Security Architecture

## Context

TrollLLM is a proxy service that sits between users and upstream AI providers. The security model requires:

1. **Troll-Keys** - Backend-only secrets used to authenticate with upstream AI providers
2. **User API Keys** - User-facing keys that authenticate requests to TrollLLM proxy

Users must NEVER have access to Troll-Keys. They should only use their own User API keys.

## Current Architecture Problems

### Problem 1: Missing Access Control
```typescript
// admin.routes.ts - CURRENT (VULNERABLE)
router.get('/troll-keys', (req, res) => trollKeyController.list(req, res));
```
Any authenticated user can access this endpoint.

### Problem 2: Full Key Exposure
```typescript
// troll-key.repository.ts - CURRENT (VULNERABLE)
async findAll(): Promise<ITrollKey[]> {
  return TrollKey.find().sort({ createdAt: -1 }).lean();
  // Returns { _id, apiKey, status, ... } - apiKey is EXPOSED
}
```

### Problem 3: Frontend Access
The `/troll-keys` page has no admin check, allowing any logged-in user to navigate there.

## Goals
- Troll-Keys NEVER exposed to non-admin users
- Troll-Keys NEVER transmitted over network in API responses (except masked)
- Frontend routes for Troll-Key management restricted to admin role only
- Clear separation between User API keys (user-facing) and Troll-Keys (backend-only)

## Non-Goals
- Changing GoProxy implementation (it already handles Troll-Keys securely)
- Changing how users authenticate (User API keys work correctly)
- Encrypting Troll-Keys at rest (out of scope)

## Decisions

### Decision 1: Add Admin-Only Middleware
All Troll-Key routes require `requireAdmin` middleware.

```typescript
// admin.routes.ts - FIXED
router.get('/troll-keys', requireAdmin, (req, res) => trollKeyController.list(req, res));
router.get('/troll-keys/analytics', requireAdmin, (req, res) => trollKeyController.getAllAnalytics(req, res));
router.get('/troll-keys/:id/analytics', requireAdmin, (req, res) => trollKeyController.getAnalytics(req, res));
```

**Rationale**: Even though we're filtering the apiKey field, defense-in-depth requires admin-only access.

### Decision 2: MongoDB Projection to Exclude apiKey
Use MongoDB projection to exclude `apiKey` at the database query level.

```typescript
// troll-key.repository.ts - FIXED
async findAll(): Promise<SafeTrollKey[]> {
  return TrollKey.find()
    .select('-apiKey')  // Exclude apiKey field
    .sort({ createdAt: -1 })
    .lean();
}

async findAllWithMaskedKey(): Promise<SafeTrollKey[]> {
  const keys = await TrollKey.find().sort({ createdAt: -1 }).lean();
  return keys.map(key => ({
    ...key,
    maskedApiKey: this.maskKey(key.apiKey),
    apiKey: undefined, // Never return full key
  }));
}

private maskKey(key: string): string {
  if (!key || key.length < 10) return '***';
  return key.substring(0, 7) + '***' + key.substring(key.length - 3);
}
```

**Rationale**: Projecting at DB level ensures apiKey never enters application memory for list operations.

### Decision 3: Only Show apiKey Once During Creation
The full `apiKey` value should only be returned immediately after creation (like User API keys).

```typescript
// troll-key.controller.ts - create method
async create(req: Request, res: Response): Promise<void> {
  // ... validation ...
  const key = await trollKeyService.createTrollKey(id, apiKey);
  // Return full key ONCE, immediately after creation
  res.status(201).json({
    ...key,
    apiKey: key.apiKey, // Full key shown once
    message: 'Save this key now - it will not be shown again'
  });
}
```

### Decision 4: Frontend Admin Check
Add client-side admin check with redirect:

```typescript
// troll-keys/page.tsx
const { user } = useAuth()
const router = useRouter()

useEffect(() => {
  if (user && user.role !== 'admin') {
    router.replace('/dashboard')
  }
}, [user, router])
```

**Rationale**: Defense-in-depth. Even though backend now requires admin, frontend should also gate access.

## Data Flow (After Fix)

```
User Request → TrollLLM Proxy → Upstream AI
     |              |              |
     |              |              |
  User API Key   Troll-Key     Upstream AI
  (sk-trollllm-xxx)  (NEVER EXPOSED)  Response
     |              |              |
     ↓              ↓              ↓
  Validated     Selected from     Tokens
  by proxy      pool internally   counted
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Admin accidentally reveals key | Key masked even for admins in list view |
| Key needed for debugging | Add secure admin-only endpoint with audit logging |
| Breaking change for existing clients | Admin routes only - no public API changes |

## Migration Plan

1. Deploy backend changes first (add requireAdmin + projection)
2. Deploy frontend changes (admin checks + interface updates)
3. Test all user flows
4. No data migration needed

## Open Questions
- Should we add audit logging when Troll-Keys are accessed?
- Should we implement key encryption at rest?
