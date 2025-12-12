## 1. MongoDB Setup
- [x] 1.1 Add `OpenHandsKeysCollection()` helper to `goproxy/db/mongodb.go`

## 2. OpenHands KeyPool Module
- [x] 2.1 Create `goproxy/internal/openhandspool/model.go` - OpenHandsKey struct and status types
- [x] 2.2 Create `goproxy/internal/openhandspool/pool.go` - Key pool with round-robin selection
- [x] 2.3 Create `goproxy/internal/openhandspool/rotation.go` - Auto-rotation and error detection logic

## 3. Config Files
- [x] 3.1 Create `goproxy/config-openhands-local.json` (port 8004) with all 10 models
- [x] 3.2 Create `goproxy/config-openhands-prod.json` (port 8004) with all 10 models
- [x] 3.3 Delete `goproxy/config-openhands.json` (old file with incorrect format)

## 4. Main Integration - Routing
- [x] 4.1 Add OpenHands import and pool initialization in `goproxy/main.go`
- [x] 4.2 Add `"openhands"` case in `selectUpstreamConfig()` routing

## 5. Main Integration - Request Handlers (Full Request Flow)
- [x] 5.1 Add `handleOpenHandsOpenAIRequest()` - OpenAI format handler for GPT/Gemini models
  - Forward to `/v1/chat/completions`
  - Build request with model ID mapping (upstream_model_id)
  - Select key from pool
- [x] 5.2 Add `handleOpenHandsMessagesRequest()` - Anthropic format handler for Claude models
  - Forward to `/v1/messages`
  - Set `anthropic-version: 2023-06-01` header
  - Build request with model ID mapping
- [x] 5.3 Response handlers reuse maintarget/ohmygpt handlers - Parse JSON response, extract usage, deduct credits
- [x] 5.4 Response handlers reuse maintarget/ohmygpt handlers - SSE streaming with token counting
- [x] 5.5 Integrate error detection and key rotation on response (401/402/403 → rotate, 429 → cooldown)

## 6. Testing & Validation
- [ ] 6.1 Insert test key into `openhands_keys` MongoDB collection
- [ ] 6.2 Test non-streaming API request through proxy
- [ ] 6.3 Test streaming API request through proxy
- [ ] 6.4 Verify key rotation on 401/402/403 errors
- [ ] 6.5 Verify rate limit handling (429 → cooldown)
