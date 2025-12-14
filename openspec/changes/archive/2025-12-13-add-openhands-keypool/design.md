## Context
The system needs to support OpenHands LLM Proxy as a new upstream provider alongside existing Troll (Factory AI) and OhmyGPT providers. OpenHands provides access to multiple LLM models through a unified API at `https://llm-proxy.app.all-hands.dev`.

### Constraints
- Must follow same key pool architecture as existing `internal/keypool/` (Troll)
- Must use separate MongoDB collections to avoid conflicts
- Must support round-robin key selection and auto-rotation on errors
- OpenHands uses OpenAI-compatible `/v1/chat/completions` format

## Goals / Non-Goals
### Goals
- Add OpenHands as a new upstream provider with full key pool support
- Maintain consistency with existing Troll key pool patterns
- Support all 10 models available on OpenHands LLM Proxy
- Provide separate local (port 8004) and production (port 8003) configs

### Non-Goals
- Changing existing Troll or OhmyGPT key pool behavior
- Adding new API endpoints for OpenHands key management (use existing admin patterns)
- Supporting OpenHands-specific features beyond standard chat completions

## Decisions

### Decision 1: Separate KeyPool Module
Create `internal/openhandspool/` as a separate module rather than extending existing `keypool/`.

**Rationale**:
- Cleaner separation of concerns
- Allows independent evolution of each provider
- Avoids complexity in shared code
- Follows existing pattern (keypool for Troll, ohmygpt for OhmyGPT)

### Decision 2: MongoDB Collection Names
Use `openhands_keys` for active keys and `openhands_backup_keys` for backup rotation.

**Rationale**:
- Consistent with existing `factory_keys` and `backup_keys` pattern
- Clear namespace separation
- Easy to query/manage independently

### Decision 3: Model ID Mapping
Client sends standard model IDs (e.g., `claude-sonnet-4-20250514`), proxy maps to OpenHands format (`prod/claude-sonnet-4-20250514`).

**Rationale**:
- Maintains client compatibility with existing API
- Uses `upstream_model_id` config field for mapping
- Same pattern as existing Troll upstream

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Code duplication from keypool | Accept minimal duplication for clarity; can refactor to shared base later if patterns stabilize |
| OpenHands API changes | Error detection logic can be updated without affecting other providers |
| Key exhaustion | Same backup key rotation pattern as Troll provides automatic failover |

## Migration Plan
1. Deploy code changes
2. Add OpenHands keys to `openhands_keys` collection via MongoDB
3. Optionally add backup keys to `openhands_backup_keys`
4. Use `CONFIG_PATH=config-openhands-*.json` to enable OpenHands routing

No breaking changes to existing functionality.

## Open Questions
- None currently - plan is well-defined based on existing Troll keypool patterns
