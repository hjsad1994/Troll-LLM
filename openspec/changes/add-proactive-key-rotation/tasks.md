## 1. Database Schema Update
- [ ] 1.1 Add `spendEstimate` (float64) field to `OpenHandsKey` struct in `model.go`
- [ ] 1.2 Add `budgetLimit` (float64) field to `OpenHandsKey` struct (default: 10.0)
- [ ] 1.3 Update MongoDB schema to include new fields

## 2. Cost Calculation
- [ ] 2.1 Create cost calculation function using pricing from config
- [ ] 2.2 Support all OpenHands models (Claude, Gemini, Qwen, Kimi, GLM, GPT)
- [ ] 2.3 Account for cache tokens (cache_write, cache_hit) in cost calculation

## 3. Spend Tracking
- [ ] 3.1 Add `UpdateKeySpend(keyID string, cost float64)` function to pool
- [ ] 3.2 Call spend tracking after each successful request in handlers
- [ ] 3.3 Update spend in both in-memory and MongoDB

## 4. Spend Calibration (for existing keys)
- [ ] 4.1 Parse actual spend from ExceededBudget error message (`Spend=X.XX`)
- [ ] 4.2 Update `spendEstimate` when error is received for future accuracy
- [ ] 4.3 Add admin endpoint PATCH `/admin/openhands/keys/:id/spend` to set initial spend

## 5. Proactive Rotation Logic
- [ ] 5.1 Add `CheckSpendThreshold(keyID string) bool` function (returns true if >= 96%)
- [ ] 5.2 Add `ProactiveRotateIfNeeded(keyID string) (*OpenHandsKey, error)` function
- [ ] 5.3 Integrate threshold check before request in `SelectKey()`

## 6. Handler Updates
- [ ] 6.1 Update `handleOpenHandsMessagesRequest` to use proactive rotation
- [ ] 6.2 Update `handleOpenHandsOpenAIRequest` to use proactive rotation
- [ ] 6.3 Log proactive rotations with distinctive prefix `🔮 [OpenHands/ProactiveRotation]`

## 7. Admin API
- [ ] 7.1 Add PATCH `/admin/openhands/keys/:id/budget` endpoint
- [ ] 7.2 Add PATCH `/admin/openhands/keys/:id/spend` endpoint
- [ ] 7.3 Update list keys response to include spendEstimate, budgetLimit, spendPercentage

## 8. Testing
- [ ] 8.1 Test spend tracking accuracy with known token counts
- [ ] 8.2 Test proactive rotation triggers at 96% threshold
- [ ] 8.3 Test spend calibration from error message
- [ ] 8.4 Test fallback to reactive rotation if proactive fails
