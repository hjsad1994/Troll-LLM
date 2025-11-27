## ADDED Requirements

### Requirement: Proxy Management
The system SHALL support multiple proxy servers (HTTP and SOCKS5) for routing API requests to upstream providers.

#### Scenario: Admin creates HTTP proxy
- **WHEN** admin sends POST /admin/proxies with type "http", host, and port
- **THEN** system creates proxy record with status "healthy"
- **AND** returns proxy details with generated ID

#### Scenario: Admin creates SOCKS5 proxy with auth
- **WHEN** admin sends POST /admin/proxies with type "socks5", host, port, username, password
- **THEN** system creates proxy record with encrypted credentials
- **AND** returns proxy details without exposing password

#### Scenario: Admin tests proxy connectivity
- **WHEN** admin sends POST /admin/proxies/:id/test
- **THEN** system attempts connection through proxy
- **AND** returns success/failure status with latency

#### Scenario: Admin deletes proxy with bindings
- **WHEN** admin sends DELETE /admin/proxies/:id for proxy with key bindings
- **THEN** system removes all key bindings
- **AND** deletes proxy record

### Requirement: Proxy-Key Binding
The system SHALL support binding 1-2 Factory API keys to each proxy server.

#### Scenario: Admin binds primary key to proxy
- **WHEN** admin sends POST /admin/proxies/:id/keys with factoryKeyId and priority 1
- **THEN** system creates binding with priority 1 (primary)
- **AND** key is used as first choice for this proxy

#### Scenario: Admin binds secondary key to proxy
- **WHEN** admin sends POST /admin/proxies/:id/keys with factoryKeyId and priority 2
- **THEN** system creates binding with priority 2 (secondary)
- **AND** key is used as fallback when primary fails

#### Scenario: Reject third key binding
- **WHEN** admin attempts to bind third key to proxy (already has 2 bindings)
- **THEN** system returns error "Maximum 2 keys per proxy"

#### Scenario: Admin unbinds key from proxy
- **WHEN** admin sends DELETE /admin/proxies/:id/keys/:keyId
- **THEN** system removes binding
- **AND** key remains in factory_keys collection

### Requirement: Proxy-Based Request Routing
The system SHALL route API requests through configured proxies using round-robin selection.

#### Scenario: Request routed through proxy
- **WHEN** user sends chat request
- **AND** proxies are configured
- **THEN** system selects next proxy in round-robin order
- **AND** uses primary key bound to selected proxy
- **AND** routes request through proxy to upstream

#### Scenario: Primary key rate limited
- **WHEN** request fails with 429 (rate limit) using primary key
- **AND** proxy has secondary key bound
- **THEN** system retries with secondary key on same proxy

#### Scenario: Both keys exhausted on proxy
- **WHEN** both primary and secondary keys on proxy return 429/402
- **THEN** system marks proxy as temporarily unhealthy
- **AND** selects next healthy proxy
- **AND** retries request

#### Scenario: All proxies exhausted
- **WHEN** all configured proxies are unhealthy or exhausted
- **THEN** system returns 503 Service Unavailable
- **AND** includes retry-after header

#### Scenario: No proxies configured (direct mode)
- **WHEN** no proxies are configured in database
- **THEN** system uses direct connection (existing behavior)
- **AND** uses keypool without proxy routing

### Requirement: Proxy Health Monitoring
The system SHALL continuously monitor proxy health and log status changes.

#### Scenario: Health check runs periodically
- **WHEN** system is running
- **THEN** health check runs every 30 seconds for each proxy
- **AND** tests TCP connection and HTTP request through proxy
- **AND** records latency and status to `proxy_health_logs`

#### Scenario: Proxy marked unhealthy after consecutive failures
- **WHEN** proxy fails health check 3 times consecutively
- **THEN** system marks proxy status as "unhealthy"
- **AND** excludes proxy from round-robin selection

#### Scenario: Proxy recovered after being unhealthy
- **WHEN** unhealthy proxy passes health check
- **THEN** system marks proxy status as "healthy"
- **AND** includes proxy back in round-robin selection

### Requirement: Status Dashboard
The system SHALL provide a public status page showing proxy health.

#### Scenario: User views status dashboard
- **WHEN** user visits /status page
- **THEN** system displays overall health status
- **AND** shows each proxy with status, latency, key count
- **AND** auto-refreshes every 30 seconds

#### Scenario: Status API returns JSON
- **WHEN** client calls GET /api/status
- **THEN** system returns JSON with overall status and proxy details
- **AND** includes last check timestamp
