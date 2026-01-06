# Proposal: Reduce OhMyGPT Thinking Budget

## Summary

Reduce the `thinking_budget` parameter for OhMyGPT models (Opus 4.5 and Sonnet 4.5) from 12,000 tokens to 6,000 tokens across all configuration files to optimize cost, improve response performance, and test if a lower budget provides sufficient reasoning capability.

## Motivation

### Cost Reduction
- Thinking tokens consume significant budget and directly impact billing costs
- At current 12,000 token budget, complex reasoning tasks can generate substantial thinking token usage
- Reducing to 6,000 tokens (50% reduction) will proportionally decrease thinking-related costs

### Performance Improvement
- Higher thinking budgets can lead to slower response times
- Models with extended thinking may take longer to process and return responses
- Lower budget should reduce latency for end users

### Testing & Optimization
- Current 12,000 token budget may be overkill for most use cases
- Need to validate if 6,000 tokens provides sufficient reasoning for typical workloads
- Allows data-driven decision on optimal thinking budget value

## Scope

### In Scope
- Update `thinking_budget` from 12,000 to 6,000 for:
  - `claude-opus-4-5-20251101` (Opus 4.5)
  - `claude-sonnet-4-5-20250929` (Sonnet 4.5)
- Affected configuration files:
  - `goproxy/config-ohmygpt-dev.json`
  - `goproxy/config-ohmygpt-prod.json`
  - Other OhMyGPT-related configs using the 12,000 value

### Out of Scope
- Haiku 4.5 (already has `reasoning: "low"` and no thinking_budget)
- Non-OhMyGPT model configurations
- Backend billing calculations (not directly affected)
- Frontend UI changes

## Success Criteria

1. All OhMyGPT configuration files updated with new thinking_budget value of 6,000
2. Configuration validation passes (JSON syntax correctness)
3. No breaking changes to existing API contracts
4. Testing confirms reduced token usage in thinking mode

## Alternatives Considered

1. **Remove thinking_budget entirely**: Too drastic, may break reasoning capability
2. **Reduce to 8,000 or 10,000**: Less significant cost/performance impact
3. **Make configurable per-request**: Requires backend changes, higher complexity

## Dependencies

- None - this is a configuration-only change

## Risks

- **Reduced reasoning quality**: 6,000 tokens may be insufficient for complex multi-step reasoning tasks
- **User impact**: Users relying on extended thinking may see degraded performance
- **Mitigation**: Monitor usage and rollback if significant issues arise

## Rollout Plan

1. Update development configuration first
2. Test with typical workloads
3. Update production configuration after validation
4. Monitor metrics (cost, latency, user feedback)

## Related Changes

- None

## References

- Current OhMyGPT configs: `goproxy/config-ohmygpt-*.json`
- Model pricing and configuration in `openspec/project.md`
