# Spec: OhMyGPT Thinking Budget Reduction

## Capability: ohmygpt-thinking-budget-reduction

Reduce the thinking budget token allocation for OhMyGPT-hosted Claude models to optimize cost and performance.

---

## MODIFIED Requirements

### Requirement: OhMyGPT models SHALL use reduced thinking budget

The `thinking_budget` configuration parameter for OhMyGPT models (Opus 4.5 and Sonnet 4.5) SHALL be set to 6,000 tokens instead of the previous 12,000 tokens.

**Rationale**: Reducing thinking budget by 50% decreases token consumption for reasoning tasks, lowers operational costs, and improves response latency while maintaining sufficient reasoning capability for most use cases.

#### Scenario: Configure Opus 4.5 with reduced thinking budget

**Given** the file `goproxy/config-ohmygpt-prod.json`
**When** the model configuration for `claude-opus-4-5-20251101` is defined
**Then** the `thinking_budget` field must be set to `6000`
**And** all other configuration fields remain unchanged

#### Scenario: Configure Sonnet 4.5 with reduced thinking budget

**Given** the file `goproxy/config-ohmygpt-prod.json`
**When** the model configuration for `claude-sonnet-4-5-20250929` is defined
**Then** the `thinking_budget` field must be set to `6000`
**And** all other configuration fields remain unchanged

#### Scenario: Apply reduced thinking budget across all environments

**Given** any OhMyGPT configuration file (`config-ohmygpt-*.json`, `config-openhands-*.json`)
**When** the configuration contains models with `type: "ohmygpt"` and `reasoning: "high"`
**Then** the `thinking_budget` field must be set to `6000` for Opus 4.5 and Sonnet 4.5 models
**And** Haiku 4.5 models (with `reasoning: "low"`) must not have a `thinking_budget` field

#### Scenario: Validate configuration syntax after changes

**Given** a modified OhMyGPT configuration file
**When** the file is parsed by the goproxy service
**Then** the JSON must be syntactically valid
**And** the configuration must load without errors
**And** the `thinking_budget` value must be a positive integer

---

## REMOVED Requirements

### Requirement: OhMyGPT models use 12,000 token thinking budget

*This requirement is being removed.*

The previous specification required Opus 4.5 and Sonnet 4.5 models to use a `thinking_budget` of 12,000 tokens. This requirement is replaced by the new 6,000 token requirement specified above.

---

## Cross-References

- Related to: `ohmygpt-keys-ui`, `ohmygpt-backup-keys-ui` (UI may display thinking budget information)
- Related to: Billing calculations (thinking tokens contribute to token consumption)

---

## Notes

- The thinking_budget parameter influences the `max_tokens` calculation in request transformers (see `goproxy/transformers/request.go`)
- Lower thinking budget may result in faster response times but reduced depth of reasoning for complex tasks
- Monitor production metrics after rollout to validate that 6,000 tokens provides adequate reasoning capability
