# Tasks: Update Quickstart to Use Direct HTTP Requests

## 1. Update Code Examples

- [x] 1.1 Replace Python OpenAI SDK example with `requests` library example
- [x] 1.2 Replace Python Anthropic SDK example with `requests` library example
- [x] 1.3 Replace JavaScript OpenAI SDK example with `fetch` API example
- [x] 1.4 Replace JavaScript Anthropic SDK example with `fetch` API example
- [x] 1.5 Keep Go examples as-is (already use `net/http`)
- [x] 1.6 Keep cURL examples as-is (already direct HTTP)

## 2. Update Environment Variables Section

- [x] 2.1 Simplify environment variable guidance to use single `TROLLLLM_API_KEY`
- [x] 2.2 Remove SDK-specific environment variable instructions (`OPENAI_BASE_URL`, `ANTHROPIC_BASE_URL`)

## 3. Update Syntax Highlighting

- [x] 3.1 Add `requests` and `fetch` keywords to Python highlighter
- [x] 3.2 Update JavaScript highlighter for `fetch` patterns

## 4. Update Translations (English & Vietnamese)

- [x] 4.1 Update English translation keys for new instruction text
- [x] 4.2 Update Vietnamese translation keys for new instruction text
- [x] 4.3 Ensure both languages display correctly in UI

## 5. Testing

- [x] 5.1 Verify all code examples work with `chat.trollllm.xyz` endpoint
- [x] 5.2 Verify syntax highlighting renders correctly
- [x] 5.3 Test copy-to-clipboard functionality for new examples
