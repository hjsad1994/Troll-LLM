## 1. Implementation

- [x] 1.1 Modify `ForwardRequest` in `internal/troll2/handler.go` to inject `stream_options: {"include_usage": true}` into request body when streaming
- [x] 1.2 Capture streamed content in `HandleStreamResponse` for token estimation
- [x] 1.3 Estimate output tokens from content length (~4 chars/token) when upstream doesn't provide usage
- [x] 1.4 Apply same fix to `HandleStreamResponseAnthropic` for /v1/messages endpoint
- [ ] 1.5 Test with Troll-2 models to verify credits are now being tracked

## 2. Verification

- [ ] 2.1 Make a streaming request to Troll-2 model (e.g., openai-gpt-oss-20b)
- [ ] 2.2 Verify logs show: `📊 [Troll-2] Estimated output tokens from X chars: Y tokens`
- [ ] 2.3 Verify logs show non-zero usage: `📊 [Troll-2] Final usage: input=0, output=Y`
- [ ] 2.4 Verify credits are deducted in database
