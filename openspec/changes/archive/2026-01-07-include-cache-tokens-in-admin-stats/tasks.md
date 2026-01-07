## 1. Implementation

- [x] 1.1 Update `RequestLogRepository.getModelStats()` to aggregate cache tokens
  - Add `cacheWriteTokens: { $sum: { $ifNull: ['$cacheWriteTokens', 0] } }` to `$group` stage
  - Add `cacheHitTokens: { $sum: { $ifNull: ['$cacheHitTokens', 0] } }` to `$group` stage
  - Update `totalTokens` calculation in `$addFields` stage to include cache tokens

- [x] 1.2 Update model statistics response type to include cache token fields
  - Add `cacheWriteTokens: number` field to return type
  - Add `cacheHitTokens: number` field to return type
  - Update mapping in the final `return result.map(...)` to include cache token fields

- [x] 1.3 Verify frontend admin dashboard handles new cache token fields
  - Check if frontend code needs updates to display cache token data
  - Ensure backward compatibility if frontend doesn't use the new fields yet

## 2. Validation

- [x] 2.1 Test the `/admin/model-stats` endpoint
  - Verify response includes `cacheWriteTokens` and `cacheHitTokens` fields
  - Verify `totalTokens` = input + output + cacheWrite + cacheHit
  - Verify sorting by total tokens works correctly

- [x] 2.2 Test with legacy data (without cache tokens)
  - Verify logs without cache token fields are treated as 0
  - Verify `totalTokens` calculation works correctly with missing cache data

- [x] 2.3 Run TypeScript compilation
  - Ensure no type errors in backend code
  - Verify return type matches the updated structure

## 3. Documentation

- [ ] 3.1 Document the breaking change
  - Note that `totalTokens` will increase for requests with cache usage
  - Update any API documentation that references the model statistics endpoint
