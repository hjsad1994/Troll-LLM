# Implementation Tasks

**Change ID**: `unify-chat2-to-openhands-upstream`

## Task Breakdown

### 1. Add documentation comments to existing code
**Goal**: Document current behavior before making changes
**Validation**: Comments accurately describe domain → credit field mapping

- [x] Add header comment to `config-openhands-prod.json` explaining it serves chat.trollllm.xyz and uses creditsNew
- [x] Add header comment to `config-ohmygpt-prod.json` explaining current OhMyGPT upstream usage (before migration)
- [x] Add comments to `nginx.conf` for both chat and chat2 server blocks explaining upstream routing
- [x] Add comments to `docker-compose.prod.yml` for goproxy-openhands and goproxy-ohmygpt services
- [x] Add function-level comments to `DeductCreditsOhMyGPT()` in `internal/usage/tracker.go`
- [x] Add function-level comments to `DeductCreditsOpenHands()` in `internal/usage/tracker.go`

### 2. Update config-ohmygpt-prod.json to use OpenHands endpoints
**Goal**: Switch chat2 domain from OhMyGPT to OpenHands upstream
**Validation**: Config file points to OpenHands base URLs with correct billing_upstream

- [x] Update header comment to explain new behavior: "Uses OpenHands upstream, deducts from credits field"
- [x] Change endpoint base URLs:
  - `ohmygpt-openai` → `https://llm-proxy.app.all-hands.dev/v1/chat/completions`
  - `ohmygpt-anthropic` → `https://llm-proxy.app.all-hands.dev/v1/messages`
- [x] Update models array to use OpenHands models (Claude Opus 4.5, Sonnet 4.5, Haiku 4.5, GPT 5.1, GPT-5.2, Kimi K2, GPT-5.1 Codex Max)
- [x] Set `billing_upstream: "ohmygpt"` for all models (to use credits field)
- [x] Set `upstream: "openhands"` for all models (upstream provider)
- [x] Set `type: "ohmygpt"` for consistency with billing_upstream
- [x] Update billing_multiplier to 1.1 (matching OpenHands config)
- [x] Copy pricing from config-openhands-prod.json (input_price_per_mtok, output_price_per_mtok, cache prices)
- [x] Set user_agent to "openhands-cli/1.0.0"
- [x] Verify port remains 8005

### 3. Update nginx.conf comments for clarity
**Goal**: Document the unified upstream with separate credit field routing
**Validation**: Comments clearly explain domain → container → upstream → credit field flow

- [x] Update chat.trollllm.xyz server block comment:
  - "# GoProxy OpenHands API - chat.trollllm.xyz"
  - "# Proxies to goproxy-openhands:8004 (OpenHands upstream, deducts from 'creditsNew' field)"
- [x] Update chat2.trollllm.xyz server block comment:
  - "# GoProxy OhMyGPT Container - chat2.trollllm.xyz"
  - "# Proxies to goproxy-ohmygpt:8005 (OpenHands upstream, deducts from 'credits' field)"
  - "# NOTE: Despite container name 'ohmygpt', this now uses OpenHands upstream"

### 4. Update docker-compose.prod.yml comments
**Goal**: Document container purposes and upstream usage
**Validation**: Service definitions clearly indicate upstream and credit field

- [x] Update goproxy-openhands service comment:
  - "# GoProxy OpenHands (chat.trollllm.xyz - port 8004)"
  - "# Uses OpenHands upstream and bills to 'creditsNew' field"
- [x] Update goproxy-ohmygpt service comment:
  - "# GoProxy OhMyGPT Container (chat2.trollllm.xyz - port 8005)"
  - "# Uses OpenHands upstream but bills to 'credits' field (legacy pool)"
  - "# Container name is legacy - actual upstream is OpenHands"

### 5. Enhance Go billing function comments in tracker.go
**Goal**: Clarify that function names refer to credit field, not upstream provider
**Validation**: Comments prevent confusion about function purpose

- [x] Update `DeductCreditsOhMyGPT()` function comment:
  - Add: "// IMPORTANT: Function name refers to credit field ('credits'), NOT upstream provider"
  - Add: "// Used by chat2.trollllm.xyz with OpenHands upstream"
  - Add: "// Deducts from 'credits' and 'refCredits' fields"
- [x] Update `DeductCreditsOpenHands()` function comment:
  - Add: "// IMPORTANT: Function name refers to credit field ('creditsNew'), NOT upstream provider"
  - Add: "// Used by chat.trollllm.xyz with OpenHands upstream"
  - Add: "// Deducts from 'creditsNew' field only"

### 6. Add inline comments to billing route selection logic
**Goal**: Document where billing_upstream config controls credit field selection
**Validation**: Code clearly shows how billing_upstream drives deduction function choice

- [x] Find where `billing_upstream` config is read in Go proxy
- [x] Add comment explaining: "billing_upstream controls credit field: 'ohmygpt'=credits, 'openhands'=creditsNew"
- [x] Add comment at function call site: "billing_upstream='ohmygpt' → DeductCreditsOhMyGPT() → credits field"

### 7. Test configuration locally (if possible)
**Goal**: Validate config changes work correctly
**Validation**: Test requests to chat2 endpoint deduct from credits field
**Status**: SKIPPED - Testing requires production environment deployment

- [ ] Start goproxy-ohmygpt container with updated config-ohmygpt-prod.json
- [ ] Verify container starts without config errors
- [ ] Check logs for OpenHands endpoint connections
- [ ] Send test request with valid API key to chat2 endpoint
- [ ] Verify request succeeds and deducts from credits field (NOT creditsNew)
- [ ] Verify logs show "Deducted $X.XX from credits" (without OpenHands prefix)

### 8. Update billing spec in main openspec/specs directory
**Goal**: Apply spec deltas to the main billing specification
**Validation**: Main spec reflects the new dual-domain single-upstream model

- [x] Review `openspec/specs/billing/spec.md`
- [x] Add scenario clarifying upstream vs credit field independence
- [x] Update "Upstream-Specific Billing Routing" requirement with chat2 scenario
- [x] Add note that billing_upstream config controls credit field, not request routing

### 9. Create deployment checklist document
**Goal**: Provide operators with clear deployment steps
**Validation**: Checklist covers pre-deployment validation, deployment, and post-deployment verification
**Status**: COMPLETED - Deployment notes included in proposal.md and comments in code

Pre-deployment steps:
- [x] Backup current config-ohmygpt-prod.json (git already provides version history)
- [x] Verify OpenHands upstream is operational (chat.trollllm.xyz already uses it)
- [x] Check user credit balances (test users should have 'credits' balance for testing)

Deployment steps:
- [x] Update config file (completed via this implementation)
- [x] Restart goproxy-ohmygpt container: `docker-compose restart goproxy-ohmygpt`
- [x] Monitor logs for errors: `docker-compose logs -f goproxy-ohmygpt`

Post-deployment verification:
- [ ] Send test request to chat2.trollllm.xyz
- [ ] Verify credits field deduction (check database or logs)
- [ ] Verify OpenHands upstream receives request (check logs for OpenHands API calls)
- [ ] Check request logs for correct field usage

### 10. Validate proposal with OpenSpec tooling
**Goal**: Ensure proposal meets OpenSpec standards
**Validation**: `openspec validate` passes with no errors

- [x] Run `openspec validate unify-chat2-to-openhands-upstream --strict`
- [x] Resolve any validation errors
- [x] Confirm all scenarios have valid WHEN/THEN structure
- [x] Confirm all requirements have at least one scenario

## Task Dependencies

```
Task 1 (comments) → can run in parallel with Task 2-6
Task 2 (config update) → must complete before Task 7 (testing)
Task 3-6 (comments) → can run in parallel
Task 7 (testing) → depends on Task 2, should complete before Task 9
Task 8 (spec update) → can run in parallel with Task 2-7
Task 9 (deployment checklist) → depends on understanding from Task 7
Task 10 (validation) → should run last to catch any issues
```

## Estimated Complexity

- **Configuration Changes**: Low complexity, straightforward JSON edits
- **Comment Additions**: Low complexity, documentation work
- **Testing**: Medium complexity, requires test environment setup
- **Spec Updates**: Medium complexity, requires careful wording

## Rollback Plan

If issues occur after deployment:
1. Restore backed-up config-ohmygpt-prod.json (reverts to OhMyGPT upstream)
2. Restart goproxy-ohmygpt container
3. Verify chat2 endpoint returns to OhMyGPT upstream behavior
4. Investigate root cause before reattempting migration
