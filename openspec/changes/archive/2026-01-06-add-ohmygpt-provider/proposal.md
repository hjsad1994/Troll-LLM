# Change: Add OhMyGPT Provider

## Why

OpenHands provider is currently experiencing issues (detection, blocking, quota resets). We need to add an alternative provider (OhMyGPT) with the same logic and capabilities to provide redundancy and failover support.

OhMyGPT endpoint (`https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg`) provides similar functionality to OpenHands and can serve as a backup or alternative upstream provider for Claude models.

## What Changes

Create a new OhMyGPT provider provider that mirrors the OpenHands implementation:

1. **New provider module**: `goproxy/internal/ohmygpt/ohmygpt.go`
   - Copy OpenHands logic (key pool, rotation, retry, proxy support)
   - Use OhMyGPT endpoint: `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg`
   - Support both `/v1/chat/completions` (OpenAI format) and `/v1/messages` (Anthropic format)

2. **Separate MongoDB collection**: `ohmygpt_keys`
   - Independent key pool from OpenHands
   - Same schema: `apiKey`, `status`, `tokensUsed`, `requestsCount`, `lastError`, `cooldownUntil`

3. **Separate bindings collection**: `ohmygpt_bindings`
   - Proxy-to-key bindings for OhMyGPT
   - Same structure as `openhands_bindings`

4. **Configuration files**:
   - `config-ohmygpt-dev.json` - Development configuration (port 8005)
   - `config-ohmygpt-prod.json` - Production configuration (port 8005)
   - Support Claude models (Opus 4.5, Sonnet 4.5, Haiku 4.5)

5. **Frontend UI pages** (optional/future):
   - `/admin/ohmygpt-keys` - Manage OhMyGPT API keys
   - `/admin/ohmygpt-bindings` - Manage OhMyGPT proxy-key bindings
   - `/openhands-backup-keys` - Can be extended or create separate `/ohmygpt-backup-keys`

6. **Database initialization**:
   - Create `ohmygpt_keys` collection in MongoDB
   - Create `ohmygpt_bindings` collection in MongoDB
   - Seed script for initial keys

## Impact

- **Affected specs**: `ohmygpt-provider` (new spec)
- **Affected code**:
  - `goproxy/internal/ohmygpt/ohmygpt.go` - NEW
  - `goproxy/internal/ohmygpt/register.go` - NEW (provider registration)
  - `goproxy/db/db.go` - Update to add `OhMyGPTKeysCollection()` and `ohmygpt_bindings`
  - `goproxy/config-ohmygpt-dev.json` - NEW (port 8005)
  - `goproxy/config-ohmygpt-prod.json` - NEW (port 8005)
  - `goproxy/main.go` - Update to initialize OhMyGPT provider

- **Dependencies**:
  - Requires same dependencies as OpenHands (MongoDB driver, HTTP/2, proxy pool)
  - No new external dependencies

- **Migration**:
  - Need to create MongoDB indexes for `ohmygpt_keys` and `ohmygpt_bindings`
  - Seed initial OhMyGPT API keys

## Risks

- **Code duplication**: OhMyGPT provider will duplicate OpenHands code. Future refactoring may extract shared logic into a generic provider base.
- **Key management**: Need separate API keys for OhMyGPT (cannot reuse OpenHands keys)
- **Testing**: Need to verify OhMyGPT endpoint reliability and compatibility

## Future Considerations

- Add failover logic: if OpenHands fails, automatically retry with OhMyGPT
- Refactor to create generic provider interface implementation to reduce duplication
- Add UI pages for OhMyGPT key and binding management
- Support additional models (GPT, Gemini) if OhMyGPT endpoint supports them
