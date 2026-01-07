# Change: Include Cache Tokens in Admin Model Statistics

## Why

The admin dashboard's model statistics endpoint (`/admin/model-stats`) currently only includes `inputTokens` and `outputTokens` when calculating `totalTokens`. This omission means that cache write tokens and cache hit tokens are not reflected in the total token usage statistics, leading to inaccurate token accounting. Since cache tokens are billed by upstream providers and affect credits calculation, they should be included in total token statistics for accurate usage tracking and billing reconciliation.

## What Changes

- **MODIFIED** `RequestLogRepository.getModelStats()` to include `cacheWriteTokens` and `cacheHitTokens` in the aggregation pipeline
- **MODIFIED** `totalTokens` calculation to include all token types: `inputTokens + outputTokens + cacheWriteTokens + cacheHitTokens`
- **ADDED** new fields to model statistics response: `cacheWriteTokens`, `cacheHitTokens` (for transparency)
- **BREAKING** The `totalTokens` field will now include cache tokens, which will increase reported totals for requests that use caching

## Impact

- Affected specs: `request-logging` (new capability)
- Affected code:
  - `backend/src/repositories/request-log.repository.ts:345-385` (`getModelStats` method)
  - `backend/src/routes/admin.routes.ts:276-315` (`/admin/model-stats` endpoint)
  - Frontend admin dashboard consuming the `/admin/model-stats` API
