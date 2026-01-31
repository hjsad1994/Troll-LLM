# OpenHands Webhook Implementation

## TL;DR

> **Quick Summary**: Create two webhook endpoints for third-party OpenHands API key management - one to check key refresh status, one to add new keys with auto-binding.
> 
> **Deliverables**:
> - `backend/src/routes/webhook.routes.ts` - Webhook endpoints
> - `backend/src/middleware/webhook-auth.middleware.ts` - Secret-based auth
> - Updated `backend/src/index.ts` - Route registration
> - Updated `backend/.env.example` - Document new env var
> 
> **Estimated Effort**: Short (2-3 hours)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (middleware) → Task 2 (routes) → Task 3 (registration)

---

## Context

### Original Request
Create two webhooks for OpenHands upstream API key management:
1. **GET /webhook/openhands/status** - Check if any API key has `need_refresh` status
2. **POST /webhook/openhands/keys** - Add new API keys to proxy-6

### Interview Summary
**Key Discussions**:
- Authentication: `X-Webhook-Secret` header (machine-to-machine, not JWT)
- API Key Masking: Full unmasked keys in response (user decision)
- Binding Failure: Create key anyway, include warning in response
- Key Priority: Always priority 1 for new keys
- Rate Limiting: None (machine-to-machine communication)

**Research Findings**:
- Service functions exist: `listKeys()`, `createKey()`, `createBinding()` in `openhands.service.ts`
- `proxy-6` is the standard OpenHands proxy (confirmed in frontend code)
- OpenHandsKey interface includes `status` field with values: `healthy`, `need_refresh`, `rate_limited`, `exhausted`, `error`
- Route registration pattern: `app.use('/webhook', webhookRoutes)` without authMiddleware

### Metis Review
**Identified Gaps** (addressed):
- Missing env var documentation → Added to deliverables
- Edge case: empty webhook secret → Middleware validates non-empty secret
- Edge case: duplicate key ID → Use timestamp+random for uniqueness
- Missing CORS consideration → Webhooks should work without CORS restrictions

---

## Work Objectives

### Core Objective
Enable third-party scripts to monitor OpenHands key health and provision new API keys via secure webhook endpoints.

### Concrete Deliverables
- `backend/src/routes/webhook.routes.ts` - Two webhook endpoints
- `backend/src/middleware/webhook-auth.middleware.ts` - Webhook secret validation
- Updated `backend/src/index.ts` - Route registration
- Updated `backend/.env.example` - Document `OPENHANDS_WEBHOOK_SECRET`

### Definition of Done
- [ ] `GET /webhook/openhands/status` returns keys with `need_refresh` status
- [ ] `POST /webhook/openhands/keys` creates key and binds to proxy-6
- [ ] Invalid/missing `X-Webhook-Secret` returns 401
- [ ] Backend starts without errors after changes

### Must Have
- Webhook secret authentication via `X-Webhook-Secret` header
- Environment variable `OPENHANDS_WEBHOOK_SECRET` for configuration
- Full unmasked API keys in status response
- Auto-generated key IDs with format `oh-key-{timestamp}-{random}`
- Binding to proxy-6 with priority 1

### Must NOT Have (Guardrails)
- NO JWT authentication on webhook routes
- NO frontend changes
- NO goproxy changes
- NO database schema changes
- NO rate limiting middleware
- NO CORS restrictions on webhook routes (machine-to-machine)
- NO modification of existing openhands.service.ts functions

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (backend has no test framework configured)
- **User wants tests**: Manual verification
- **Framework**: N/A

### Automated Verification (Agent-Executable)

**For API/Backend changes** (using Bash curl):
```bash
# Test 1: Status endpoint without auth (should fail)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/webhook/openhands/status
# Assert: HTTP 401

# Test 2: Status endpoint with wrong secret (should fail)
curl -s -o /dev/null -w "%{http_code}" -H "X-Webhook-Secret: wrong" http://localhost:3005/webhook/openhands/status
# Assert: HTTP 401

# Test 3: Status endpoint with correct secret
curl -s -H "X-Webhook-Secret: $OPENHANDS_WEBHOOK_SECRET" http://localhost:3005/webhook/openhands/status
# Assert: HTTP 200, JSON with need_refresh field

# Test 4: Add key endpoint
curl -s -X POST -H "X-Webhook-Secret: $OPENHANDS_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"sk-test-key-123"}' \
  http://localhost:3005/webhook/openhands/keys
# Assert: HTTP 201, JSON with key._id starting with "oh-key-"
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Create webhook auth middleware
└── Task 4: Update .env.example

Wave 2 (After Task 1):
└── Task 2: Create webhook routes (depends on middleware)

Wave 3 (After Task 2):
└── Task 3: Register routes in index.ts

Wave 4 (After Task 3):
└── Task 5: Manual verification
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | 4 |
| 2 | 1 | 3 | None |
| 3 | 2 | 5 | None |
| 4 | None | None | 1 |
| 5 | 3 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 4 | delegate_task(category="quick", run_in_background=true) |
| 2 | 2 | delegate_task(category="quick", run_in_background=false) |
| 3 | 3 | delegate_task(category="quick", run_in_background=false) |
| 4 | 5 | Manual verification via curl |

---

## TODOs

- [ ] 1. Create webhook authentication middleware

  **What to do**:
  - Create new file `backend/src/middleware/webhook-auth.middleware.ts`
  - Implement `webhookAuthMiddleware` function that:
    - Reads `X-Webhook-Secret` header from request
    - Compares against `process.env.OPENHANDS_WEBHOOK_SECRET`
    - Returns 401 if missing, empty, or doesn't match
    - Calls `next()` if valid
  - Export the middleware function

  **Must NOT do**:
  - Do NOT use JWT verification
  - Do NOT add rate limiting
  - Do NOT modify any existing middleware files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file creation with simple logic, <50 lines of code
  - **Skills**: None required
    - Simple Express middleware, no specialized knowledge needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 4)
  - **Blocks**: Task 2
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `backend/src/middleware/auth.middleware.ts:17-51` - Existing middleware pattern (header extraction, response handling)
  - `backend/src/middleware/auth.middleware.ts:1-5` - Import pattern for Express types

  **API/Type References**:
  - Express types: `Request`, `Response`, `NextFunction` from 'express'

  **WHY Each Reference Matters**:
  - `auth.middleware.ts` shows the exact pattern for middleware: async function, header extraction, 401 responses

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Verify file exists and exports webhookAuthMiddleware
  node -e "const m = require('./backend/dist/middleware/webhook-auth.middleware.js'); console.log(typeof m.webhookAuthMiddleware)"
  # Assert: Output is "function"
  ```

  **Evidence to Capture**:
  - [ ] File created at `backend/src/middleware/webhook-auth.middleware.ts`
  - [ ] TypeScript compiles without errors: `cd backend && npm run build`

  **Commit**: NO (groups with Task 2)

---

- [ ] 2. Create webhook routes file

  **What to do**:
  - Create new file `backend/src/routes/webhook.routes.ts`
  - Import: `Router` from express, `z` from zod, `webhookAuthMiddleware`, openhands service functions
  - Apply `webhookAuthMiddleware` to all routes in this router
  - Implement `GET /openhands/status`:
    - Call `listKeys()` to get all keys
    - Filter for keys with `status === 'need_refresh'`
    - Return `{ need_refresh: boolean, keys: [...] }` with FULL unmasked API keys
  - Implement `POST /openhands/keys`:
    - Validate request body with Zod: `{ apiKey: z.string().min(1) }`
    - Generate key ID: `oh-key-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    - Call `createKey({ id, apiKey })`
    - Try `createBinding({ proxyId: 'proxy-6', openhandsKeyId: id, priority: 1 })`
    - If binding fails, include `binding_warning` in response
    - Return 201 with created key info (unmasked)
  - Export default router

  **Must NOT do**:
  - Do NOT mask API keys in response
  - Do NOT add rate limiting
  - Do NOT modify openhands.service.ts
  - Do NOT add CORS middleware

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single route file with two endpoints, follows existing patterns
  - **Skills**: None required
    - Standard Express routing, Zod validation - all patterns exist in codebase

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential)
  - **Blocks**: Task 3
  - **Blocked By**: Task 1 (needs middleware)

  **References**:

  **Pattern References**:
  - `backend/src/routes/openhands.routes.ts:1-18` - Import pattern and Zod schema definition
  - `backend/src/routes/openhands.routes.ts:27-44` - GET endpoint pattern (listKeys, response formatting)
  - `backend/src/routes/openhands.routes.ts:46-63` - POST endpoint pattern (validation, createKey, error handling)
  - `backend/src/routes/openhands.routes.ts:189-202` - createBinding usage pattern

  **API/Type References**:
  - `backend/src/services/openhands.service.ts:47-50` - `listKeys(): Promise<OpenHandsKey[]>`
  - `backend/src/services/openhands.service.ts:57-68` - `createKey(data: { id: string; apiKey: string })`
  - `backend/src/services/openhands.service.ts:105-115` - `createBinding(data: { proxyId, openhandsKeyId, priority })`
  - `backend/src/services/openhands.service.ts:3-21` - OpenHandsKey interface (status field)

  **WHY Each Reference Matters**:
  - `openhands.routes.ts` shows exact patterns for imports, validation schemas, and endpoint structure
  - Service function signatures show exact parameters needed

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Verify file exists and exports router
  node -e "const r = require('./backend/dist/routes/webhook.routes.js'); console.log(typeof r.default)"
  # Assert: Output is "function" (Express Router)
  ```

  **Evidence to Capture**:
  - [ ] File created at `backend/src/routes/webhook.routes.ts`
  - [ ] TypeScript compiles without errors: `cd backend && npm run build`

  **Commit**: NO (groups with Task 3)

---

- [ ] 3. Register webhook routes in index.ts

  **What to do**:
  - Add import: `import webhookRoutes from './routes/webhook.routes.js';`
  - Add route registration BEFORE the 404 handler (around line 68):
    - `app.use('/webhook', webhookRoutes);`
  - Note: NO authMiddleware - webhook uses its own authentication

  **Must NOT do**:
  - Do NOT add authMiddleware to webhook routes
  - Do NOT modify any other route registrations
  - Do NOT change the order of existing routes

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two-line addition to existing file
  - **Skills**: None required
    - Simple import + use statement

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: Task 5
  - **Blocked By**: Task 2 (needs routes file)

  **References**:

  **Pattern References**:
  - `backend/src/index.ts:16` - Import pattern: `import openhandsRoutes from './routes/openhands.routes.js';`
  - `backend/src/index.ts:62` - Payment routes (mixed auth): `app.use('/api/payment', paymentRoutes);`
  - `backend/src/index.ts:67` - OpenHands routes with auth: `app.use('/admin/openhands', authMiddleware, openhandsRoutes);`

  **WHY Each Reference Matters**:
  - Line 16 shows import pattern with .js extension
  - Line 62 shows route registration WITHOUT authMiddleware (same pattern needed)
  - Line 67 shows contrast - admin routes WITH authMiddleware

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Start backend and verify route is accessible
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/webhook/openhands/status
  # Assert: HTTP 401 (auth required, but route exists)
  ```

  **Evidence to Capture**:
  - [ ] Import added to `backend/src/index.ts`
  - [ ] Route registration added before 404 handler
  - [ ] Backend starts without errors: `cd backend && npm run dev`

  **Commit**: YES
  - Message: `feat(backend): add OpenHands webhooks for key status and provisioning`
  - Files: `backend/src/middleware/webhook-auth.middleware.ts`, `backend/src/routes/webhook.routes.ts`, `backend/src/index.ts`
  - Pre-commit: `cd backend && npm run build`

---

- [ ] 4. Update .env.example with webhook secret

  **What to do**:
  - Add to `backend/.env.example` (or create if doesn't exist):
    ```
    # OpenHands Webhook Authentication
    OPENHANDS_WEBHOOK_SECRET=your-webhook-secret-here
    ```
  - Add comment explaining the purpose

  **Must NOT do**:
  - Do NOT add actual secret values
  - Do NOT modify production .env files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line addition to config file
  - **Skills**: None required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `backend/.env.example` (if exists) - Existing env var documentation pattern
  - Root `README.md:Environment Variables` section - Shows env var naming conventions

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Verify env var is documented
  grep -q "OPENHANDS_WEBHOOK_SECRET" backend/.env.example
  # Assert: Exit code 0
  ```

  **Evidence to Capture**:
  - [ ] `OPENHANDS_WEBHOOK_SECRET` documented in `.env.example`

  **Commit**: NO (groups with Task 3)

---

- [ ] 5. Manual verification of webhook endpoints

  **What to do**:
  - Ensure `OPENHANDS_WEBHOOK_SECRET` is set in `backend/.env`
  - Start backend: `cd backend && npm run dev`
  - Run verification curl commands (see Verification Strategy section)
  - Verify all 4 test cases pass

  **Must NOT do**:
  - Do NOT skip any verification step
  - Do NOT commit if any test fails

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification only, no code changes
  - **Skills**: None required

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 3 (needs routes registered)

  **References**:

  **Verification Commands**:
  - See "Automated Verification" section above for exact curl commands

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Full verification suite
  export OPENHANDS_WEBHOOK_SECRET="test-secret"
  
  # Test 1: No auth - expect 401
  [ $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/webhook/openhands/status) = "401" ] && echo "Test 1 PASS" || echo "Test 1 FAIL"
  
  # Test 2: Wrong secret - expect 401
  [ $(curl -s -o /dev/null -w "%{http_code}" -H "X-Webhook-Secret: wrong" http://localhost:3005/webhook/openhands/status) = "401" ] && echo "Test 2 PASS" || echo "Test 2 FAIL"
  
  # Test 3: Correct secret - expect 200
  [ $(curl -s -o /dev/null -w "%{http_code}" -H "X-Webhook-Secret: $OPENHANDS_WEBHOOK_SECRET" http://localhost:3005/webhook/openhands/status) = "200" ] && echo "Test 3 PASS" || echo "Test 3 FAIL"
  
  # Test 4: Add key - expect 201
  [ $(curl -s -o /dev/null -w "%{http_code}" -X POST -H "X-Webhook-Secret: $OPENHANDS_WEBHOOK_SECRET" -H "Content-Type: application/json" -d '{"apiKey":"sk-test-123"}' http://localhost:3005/webhook/openhands/keys) = "201" ] && echo "Test 4 PASS" || echo "Test 4 FAIL"
  ```

  **Evidence to Capture**:
  - [ ] All 4 verification tests pass
  - [ ] Response JSON format matches specification

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 3 | `feat(backend): add OpenHands webhooks for key status and provisioning` | `backend/src/middleware/webhook-auth.middleware.ts`, `backend/src/routes/webhook.routes.ts`, `backend/src/index.ts`, `backend/.env.example` | `npm run build` |

---

## Success Criteria

### Verification Commands
```bash
# Backend builds successfully
cd backend && npm run build  # Expected: No errors

# Backend starts successfully  
cd backend && npm run dev  # Expected: Server starts on port 3005

# Status endpoint works
curl -H "X-Webhook-Secret: $SECRET" http://localhost:3005/webhook/openhands/status
# Expected: {"need_refresh":false,"keys":[]}

# Add key endpoint works
curl -X POST -H "X-Webhook-Secret: $SECRET" -H "Content-Type: application/json" \
  -d '{"apiKey":"sk-test"}' http://localhost:3005/webhook/openhands/keys
# Expected: {"key":{"_id":"oh-key-...","apiKey":"sk-test",...},"binding":{...}}
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Backend compiles and starts
- [ ] Both webhook endpoints respond correctly
- [ ] Authentication works (401 without secret, 200 with secret)
