# Change: Investigate Claude SDK Support

## Why

The TrollLLM platform currently uses direct HTTP requests for all LLM API interactions (both OpenAI and Anthropic formats). This investigation is needed to determine if adding official SDK support (specifically `@anthropic-ai/sdk` for TypeScript/JavaScript and `anthropic` for Python) would provide benefits such as:

- Better type safety and autocomplete
- Automatic retries and error handling
- Streaming response handling
- Simplified authentication and configuration
- Official support and updates from Anthropic

## What Changes

- Investigate the current implementation to understand why SDKs are not used
- Evaluate the benefits and drawbacks of adding SDK support
- Document findings and provide recommendation
- **NOT implementing SDK support yet** - this is an investigation-only change

## Impact

- Affected specs: `documentation` (may need updates if SDK support is added)
- Affected code:
  - `backend/package.json` (would need SDK dependencies)
  - `frontend/src/app/docs/quickstart/page.tsx` (would need SDK examples)
  - `openspec/specs/documentation/spec.md` (current requirement forbids SDK usage)

## Current Findings

1. **Backend**: No `@anthropic-ai/sdk` or `anthropic` packages installed
2. **Frontend Documentation**: All examples use `requests` (Python) or `fetch` (JavaScript)
3. **Documentation Spec**: Explicitly requires NOT using SDK packages in examples
4. **Claude Code Integration**: Uses `@anthropic-ai/claude-code` CLI tool but that's different from the SDK
