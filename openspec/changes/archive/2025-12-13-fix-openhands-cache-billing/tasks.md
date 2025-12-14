## 1. Update OpenHands Messages Request Billing
- [ ] 1.1 Update `handleOpenHandsMessagesRequest` usage callback to use correct cache calculation
- [ ] 1.2 Change billing tokens calculation from `CalculateBillingTokensWithCache` to direct: `input + cacheWrite + output + EffectiveCacheHit(cacheHit)`
- [ ] 1.3 Update billing cost calculation to match new token calculation
- [ ] 1.4 Update log message format to clarify OpenHands cache handling

## 2. Update OpenHands OpenAI Request Billing
- [ ] 2.1 Update `handleOpenHandsOpenAIRequest` usage callback to use correct cache calculation
- [ ] 2.2 Change billing tokens calculation from `CalculateBillingTokensWithCache` to direct: `input + cacheWrite + output + EffectiveCacheHit(cacheHit)`
- [ ] 2.3 Update billing cost calculation to match new token calculation
- [ ] 2.4 Update log message format to clarify OpenHands cache handling

## 3. Documentation & Validation
- [ ] 3.1 Add code comments explaining OpenHands cache token behavior
- [ ] 3.2 Test billing calculation with OpenHands requests containing cache hits
- [ ] 3.3 Verify logs show correct token counts
- [ ] 3.4 Compare billing amounts before/after fix to ensure reduction
