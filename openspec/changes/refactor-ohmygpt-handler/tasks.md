# Tasks: Refactor OhmyGPT Handler

## 1. Simplify ohmygpt.go

- [ ] 1.1 Remove `cleanNulls` function (không cần transform response)
- [ ] 1.2 Remove `ForwardMessagesRequest` function (không dùng Anthropic endpoint)
- [ ] 1.3 Refactor `HandleStreamResponse`:
  - Pure passthrough (không parse/modify JSON)
  - Chỉ extract usage từ cuối stream
  - Simple `fmt.Fprintf(w, "%s\n", line)` pattern
  - Keep SSE format đúng
- [ ] 1.4 Refactor `HandleNonStreamResponse`:
  - Pure passthrough
  - Extract usage và forward body nguyên vẹn
- [ ] 1.5 Simplify logging:
  - Remove debug event logs
  - Keep essential: request start, errors, usage, billing

## 2. Simplify main.go OhmyGPT handlers

- [ ] 2.1 Simplify `handleOhmyGPTRequest`:
  - Remove complex transformations
  - Simple forward + usage callback
- [ ] 2.2 Remove unused functions:
  - `handleOhmyGPTMessagesRequest` (nếu không dùng)
  - Any Anthropic-related OhmyGPT handlers

## 3. Testing

- [ ] 3.1 Build và verify no compile errors
- [ ] 3.2 Test stream response với Kilo Code/Zed AI
- [ ] 3.3 Verify usage extraction và billing works
- [ ] 3.4 Verify key rotation still works
- [ ] 3.5 Verify proxy routing still works

## Reference: MainTarget Pattern

```go
// HandleStreamResponse - simple pattern
func HandleStreamResponse(w http.ResponseWriter, resp *http.Response, onUsage func(...)) {
    // 1. Handle error status
    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        w.WriteHeader(resp.StatusCode)
        w.Write(sanitizeError(resp.StatusCode, body))
        return
    }

    // 2. Set SSE headers
    w.Header().Set("Content-Type", "text/event-stream")
    
    // 3. Scanner-based passthrough
    scanner := bufio.NewScanner(resp.Body)
    for scanner.Scan() {
        line := scanner.Text()
        
        // Extract usage (không modify response)
        if strings.HasPrefix(line, "data: ") {
            // Parse usage only
        }
        
        // Pure passthrough
        fmt.Fprintf(w, "%s\n", line)
        flusher.Flush()
    }
    
    // 4. Call usage callback
    if onUsage != nil {
        onUsage(...)
    }
}
```
