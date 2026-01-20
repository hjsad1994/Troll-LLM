## ADDED Requirements

### Requirement: SDK Compatibility FAQ Entry
The FAQ section SHALL include an entry clarifying official SDK support for TrollLLM.

#### Scenario: Users view FAQ section
- **WHEN** users visit the FAQ section at `/#faq`
- **THEN** they see 4 FAQ questions including SDK compatibility information
- **THEN** the FAQ clearly states that TrollLLM does not officially support OpenAI or Anthropic SDKs

#### Scenario: SDK compatibility information in both languages
- **WHEN** users view the FAQ in English
- **THEN** they see: "Does TrollLLM support OpenAI or Anthropic SDKs?" with answer explaining no official SDK support
- **WHEN** users view the FAQ in Vietnamese
- **THEN** they see: "TrollLLM có hỗ trợ OpenAI hoặc Anthropic SDK không?" with answer explaining no official SDK support
