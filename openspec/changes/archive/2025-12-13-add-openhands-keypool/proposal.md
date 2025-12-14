# Change: Add OpenHands LLM Proxy Key Pool

## Why
The system currently supports only Troll (Factory AI) and OhmyGPT as upstream providers. We need to add support for OpenHands LLM Proxy (`https://llm-proxy.app.all-hands.dev`) as a new upstream provider with the same key rotation, health monitoring, and **full request handling** capabilities as existing providers.

## What Changes
- **NEW** OpenHands Key Pool module (`internal/openhandspool/`) with round-robin selection and auto-rotation
- **NEW** MongoDB collections: `openhands_keys` and `openhands_backup_keys`
- **NEW** Upstream type `"openhands"` for model configuration
- **NEW** Request handler `handleOpenHandsRequest()` - Full request/response handling (like handleTrollOpenAIRequest)
- **NEW** Streaming handler `handleOpenHandsStreamResponse()` - SSE streaming support
- **NEW** Non-streaming handler `handleOpenHandsNonStreamResponse()`
- **NEW** Config files: `config-openhands-local.json` (port 8004) and `config-openhands-prod.json` (port 8004)
- **MODIFIED** `db/mongodb.go` - Add `OpenHandsKeysCollection()` helper
- **MODIFIED** `main.go` - Add OpenHands routing in `selectUpstreamConfig()` and request handlers

## Impact
- Affected specs: `api-proxy`
- Affected code:
  - `goproxy/internal/openhandspool/` (new module)
  - `goproxy/db/mongodb.go`
  - `goproxy/main.go` (add ~300 lines for handlers)
  - `goproxy/config-openhands-*.json` (new configs)

## OpenHands LLM Proxy Details
- **Base URL**: `https://llm-proxy.app.all-hands.dev`
- **OpenAI Endpoint**: `/v1/chat/completions` (OpenAI-compatible format)
- **Anthropic Endpoint**: `/v1/messages` (Anthropic native format)
- **Auth**: `Authorization: Bearer <api-key>`
- **Models available**: Claude Opus 4.5, Opus 4, Sonnet 4.5, Sonnet 4, Sonnet 3.7, Haiku 4.5, GPT-5, GPT-5 Codex, Gemini 2.5 Pro, Gemini 3 Pro Preview
- **Model ID format**: `prod/{model-name}` (e.g., `prod/claude-sonnet-4-20250514`)
