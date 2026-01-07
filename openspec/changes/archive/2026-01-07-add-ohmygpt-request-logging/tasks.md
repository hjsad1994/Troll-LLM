# Tasks: Add OhMyGPT API Request Logging

## Implementation Tasks

### 1. Add Request Logging to OpenAI Format Handler
**File**: `goproxy/main.go`
**Function**: `handleOhMyGPTOpenAIRequest()`

- [x] Add latency tracking (start time before forward, end time after response)
- [x] Extract input/output/cache tokens from usage callback
- [x] Call `usage.LogRequestDetailed()` with all required parameters:
  - `UserID`: username
  - `UserKeyID`: userApiKey
  - `FactoryKeyID`: ohmygptProvider.GetLastUsedKeyID()
  - `Model`: modelID
  - `InputTokens`: from usage callback
  - `OutputTokens`: from usage callback
  - `CacheWriteTokens`: from usage callback
  - `CacheHitTokens`: from usage callback
  - `CreditsCost`: calculated from billing
  - `TokensUsed`: input + output
  - `StatusCode`: response status
  - `LatencyMs`: elapsed time
- [x] Handle both streaming and non-streaming cases
- [x] Handle error cases (log failed requests with appropriate status code)

### 2. Add Request Logging to Anthropic Format Handler
**File**: `goproxy/main.go`
**Function**: `handleOhMyGPTMessagesRequest()`

- [x] Add latency tracking
- [x] Extract tokens from usage callback
- [x] Call `usage.LogRequestDetailed()` with same parameters as OpenAI handler
- [x] Handle both streaming and non-streaming
- [x] Handle error cases

### 3. Add FactoryKeyID to Go RequestLog Structures
**File**: `goproxy/internal/usage/tracker.go`

- [x] Add `FactoryKeyID string` field to `RequestLog` struct
- [x] Add `FactoryKeyID string` field to `RequestLogParams` struct
- [x] Update `LogRequestDetailed()` to include `FactoryKeyID` in log entry

### 4. Testing
**Validation**:

- [ ] Make a test request to OhMyGPT (OpenAI format)
- [ ] Verify `request_logs` collection has new entry
- [ ] Make a test request to OhMyGPT (Anthropic format)
- [ ] Verify `request_logs` collection has new entry
- [ ] Check admin dashboard `/admin` shows OhMyGPT requests
- [ ] Verify `/api/admin/model-stats` includes OhMyGPT models
- [ ] Test streaming requests are logged
- [ ] Test error responses are logged with correct status codes

### 5. Documentation
**Optional**:

- [ ] Update any internal docs noting OhMyGPT is now logged
- [ ] Add comment to OhMyGPT handlers noting logging behavior

## Notes

- **Latency calculation**: Need to capture start time before `ForwardRequest()` and calculate elapsed after response
- **Usage callback timing**: The `onUsage` callback fires after response is processed, so timing capture needs careful placement
- **Error handling**: Failed requests should still be logged with appropriate status codes (e.g., 502 for upstream errors)
- **Factory key ID**: The `RequestLog` schema has `factoryKeyId` field - we now populate this with the OhMyGPT key ID used for the request

## Implementation Summary

**Modified Files**:
1. `goproxy/internal/usage/tracker.go`:
   - Added `FactoryKeyID` field to `RequestLog` struct
   - Added `FactoryKeyID` field to `RequestLogParams` struct
   - Updated `LogRequestDetailed()` to include `FactoryKeyID` in log entry

2. `goproxy/main.go`:
   - Updated `handleOhMyGPTOpenAIRequest()`:
     - Added `requestStartTime := time.Now()` before `ForwardRequest()`
     - Added `latencyMs := time.Since(requestStartTime).Milliseconds()` in usage callback
     - Added `usage.LogRequestDetailed()` call with `FactoryKeyID` set to `ohmygptProvider.GetLastUsedKeyID()`
     - Added error logging with elapsed time on request failure

   - Updated `handleOhMyGPTMessagesRequest()`:
     - Added `requestStartTime := time.Now()` before `ForwardMessagesRequest()`
     - Added `latencyMs := time.Since(requestStartTime).Milliseconds()` in usage callback
     - Added `usage.LogRequestDetailed()` call with `FactoryKeyID` set to `ohmygptProvider.GetLastUsedKeyID()`
     - Added error logging with elapsed time on request failure
