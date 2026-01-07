# Documentation Specification Deltas

## ADDED Requirements

### Requirement: SDK Usage Investigation Documentation

The system SHALL document whether official Anthropic SDK support is provided or recommended.

#### Scenario: SDK support documentation exists
- **WHEN** a developer reviews the documentation
- **THEN** they SHALL find clear guidance on SDK usage vs HTTP requests
- **AND** the documentation SHALL explain the reasoning behind the recommendation

#### Scenario: SDK examples are provided (if SDK is adopted)
- **WHEN** SDK support is added
- **THEN** the documentation SHALL include SDK examples alongside HTTP examples
- **AND** examples SHALL cover both TypeScript and Python
- **AND** examples SHALL clearly show installation and configuration steps

## REMOVED Requirements

### Requirement: Direct HTTP Request Examples

**Reason**: This requirement explicitly forbids SDK usage, which prevents users from choosing SDKs if they prefer them. After investigation, we may determine that SDK examples should coexist with HTTP examples rather than replacing them entirely.

**Migration**: If SDK support is adopted, this requirement will be replaced with a more flexible requirement that allows both HTTP and SDK examples, letting users choose their preferred approach.
