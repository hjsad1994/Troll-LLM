## 1. Remove Duplicate Authentication Headers
- [x] 1.1 Remove `x-api-key` header from `forwardToEndpoint` function
- [x] 1.2 Remove `x-api-key` header from `retryWithNextKeyToEndpoint` function
- [x] 1.3 Keep only `Authorization: Bearer <key>` header

## 2. Add User-Agent Header
- [x] 2.1 Create function to get User-Agent from config (already exists: `config.GetUserAgent()`)
- [x] 2.2 Set User-Agent header in `forwardToEndpoint`
- [x] 2.3 Set User-Agent header in `retryWithNextKeyToEndpoint`
- [x] 2.4 Update config with realistic user agent strings

## 3. Add Common Browser Headers
- [x] 3.1 Add `Accept-Encoding: gzip, deflate, br` header
- [x] 3.2 Add `Accept-Language: en-US,en;q=0.9` header
- [x] 3.3 Add `Accept: application/json` header for non-streaming

## 4. Config Updates
- [x] 4.1 Update `user_agent` in config-openhands-prod.json
- [x] 4.2 Update `user_agent` in config-openhands-local.json
- [ ] 4.3 Add multiple user agent options for rotation (future enhancement)

## 5. Testing & Validation
- [ ] 5.1 Test with OpenHands API to verify budget isn't reset
- [ ] 5.2 Monitor logs to confirm headers are sent correctly
- [ ] 5.3 Verify backup keys work without detection
