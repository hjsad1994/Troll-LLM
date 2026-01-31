# Draft: OpenHands Webhook Implementation

## Requirements (confirmed)

1. **Webhook #1: GET /webhook/openhands/status**
   - Check all OpenHands keys for `need_refresh` status
   - Return: `{ need_refresh: boolean, keys: [...] }`
   - Purpose: Third-party can poll to know when to rotate keys

2. **Webhook #2: POST /webhook/openhands/keys**
   - Accept: `{ apiKey: string }`
   - Auto-generate key ID (e.g., `oh-key-{timestamp}-{random}`)
   - Create key in `openhands_keys` collection
   - Create binding to `proxy-6` with priority 1
   - Return success with created key info

3. **Authentication**: Secret-key based (`X-Webhook-Secret` header)
   - NOT JWT-based (machine-to-machine communication)
   - Environment variable: `OPENHANDS_WEBHOOK_SECRET`

## Research Findings

### Existing Service Functions (openhands.service.ts)
- `listKeys(): Promise<OpenHandsKey[]>` - Gets all keys (can filter for `need_refresh`)
- `createKey(data: { id: string; apiKey: string }): Promise<OpenHandsKey>` - Creates key with `healthy` status
- `createBinding(data: { proxyId: string; openhandsKeyId: string; priority: number })` - Creates binding with `isActive: true`

### OpenHandsKey Interface
```typescript
interface OpenHandsKey {
  _id: string;
  apiKey: string;
  status: string;  // 'healthy', 'need_refresh', 'rate_limited', 'exhausted', 'error'
  tokensUsed: number;
  requestsCount: number;
  lastError?: string;
  cooldownUntil?: Date;
  createdAt: Date;
  updatedAt?: Date;
  // ... other fields
}
```

### Route Registration Pattern (index.ts)
- Admin routes: `app.use('/admin/openhands', authMiddleware, openhandsRoutes);`
- Webhooks should: `app.use('/webhook', webhookRoutes);` (NO authMiddleware)

### Auth Middleware Pattern
- JWT via `Authorization: Bearer <token>` header
- Basic Auth (deprecated) via `Authorization: Basic <base64>`
- For webhooks: Need custom middleware checking `X-Webhook-Secret` header

## Open Questions

1. Should webhook responses mask the API key like admin routes do?
2. What if `proxy-6` doesn't exist? Should we fail or create it?
3. Should we add rate limiting to webhooks?
4. What's the priority scheme for new keys? (Always 1? Or auto-increment?)

## Scope Boundaries

- INCLUDE: 
  - Webhook routes file (`webhook.routes.ts`)
  - Webhook secret middleware
  - Service functions if needed
  - Route registration

- EXCLUDE:
  - Frontend changes
  - goproxy changes
  - Database schema changes
