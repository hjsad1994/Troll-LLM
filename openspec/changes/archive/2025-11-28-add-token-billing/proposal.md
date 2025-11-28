# Change: Add Token Billing with Model Multipliers

## Why
Users need to track token usage for billing purposes. Currently, `usage.UpdateUsage()` exists but is NOT called after API responses. Different models have different costs, requiring multipliers to calculate actual billing tokens.

## What Changes
- **Call `usage.UpdateUsage()` after each API response** to track tokens in database
- Extract token usage from Anthropic/OpenAI responses
- Apply model-specific multipliers to calculate billing tokens:
  - `claude-opus-4-5-20251101`: x1.2
  - `claude-sonnet-4-5-20250929`: x1.2  
  - `claude-haiku-4-5-20251001`: x0.4
- Update user's `tokensUsed` in MongoDB after each request
- Return billing token count in response

## Impact
- Affected specs: api-proxy
- Affected code: goproxy/main.go, goproxy/config/config.go, goproxy/internal/usage/tracker.go, config.json
