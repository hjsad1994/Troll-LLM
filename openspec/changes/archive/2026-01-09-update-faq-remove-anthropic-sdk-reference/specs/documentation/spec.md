## REMOVED Requirements

### Requirement: Anthropic SDK Compatibility FAQ Entry
**Reason**: The FAQ entry about Anthropic SDK compatibility is misleading since TrollLLM uses OpenAI SDK format. The code examples on the landing page demonstrate OpenAI SDK usage (Python, Node.js, cURL), not Anthropic SDK. Keeping this FAQ item may confuse users about the actual SDK compatibility.

**Migration**: The FAQ section will have 3 questions instead of 4. Users should refer to the code examples on the landing page which show the correct OpenAI SDK usage pattern.

#### Scenario: Anthropic SDK FAQ previously existed
- **WHEN** users viewed the FAQ section at `/#faq`
- **THEN** they saw 4 FAQ questions including "Can I use existing Anthropic SDK code?"
- **AFTER CHANGE**: Users will see only 3 FAQ questions, and the misleading Anthropic SDK reference will be removed

#### Scenario: Code examples show OpenAI SDK format
- **WHEN** users view the landing page code examples
- **THEN** they see Python using `from openai import OpenAI`
- **THEN** they see Node.js using `import OpenAI from 'openai'`
- **THEN** they see cURL using the OpenAI-compatible API format
- **THEREFORE** The FAQ should reflect OpenAI SDK compatibility, not Anthropic SDK
