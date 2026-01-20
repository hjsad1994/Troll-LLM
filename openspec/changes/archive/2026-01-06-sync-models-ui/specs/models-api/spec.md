# Models API Specification

## MODIFIED Requirements

### Requirement: API-MODELS-001 - Models endpoint returns full pricing metadata

The `/api/models` endpoint MUST return complete model information including all pricing fields from the goproxy config.

#### Scenario: Fetch models with full pricing data

**Given** the backend is running and goproxy config is loaded
**When** a client sends GET request to `/api/models`
**Then** the response includes for each model:
- `id` - model identifier
- `name` - display name
- `type` - provider type (anthropic, openai, google, openhands)
- `reasoning` - reasoning capability level
- `inputPricePerMTok` - input price per million tokens
- `outputPricePerMTok` - output price per million tokens
- `cacheWritePricePerMTok` - cache write price per million tokens
- `cacheHitPricePerMTok` - cache hit price per million tokens
- `billingMultiplier` - billing multiplier factor

#### Scenario: API returns models from config-openhands-prod.json

**Given** `config-openhands-prod.json` contains 9 models
**When** a client sends GET request to `/api/models`
**Then** the response contains exactly 9 models
**And** model IDs match those in the config file
