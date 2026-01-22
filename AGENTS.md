# AGENTS.md - AI Agent Guidelines for TrollLLM

## Project Overview

TrollLLM is an LLM proxy platform with three components:
- **backend/**: Node.js + Express + TypeScript (API server, port 3005)
- **frontend/**: Next.js 14 + React + TypeScript + Tailwind (port 8080)
- **goproxy/**: Go 1.25+ (high-performance LLM proxy, port 8003)

Database: MongoDB (Mongoose ODM in backend, native driver in goproxy)

---

## Build/Lint/Test Commands

### Backend (Node.js/TypeScript)

```bash
cd backend

# Development
npm install
npm run dev           # tsx watch mode

# Build
npm run build         # TypeScript compile to dist/

# Lint
npm run lint          # ESLint on src/**/*.ts

# Run scripts
npm run seed          # Database seeding
tsx src/scripts/<name>.ts  # Run any script
```

### Frontend (Next.js)

```bash
cd frontend

# Development
npm install
npm run dev           # Next.js dev server on port 8080

# Build & Production
npm run build         # Next.js production build
npm start             # Production server

# Lint
npm run lint          # Next.js built-in ESLint
```

### GoProxy (Go)

```bash
cd goproxy

# Run
go run main.go

# Build
go build -o trollllm-proxy main.go

# Test - ALL tests
go test ./...

# Test - Single package
go test ./internal/userkey/...
go test ./internal/usage/...
go test ./internal/ratelimit/...

# Test - Single test function
go test -run TestAC1_UserWithCreditsAllowed ./internal/userkey/...
go test -run TestCreditsCheckLogicMatrix ./internal/userkey/...

# Test - Verbose output
go test -v ./internal/userkey/...

# Test - With coverage
go test -cover ./...
```

### Docker

```bash
# Development
docker compose up -d

# Production
docker compose -f docker-compose.prod.yml up -d --build

# Logs
docker compose logs -f
```

---

## Code Style Guidelines

### TypeScript (Backend)

**Imports** - Order: node builtins, third-party, local (with .js extension)
```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
import { LoginDTO } from '../dtos/auth.dto.js';
```

**Naming Conventions**
- Files: `kebab-case.ts` (e.g., `user-key.model.ts`, `auth.service.ts`)
- Classes: `PascalCase` (e.g., `AuthController`)
- Functions/variables: `camelCase` (e.g., `getUserKey`, `isActive`)
- Interfaces: `I` prefix for models (e.g., `IUserKey`), no prefix for DTOs
- Constants: `camelCase` or `UPPER_SNAKE_CASE` for true constants

**DTOs with Zod**
```typescript
export const LoginDTO = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string(),
});
export type LoginInput = z.infer<typeof LoginDTO>;
```

**Error Handling**
```typescript
try {
  const input = LoginDTO.parse(req.body);
  const result = await service.method(input);
  res.json(result);
} catch (error: any) {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation failed', details: error.errors });
    return;
  }
  console.error('Operation error:', error);
  res.status(500).json({ error: 'Operation failed' });
}
```

**Async Functions** - Always return Promise<T>, use async/await
```typescript
export async function listUserKeys(): Promise<IUserKey[]> {
  return userKeyRepository.findAll();
}
```

### TypeScript (Frontend - Next.js)

**File Structure**
- Pages: `app/` directory (Next.js App Router)
- Components: `components/` (PascalCase files)
- Utilities: `lib/`
- Path alias: `@/*` maps to `./src/*`

**React Components** - Functional components only, prefer named exports
```typescript
'use client';

export function MyComponent({ prop }: { prop: string }) {
  return <div>{prop}</div>;
}
```

### Go (GoProxy)

**Imports** - Order: stdlib, third-party, local (goproxy/...)
```go
import (
    "context"
    "errors"
    "time"

    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
    "goproxy/db"
)
```

**Naming Conventions**
- Packages: lowercase, single word (e.g., `userkey`, `usage`, `ratelimit`)
- Files: lowercase with underscores (e.g., `validator_test.go`)
- Functions: PascalCase for exported, camelCase for private
- Variables: camelCase
- Constants: PascalCase for exported errors

**Error Handling** - Define package-level error vars
```go
var (
    ErrKeyNotFound         = errors.New("API key not found")
    ErrInsufficientCredits = errors.New("insufficient credits")
)

func ValidateKey(apiKey string) (*UserKey, error) {
    if userKey == nil {
        return nil, ErrKeyNotFound
    }
    return userKey, nil
}
```

**Context Usage** - Always use context with timeout for DB operations
```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
```

**Struct Tags** - Use bson tags for MongoDB
```go
type UserKey struct {
    ID        string     `bson:"_id"`
    Name      string     `bson:"name"`
    IsActive  bool       `bson:"isActive"`
    ExpiresAt *time.Time `bson:"expiresAt,omitempty"`
}
```

**Testing** - Table-driven tests with descriptive names
```go
func TestCreditsCheckLogicMatrix(t *testing.T) {
    tests := []struct {
        name        string
        credits     float64
        shouldBlock bool
    }{
        {"credits > 0", 10.0, false},
        {"credits = 0", 0, true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // test logic
        })
    }
}
```

---

## Architecture Patterns

### Backend Layered Architecture
```
routes/     -> Controllers (request validation)
controllers/ -> Services (business logic)
services/   -> Repositories (data access)
repositories/ -> Models (MongoDB schemas)
dtos/       -> Zod schemas for validation
```

### GoProxy Package Structure
```
cmd/        -> CLI tools and test commands
config/     -> Configuration loading
db/         -> MongoDB connection
internal/   -> Core business logic
  userkey/  -> API key validation
  usage/    -> Usage tracking, credit deduction
  ratelimit/ -> Rate limiting
  proxy/    -> Proxy pool management
transformers/ -> Request/response transformation
```

---

## Important Conventions

1. **MongoDB IDs**: Use `_id` as primary key (string type for API keys)
2. **Timestamps**: Always use `time.Time` (Go) or `Date` (TS) with UTC
3. **Credits**: Stored as float64/number in USD
4. **API Keys**: Format `sk-trollllm-*` for user keys, `sk-trollllm-friend-*` for friend keys
5. **Logging**: Use emoji prefixes in Go (e.g., `log.Printf("💰 [%s] Deducted...")`)
6. **Environment**: Use `.env` files, never commit secrets

---

## Testing Guidelines

### Go Tests
- Place tests in same package as code (`*_test.go`)
- Use `t.Run()` for subtests
- Test acceptance criteria explicitly (see `validator_test.go`)
- Empty username bypasses DB (env-based auth) - document this behavior

### TypeScript
- No test framework configured yet
- Validation tested via Zod parse errors

---

## Common Tasks

### Add New API Endpoint (Backend)
1. Create/update DTO in `dtos/`
2. Add service method in `services/`
3. Add repository method if needed
4. Add controller method
5. Register route in `routes/`

### Add New Model Field
1. Update interface in `models/*.model.ts`
2. Update Mongoose schema
3. Update DTOs if exposed via API
4. Update Go struct if shared with goproxy

### Modify Credit Deduction Logic
1. Edit `goproxy/internal/usage/tracker.go`
2. Update atomic operations carefully (see Story 2.2 comments)
3. Add/update tests in `tracker_test.go`
