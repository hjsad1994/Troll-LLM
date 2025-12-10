## ADDED Requirements

### Requirement: User Registration
The system SHALL allow new users to register accounts via the registration page.

#### Scenario: Successful registration
- **WHEN** user visits `/register`
- **AND** enters valid username (3-50 characters)
- **AND** enters password (minimum 6 characters)
- **AND** confirms password correctly
- **AND** clicks submit button
- **THEN** the system SHALL create a new user account
- **AND** automatically log the user in
- **AND** redirect to homepage

#### Scenario: Password validation
- **WHEN** user enters password less than 6 characters
- **THEN** the system SHALL display error message
- **AND** prevent form submission

#### Scenario: Password confirmation mismatch
- **WHEN** user enters password and confirmation that don't match
- **THEN** the system SHALL display error message
- **AND** prevent form submission

#### Scenario: Duplicate username
- **WHEN** user tries to register with an existing username
- **THEN** the system SHALL display error "Username already exists"
- **AND** not create a duplicate account
