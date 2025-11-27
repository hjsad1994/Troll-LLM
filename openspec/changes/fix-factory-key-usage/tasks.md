## 1. GoProxy Changes
- [x] 1.1 Add `UpdateFactoryKeyUsage()` function in `tracker.go` to increment `tokensUsed` and `requestsCount` on factory_keys collection
- [x] 1.2 Update `LogRequest()` to call `UpdateFactoryKeyUsage()` when factoryKeyId is provided

## 2. Testing
- [x] 2.1 Rebuild GoProxy
- [ ] 2.2 Make test requests and verify factory key usage is updated
- [ ] 2.3 Verify Frontend displays updated values
