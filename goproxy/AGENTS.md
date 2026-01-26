# goproxy/AGENTS.md - Go Proxy Service Guidelines

**Parent:** See root [AGENTS.md](../AGENTS.md) for general Go conventions.

## Overview

High-performance LLM proxy service written in Go 1.25+. Handles request routing, key management, rate limiting, and credit deduction. Runs on port 8003 in production.

**Core responsibilities:**
- Route LLM requests to appropriate upstreams (OpenHands, OhMyGPT, Main Target)
- Validate API keys and check credits before processing
- Transform OpenAI ↔ Anthropic formats as needed
- Track usage and deduct credits (dual-system: `creditsNew` vs `credits`)
- Enforce rate limits (2000 RPM for user keys, 60 RPM for friend keys)
- Manage proxy pools and upstream key rotation

## Project Structure

```
goproxy/
├── main.go                  # Entry point, HTTP server, routing logic
├── config/
│   ├── config.go            # Configuration loading (JSON-based)
│   └── config*.json         # Config files (models, upstreams, pricing)
├── db/
│   └── mongodb.go           # MongoDB connection setup
├── internal/                # Core business logic (see internal/AGENTS.md)
│   ├── userkey/             # API key validation
│   ├── usage/               # Credit deduction, usage tracking
│   ├── ratelimit/           # Rate limiting (RPM enforcement)
│   ├── openhands/           # OpenHands provider integration
│   ├── ohmygpt/             # OhMyGPT provider integration
│   ├── maintarget/          # Main Target Server routing
│   ├── proxy/               # Proxy pool management
│   └── ...                  # Other modules
└── transformers/            # Request/response transformation
    ├── request.go           # OpenAI → Anthropic conversion
    └── response.go          # Anthropic → OpenAI conversion
```

## Where to Look

| Task | Location |
|------|----------|
| Add new upstream provider | `main.go` (selectUpstreamConfig), `config/config.json` |
| Modify model routing | `config/config.json` (upstream field) |
| Add middleware (auth, logging) | `main.go` (corsMiddleware pattern) |
| Change credit deduction logic | `internal/usage/tracker.go` |
| Adjust rate limits | `internal/ratelimit/limiter.go` |
| Add new endpoint | `main.go` (register handler, see modelsHandler) |
| Debug request flow | `main.go` (search for debugMode logs) |

## Go Conventions (Project-Specific)

### Emoji Logging
Use emojis consistently for log readability:
```go
log.Printf("💰 [Username] Deducted $%.6f (new balance: $%.2f)", cost, newBalance)
log.Printf("💸 Insufficient credits for user %s", username)
log.Printf("❌ Failed to X: %v", err)
log.Printf("✅ Success: X completed")
log.Printf("🔄 [Routing] X -> Y")
log.Printf("📥 Request received: model=%s stream=%v", model, stream)
log.Printf("📤 Forwarding to upstream...")
```

### Context Timeout: Always 5 Seconds
ALL MongoDB operations MUST use 5-second timeout:
```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
collection.FindOne(ctx, filter).Decode(&result)
```

### Package-Level Error Variables
Define errors at package level for consistency:
```go
var (
    ErrKeyNotFound         = errors.New("API key not found")
    ErrInsufficientCredits = errors.New("insufficient credits")
)

// Usage:
if err == ErrInsufficientCredits {
    // Handle specific error
}
```

### Dual Credit System
**CRITICAL:** Two billing systems coexist:
1. **OhMyGPT** (legacy): Deduct from `credits` + `refCredits` fields
2. **OpenHands** (new): Deduct from `creditsNew` field

Control via `billing_upstream` in `config.json`:
- `"billing_upstream": "ohmygpt"` → Use `credits` field
- `"billing_upstream": "openhands"` → Use `creditsNew` field

See `internal/usage/tracker.go` for implementation.

## Configuration

Models, upstreams, and pricing configured in JSON files:
- `config/config.json` - Development config
- `config/config-openhands-prod.json` - OpenHands production
- `config/config-ohmygpt-prod.json` - OhMyGPT production

**Key fields:**
- `upstream` - Request routing (`"main"`, `"openhands"`, `"ohmygpt"`)
- `billing_upstream` - Credit field selection (`"openhands"`, `"ohmygpt"`)
- `upstream_model_id` - Model ID mapping for upstream provider

## For Detailed Module Patterns

See [internal/AGENTS.md](internal/AGENTS.md) for deep dives into:
- User key validation logic
- Credit deduction with atomic operations
- Rate limiting implementation
- OpenHands/OhMyGPT provider patterns
- Proxy pool management
