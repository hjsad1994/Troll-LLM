# Implementation Tasks

## 1. Update Model Configuration Schema
- [ ] 1.1 Add `BillingUpstream` field to Model struct in `config/config.go`
- [ ] 1.2 Add `GetModelBillingUpstream()` helper function with default fallback to "ohmygpt"
- [ ] 1.3 Add validation function `IsValidBillingUpstream()` to check valid values

## 2. Update config.json
- [ ] 2.1 Add `"billing_upstream": "ohmygpt"` to Claude Opus 4.5 model
- [ ] 2.2 Add `"billing_upstream": "openhands"` to Claude Sonnet 4.5 model
- [ ] 2.3 Add `"billing_upstream": "openhands"` to Claude Haiku 4.5 model
- [ ] 2.4 Add `"billing_upstream": "ohmygpt"` to GPT-5.1 model
- [ ] 2.5 Add `"billing_upstream": "ohmygpt"` to Gemini 3 Pro Preview model

## 3. Update Main Target Handlers
- [ ] 3.1 Update `handleMainTargetRequest()` to check billing_upstream and call correct deduction function
- [ ] 3.2 Update `handleMainTargetRequestOpenAI()` to check billing_upstream and call correct deduction function
- [ ] 3.3 Add logging to indicate which billing upstream is being used

## 4. Testing
- [ ] 4.1 Test OpenHands model request deducts from `creditsNew`
- [ ] 4.2 Test OhMyGPT model request deducts from `credits`
- [ ] 4.3 Verify backward compatibility with models without billing_upstream field
- [ ] 4.4 Test both streaming and non-streaming requests
- [ ] 4.5 Verify OpenAI-compatible endpoint billing routing
