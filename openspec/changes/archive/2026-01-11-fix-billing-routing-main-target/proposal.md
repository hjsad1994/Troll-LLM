# Change: Fix Billing Routing for Main Target Upstream

## Why

Currently, all models with `"upstream": "main"` incorrectly deduct credits from the `credits` field (OhMyGPT balance) regardless of which actual upstream provider they use. This breaks the dual credits system where:
- OpenHands upstream (port 8004) should deduct from `creditsNew`
- OhMyGPT upstream (port 8005) should deduct from `credits`

The main target server can route to either OpenHands or OhMyGPT, but the billing system has no way to distinguish which one is being used. This causes incorrect billing for all main target requests.

## What Changes

- Add `billing_upstream` field to model configuration in `config.json` to explicitly specify which credit field to use
- Valid values: `"openhands"` or `"ohmygpt"`
- Update Model struct in `config/config.go` to include `BillingUpstream` field
- Add helper function `GetModelBillingUpstream()` to retrieve billing upstream
- Update `handleMainTargetRequest()` to check `billing_upstream` and call appropriate deduction function:
  - `"openhands"` → `DeductCreditsOpenHands()` → deducts from `creditsNew`
  - `"ohmygpt"` → `DeductCreditsOhMyGPT()` → deducts from `credits`
- Update `handleMainTargetRequestOpenAI()` similarly for OpenAI-compatible endpoints

## Impact

**Affected specs:**
- `billing` - New requirement for billing upstream routing

**Affected code:**
- `goproxy/config.json` - Add `billing_upstream` field to all models (5 models total)
- `goproxy/config/config.go` - Add `BillingUpstream` field and getter function
- `goproxy/main.go` - Update two handler functions to use correct deduction based on billing_upstream

**Breaking changes:**
- None - This is a bug fix that corrects existing incorrect behavior
- Existing models without `billing_upstream` will default to `"ohmygpt"` for backward compatibility

**Data migration:**
- No database migration required
- Configuration change only
