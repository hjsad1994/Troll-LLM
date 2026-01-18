# Spec: GoProxy Port Configuration

## MODIFIED Requirements

### Requirement: GoProxy service runs on port 8004

The GoProxy service SHALL run on internal port 8004 (changed from 8005) for production deployment.

**Priority:** High
**Status:** Active
**Version:** Modified from existing deployment

#### Scenario: GoProxy starts on port 8004

**Given** the GoProxy service is configured with `config-ohmygpt-prod.json`
**And** the config file specifies `"port": 8004`
**When** the GoProxy service starts
**Then** the service should listen on port 8004
**And** the service should accept incoming HTTP connections on that port
**And** startup logs should confirm the port binding

#### Scenario: Config file port setting is respected

**Given** `goproxy/config-ohmygpt-prod.json` contains `"port": 8004`
**When** GoProxy reads the configuration during startup
**Then** it should bind to port 8004 as specified
**And** it should not attempt to bind to the old port 8005

### Requirement: Nginx routes to GoProxy on port 8004

The Nginx reverse proxy MUST route requests to the GoProxy service on port 8004.

**Priority:** High
**Status:** Active
**Version:** Modified from existing deployment

#### Scenario: Nginx upstream points to correct port

**Given** Nginx configuration defines the goproxy upstream
**When** checking the upstream server configuration
**Then** the upstream should specify `server goproxy:8004`
**And** keepalive connections should be maintained to the correct port

#### Scenario: HTTPS requests are proxied correctly

**Given** Nginx is configured with goproxy upstream on port 8004
**And** a user makes an HTTPS request to `https://chat.trollllm.xyz`
**When** Nginx processes the request
**Then** it should proxy the request to `http://goproxy:8004`
**And** the response should be returned to the client successfully
**And** streaming responses (SSE) should work correctly

#### Scenario: Health check routing works

**Given** GoProxy is running on port 8004
**When** Nginx receives a request to `https://chat.trollllm.xyz/health`
**Then** the request should be proxied to `goproxy:8004/health`
**And** the health check response should be returned to the client

## ADDED Requirements

### Requirement: Development environment uses consistent port

The development environment configuration MUST use the same port for consistency.

**Priority:** Medium
**Status:** Active
**Version:** New requirement

#### Scenario: Dev config matches prod config

**Given** production uses port 8004
**When** reviewing `goproxy/config-ohmygpt-dev.json`
**Then** the config should also specify `"port": 8004`
**And** local development should use the same port as production
**And** this reduces configuration drift between environments

## REMOVED Requirements

### Requirement: GoProxy service runs on port 8005

This requirement is replaced by the new port 8004 requirement.

**Priority:** N/A
**Status:** Deprecated
**Version:** Removed

The old configuration with port 8005 is being replaced. Any references to port 8005 in:
- Config files (`config-ohmygpt-prod.json`, `config-ohmygpt-dev.json`)
- Nginx upstream configuration
- Documentation

should be updated to reflect the new port 8004.

## Related Capabilities

- **nginx-reverse-proxy**: Nginx configuration for routing and load balancing
- **goproxy-service**: GoProxy application runtime and configuration
- **docker-deployment**: Docker Compose orchestration for production services
