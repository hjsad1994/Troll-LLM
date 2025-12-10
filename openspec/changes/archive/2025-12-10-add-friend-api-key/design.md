## Context
Users need a way to share API access with friends for testing without compromising their main API key or allowing unlimited spending. The solution must integrate with existing credit system and RPM limits.

## Goals
- Allow users to create a secondary API key (Friend Key) for sharing
- Enable per-model spending limits to control costs
- Deduct from owner's credits when Friend Key is used
- Follow owner's plan RPM limits
- Provide monitoring dashboard for Friend Key usage

## Non-Goals
- Multiple Friend Keys per user (v1 supports only 1)
- Transfer credits to friends directly
- Separate billing for Friend Key

## Decisions

### 1. Friend Key Data Model
Create new `FriendKey` model in MongoDB:
```typescript
interface IFriendKey {
  _id: string;                    // Friend API key (sk-trollllm-friend-{hex})
  ownerId: string;                // Reference to User._id (owner username)
  isActive: boolean;              // Can be disabled by owner
  createdAt: Date;
  rotatedAt?: Date;
  modelLimits: {                  // Per-model spending limits
    modelId: string;              // e.g., "claude-opus-4-5-20251101"
    limitUsd: number;             // Spending limit in USD
    usedUsd: number;              // Amount used in USD
  }[];
  totalUsedUsd: number;           // Total credits used across all models
  requestsCount: number;          // Total requests made
  lastUsedAt?: Date;
}
```

### 2. API Key Format
- Friend Key format: `sk-trollllm-friend-{32-byte-hex}` (prefix differentiates from main key)
- Allows GoProxy to quickly identify key type during authentication

### 3. Credit Deduction Flow
1. Friend Key request arrives at GoProxy
2. GoProxy validates key, finds owner
3. Check model-specific limit: if `usedUsd >= limitUsd`, reject with 402
4. Process request using owner's credits (main `credits` first, then `refCredits`)
5. After response, update `FriendKey.modelLimits[model].usedUsd` and owner's credits

### 4. RPM Enforcement
- Friend Key inherits owner's plan RPM
- Rate limiting uses owner's username as key (shared with main API key)
- Prevents combined usage exceeding owner's RPM

### 5. Backend API Endpoints
```
POST   /api/user/friend-key              # Generate friend key (one per user)
GET    /api/user/friend-key              # Get friend key info + usage
POST   /api/user/friend-key/rotate       # Rotate friend key
DELETE /api/user/friend-key              # Delete friend key
PUT    /api/user/friend-key/limits       # Set/update model limits
GET    /api/user/friend-key/usage        # Get detailed usage per model
```

### 6. Frontend Page Structure
New page at `/dashboard/friend-key`:
- **Friend Key Section**: Show masked key, copy button, rotate button
- **Model Limits Section**: Table with model name, limit input, used/limit display
- **Usage Monitor**: Progress bars showing $used/$limit per model
- **Activity Log**: Recent requests made with Friend Key

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Owner depletes credits unexpectedly | Show warnings when Friend Key usage is high |
| Friend abuses key | Owner can disable/rotate key anytime |
| Complex auth flow in GoProxy | Cache Friend Key → Owner mapping |

## Migration Plan
1. Deploy backend changes (new model, endpoints)
2. Deploy GoProxy changes (Friend Key auth)
3. Deploy frontend page
4. No data migration needed (new feature)

## Open Questions
- Should we add email notifications when Friend Key hits limits?
- Should we allow multiple Friend Keys per user in future?
