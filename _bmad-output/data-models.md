# TrollLLM - Data Models

## MongoDB Collections

### 1. users (UserNew)

User accounts and billing information.

```typescript
interface UserNew {
  _id: ObjectId;
  username: string;              // Unique username
  password: string;              // bcrypt hashed
  role: 'user' | 'admin';        // User role

  // Billing
  credits: number;               // Current credit balance (USD)
  refCredits: number;            // Referral credits (USD)
  tokensUsed: number;            // Total tokens consumed
  inputTokensUsed: number;       // Input tokens consumed
  outputTokensUsed: number;      // Output tokens consumed
  creditsExpireAt: Date | null;  // Credit expiration date

  // Profile
  discordId?: string;            // Discord ID for support
  isActive: boolean;             // Account status

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}
```

**Indexes:**
- `username`: unique
- `discordId`: sparse
- `creditsExpireAt`: for expiration queries

---

### 2. user_keys (UserKey)

API keys for authentication.

```typescript
interface UserKey {
  _id: ObjectId;
  name: string;                  // Username reference
  key: string;                   // API key (sk-troll-xxx)
  tier: 'dev' | 'pro';           // Rate limit tier
  isActive: boolean;             // Key status

  // Usage tracking
  tokensUsed: number;            // Tokens used with this key
  requestCount: number;          // Total requests
  lastUsedAt: Date;              // Last request timestamp

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `key`: unique
- `name`: for user lookup

---

### 3. friend_keys (FriendKey)

Shared API keys with spending limits.

```typescript
interface FriendKey {
  _id: ObjectId;
  key: string;                   // Friend key (fk-xxx)
  ownerUsername: string;         // Owner's username
  name: string;                  // Display name
  isActive: boolean;             // Key status

  // Spending limits per model
  modelLimits: Map<string, ModelLimit>;

  // Usage tracking
  totalSpent: number;            // Total USD spent
  tokensUsed: number;            // Total tokens
  requestCount: number;          // Total requests
  lastUsedAt: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

interface ModelLimit {
  enabled: boolean;              // Is model allowed
  dailyLimit: number;            // Daily spend limit (USD)
  spentToday: number;            // Spent today (USD)
  lastResetAt: Date;             // Last daily reset
}
```

**Indexes:**
- `key`: unique
- `ownerUsername`: for owner lookup

---

### 4. request_logs (RequestLog)

Detailed request logging for analytics.

```typescript
interface RequestLog {
  _id: ObjectId;
  userId: string;                // Username
  userKeyId: string;             // API key used
  trollKeyId: string;            // Upstream key used

  // Request details
  model: string;                 // Model ID
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheHitTokens: number;

  // Billing
  creditsCost: number;           // USD cost
  tokensUsed: number;            // Billing tokens

  // Response
  statusCode: number;
  latencyMs: number;

  // Timestamp
  createdAt: Date;
}
```

**Indexes:**
- `userId`: for user queries
- `createdAt`: for time-based queries
- `model`: for model analytics

---

### 5. proxies (Proxy)

HTTP proxy pool configuration.

```typescript
interface Proxy {
  _id: ObjectId;
  name: string;                  // Display name
  host: string;                  // Proxy host
  port: number;                  // Proxy port
  username?: string;             // Auth username
  password?: string;             // Auth password
  protocol: 'http' | 'https' | 'socks5';

  // Health
  isActive: boolean;
  isHealthy: boolean;
  lastHealthCheck: Date;
  failCount: number;

  // Binding
  boundKeyIds: string[];         // Bound troll keys

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 6. troll_keys (TrollKey)

Factory AI key pool.

```typescript
interface TrollKey {
  _id: string;                   // Key ID (e.g., "key1")
  apiKey: string;                // Actual API key
  isActive: boolean;
  isHealthy: boolean;

  // Usage
  tokensUsed: number;
  requestCount: number;
  lastUsedAt: Date;

  // Health
  lastError?: string;
  lastErrorAt?: Date;
  failCount: number;
}
```

---

### 7. openhands_keys (OpenHandsKey)

OpenHands LLM Proxy key pool.

```typescript
interface OpenHandsKey {
  _id: string;                   // Key ID
  apiKey: string;                // OpenHands API key
  isActive: boolean;
  isHealthy: boolean;

  // Usage
  tokensUsed: number;
  requestsCount: number;
  lastUsedAt: Date;

  // Health
  lastError?: string;
  lastErrorAt?: Date;
  failCount: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 8. openhands_backup_keys (OpenHandsBackupKey)

Backup keys for automatic rotation.

```typescript
interface OpenHandsBackupKey {
  _id: ObjectId;
  apiKey: string;                // Backup API key
  isUsed: boolean;               // Has been activated
  activated: boolean;            // Currently in use
  usedFor?: string;              // Which key slot it replaced

  // Timestamps
  createdAt: Date;
  activatedAt?: Date;
}
```

---

### 9. model_pricing (ModelPricing)

Model pricing configuration (optional, can use config.json).

```typescript
interface ModelPricing {
  _id: ObjectId;
  modelId: string;               // Model ID

  // Pricing per million tokens
  inputPrice: number;
  outputPrice: number;
  cacheWritePrice: number;
  cacheHitPrice: number;

  // Billing
  billingMultiplier: number;     // Markup multiplier

  // Timestamps
  updatedAt: Date;
}
```

---

## Relationships

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │────▶│  user_keys   │────▶│ request_logs │
│  (UserNew)   │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       │
       ▼
┌──────────────┐
│ friend_keys  │
│              │
└──────────────┘


┌──────────────┐     ┌──────────────┐
│   proxies    │◀───▶│  troll_keys  │
│              │     │              │
└──────────────┘     └──────────────┘


┌──────────────┐     ┌────────────────────┐
│openhands_keys│◀────│openhands_backup_keys│
│              │     │                    │
└──────────────┘     └────────────────────┘
```

---

## Key Patterns

### API Key Format
- User keys: `sk-troll-[32 hex chars]`
- Friend keys: `fk-[32 hex chars]`

### Credit System
- Credits are stored in USD
- Deducted after each successful request
- Support for main credits + referral credits
- Automatic expiration checking

### Token Billing
```
billingCost = (inputTokens * inputPrice +
               outputTokens * outputPrice +
               cacheWriteTokens * cacheWritePrice +
               cacheHitTokens * cacheHitPrice) / 1,000,000 * multiplier
```

---

*Generated by BMad Method Document Project Workflow*
*Date: 2025-12-17*
