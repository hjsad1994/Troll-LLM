## ADDED Requirements

### Requirement: User Registration
The system SHALL allow new users to register with username and password.

#### Scenario: Successful registration
- **WHEN** POST request to `/api/register` with valid username (3-50 chars) and password (min 6 chars)
- **THEN** create new user with hashed password and role (default: user)
- **AND** return JWT access token with 24h expiry

#### Scenario: Registration with existing username
- **WHEN** POST request to `/api/register` with username that already exists
- **THEN** return 409 Conflict with error message "Username already exists"

#### Scenario: Registration with invalid input
- **WHEN** POST request to `/api/register` with invalid username or password
- **THEN** return 400 Bad Request with validation error details

### Requirement: User Login
The system SHALL authenticate users and return JWT tokens.

#### Scenario: Successful login
- **WHEN** POST request to `/api/login` with valid credentials
- **THEN** return JWT access token with username and role
- **AND** update user's lastLoginAt timestamp

#### Scenario: Login with invalid credentials
- **WHEN** POST request to `/api/login` with invalid username or password
- **THEN** return 401 Unauthorized with error message "Invalid credentials"

#### Scenario: Login with inactive user
- **WHEN** POST request to `/api/login` with inactive user account
- **THEN** return 401 Unauthorized with error message "Invalid credentials"

### Requirement: JWT Authentication Middleware
The system SHALL verify JWT tokens on protected routes.

#### Scenario: Valid JWT token
- **WHEN** request with valid Bearer token in Authorization header
- **THEN** attach user info (username, role) to request and proceed

#### Scenario: Expired JWT token
- **WHEN** request with expired JWT token
- **THEN** return 401 Unauthorized with error message "Token expired"

#### Scenario: Invalid JWT token
- **WHEN** request with invalid or malformed JWT token
- **THEN** return 401 Unauthorized with error message "Invalid token"

#### Scenario: Missing Authorization header
- **WHEN** request to protected route without Authorization header
- **THEN** return 401 Unauthorized with error message "Authentication required"

### Requirement: Role-Based Authorization
The system SHALL enforce role-based access control on admin endpoints.

#### Scenario: Admin accessing admin endpoints
- **WHEN** user with role "admin" accesses any admin endpoint
- **THEN** allow access and process request

#### Scenario: User accessing read-only endpoints
- **WHEN** user with role "user" accesses GET endpoints under /admin
- **THEN** allow access and return data

#### Scenario: User accessing write endpoints
- **WHEN** user with role "user" attempts POST/PATCH/DELETE on /admin endpoints
- **THEN** return 403 Forbidden with error message "Insufficient permissions"

### Requirement: Layered Architecture
The backend SHALL follow layered architecture pattern.

#### Scenario: Controller layer handles HTTP
- **WHEN** HTTP request arrives at controller
- **THEN** controller validates input using DTOs
- **AND** delegates to service layer for business logic
- **AND** formats response to client

#### Scenario: Service layer handles business logic
- **WHEN** service method is called
- **THEN** execute business rules and validations
- **AND** call repository for data operations
- **AND** return result without HTTP concerns

#### Scenario: Repository layer handles data access
- **WHEN** repository method is called
- **THEN** interact with MongoDB via Mongoose models
- **AND** return domain entities

## MODIFIED Requirements

### Requirement: Admin Authentication
The system SHALL authenticate admin users using JWT tokens instead of session tokens.

#### Scenario: JWT Bearer authentication
- **WHEN** request includes Authorization header with "Bearer <jwt-token>"
- **THEN** verify JWT signature and expiry
- **AND** extract username and role from token payload
- **AND** allow access to protected routes based on role

#### Scenario: Basic Auth fallback (deprecated)
- **WHEN** request includes Basic Auth header
- **THEN** verify credentials against database
- **AND** allow access (backward compatibility)
- **NOTE** Basic Auth is deprecated and will be removed in future versions
