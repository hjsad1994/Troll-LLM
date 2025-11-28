## 1. Configuration
- [x] 1.1 Add token multiplier config to Model struct in config.go
- [x] 1.2 Update config.json with multiplier values for each model

## 2. Token Extraction & Calculation
- [x] 2.1 Create helper function to extract tokens from Anthropic response
- [x] 2.2 Create helper function to extract tokens from OpenAI response
- [x] 2.3 Create billing token calculator with multiplier

## 3. Database Update (CRITICAL - Currently Missing)
- [x] 3.1 Call `usage.UpdateUsage()` in `handleAnthropicNonStreamResponse`
- [x] 3.2 Call `usage.UpdateUsage()` in `handleAnthropicStreamResponse` (not needed - uses transformer)
- [x] 3.3 Call `usage.UpdateUsage()` in `handleFactoryOpenAINonStreamResponse`
- [x] 3.4 Call `usage.UpdateUsage()` in `handleFactoryOpenAIStreamResponse` (not needed - uses transformer)
- [x] 3.5 Call `usage.UpdateUsage()` in `handleAnthropicMessagesNonStreamResponse`
- [x] 3.6 Call `usage.UpdateUsage()` in `handleAnthropicMessagesStreamResponse`
- [x] 3.7 Pass user API key through handler chain for tracking

## 4. Response Integration
- [ ] 4.1 Add billing tokens to response usage object (skipped - not required)
- [ ] 4.2 Include both raw and billing tokens (skipped - not required)

## 5. Testing
- [ ] 5.1 Test token tracking updates database
- [ ] 5.2 Verify multipliers are applied correctly
- [ ] 5.3 Check /admin/keys shows updated token usage
