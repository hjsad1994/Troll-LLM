# dual-upstream-deployment Specification

## Purpose
TBD - created by archiving change migrate-to-openhands-upstream. Update Purpose after archive.
## Requirements
### Requirement: Support multiple concurrent upstream providers

The system SHALL support running multiple GoProxy instances simultaneously, each configured with different upstream LLM providers, allowing users to choose between providers based on their needs.

#### Scenario: User sends request to OpenHands upstream via chat.trollllm.xyz

**Given** the user has a valid API key
**When** the user sends a POST request to `https://chat.trollllm.xyz/v1/messages`
**Then** the request SHALL be routed to the `goproxy-openhands` service on port 8004
**And** the request SHALL be forwarded to `llm-proxy.app.all-hands.dev`
**And** the response SHALL be returned to the user
**And** billing SHALL apply OpenHands pricing multipliers (1.06-1.08)

#### Scenario: User sends request to OhMyGPT upstream via chat2.trollllm.xyz

**Given** the user has a valid API key
**When** the user sends a POST request to `https://chat2.trollllm.xyz/v1/messages`
**Then** the request SHALL be routed to the `goproxy-ohmygpt` service on port 8005
**And** the request SHALL be forwarded to `apic1.ohmycdn.com`
**And** the response SHALL be returned to the user
**And** billing SHALL apply OhMyGPT pricing multipliers (1.04-1.1)

#### Scenario: Both upstream services run independently

**Given** both `goproxy-openhands` and `goproxy-ohmygpt` services are running
**When** one service experiences an error or upstream failure
**Then** the other service SHALL continue operating normally
**And** users using the working upstream SHALL NOT be affected

---

### Requirement: Docker Compose configuration for dual upstreams

The Docker Compose production configuration SHALL define two separate GoProxy services with independent configurations and port mappings.

#### Scenario: Docker Compose defines goproxy-openhands service

**Given** the `docker-compose.prod.yml` file
**When** the configuration is parsed
**Then** a service named `goproxy-openhands` SHALL be defined
**And** it SHALL mount `/goproxy/config-openhands-prod.json` to `/app/config.json`
**And** it SHALL expose internal port 8004
**And** it SHALL be connected to the `trollllm-network` Docker network

#### Scenario: Docker Compose defines goproxy-ohmygpt service

**Given** the `docker-compose.prod.yml` file
**When** the configuration is parsed
**Then** a service named `goproxy-ohmygpt` SHALL be defined
**And** it SHALL mount `/goproxy/config-ohmygpt-prod.json` to `/app/config.json`
**And** it SHALL expose internal port 8005
**And** it SHALL be connected to the `trollllm-network` Docker network

#### Scenario: Backend service mounts both upstream configuration files

**Given** the `docker-compose.prod.yml` backend service configuration
**When** the service starts
**Then** it SHALL mount `config-openhands-prod.json` to `/app/goproxy/config-openhands-prod.json`
**And** it SHALL mount `config-ohmygpt-prod.json` to `/app/goproxy/config-ohmygpt-prod.json`
**And** environment variable `GOPROXY_OPENHANDS_CONFIG_PATH` SHALL be set
**And** environment variable `GOPROXY_OHMYGPT_CONFIG_PATH` SHALL be set

---

### Requirement: Nginx routing for dual domains

The Nginx reverse proxy SHALL route requests from `chat.trollllm.xyz` to the OpenHands upstream and requests from `chat2.trollllm.xyz` to the OhMyGPT upstream.

#### Scenario: Nginx routes chat.trollllm.xyz to goproxy-openhands

**Given** a request to `https://chat.trollllm.xyz/v1/messages`
**When** Nginx processes the request
**Then** the request SHALL be proxied to `http://goproxy-openhands:8004`
**And** all proxy headers SHALL be set correctly (Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto)
**And** streaming SHALL be enabled (proxy_buffering off, Connection "")

#### Scenario: Nginx routes chat2.trollllm.xyz to goproxy-ohmygpt

**Given** a request to `https://chat2.trollllm.xyz/v1/messages`
**When** Nginx processes the request
**Then** the request SHALL be proxied to `http://goproxy-ohmygpt:8005`
**And** all proxy headers SHALL be set correctly
**And** streaming SHALL be enabled (proxy_buffering off, Connection "")

#### Scenario: HTTP requests redirect to HTTPS for both domains

**Given** an HTTP request to `http://chat.trollllm.xyz` or `http://chat2.trollllm.xyz`
**When** Nginx receives the request on port 80
**Then** it SHALL return a 301 redirect to the HTTPS version
**Except** for `/.well-known/acme-challenge/` paths used for SSL certificate validation

---

### Requirement: SSL/TLS certificate coverage for both domains

Both `chat.trollllm.xyz` and `chat2.trollllm.xyz` SHALL have valid SSL/TLS certificates issued by Let's Encrypt.

#### Scenario: SSL certificate includes both chat domains

**Given** the SSL certificate at `/etc/letsencrypt/live/trollllm.xyz/`
**When** a TLS handshake occurs for `chat.trollllm.xyz` or `chat2.trollllm.xyz`
**Then** the certificate SHALL be valid for that domain
**And** it SHALL use TLS 1.2 or TLS 1.3
**And** it SHALL use secure cipher suites (ECDHE-ECDSA-AES128-GCM-SHA256, etc.)

---

### Requirement: Independent upstream configuration files

Each GoProxy instance SHALL use a separate configuration file that defines the correct upstream endpoints, ports, and model configurations.

#### Scenario: config-openhands-prod.json configured for OpenHands upstream

**Given** the file `goproxy/config-openhands-prod.json`
**When** the configuration is loaded
**Then** the port SHALL be set to 8004
**And** endpoint `openhands-anthropic` SHALL point to `https://llm-proxy.app.all-hands.dev/v1/messages`
**And** all models SHALL have `"upstream": "openhands"`
**And** models SHALL include: Claude Opus 4.5, Claude Sonnet 4.5, Claude Haiku 4.5, Gemini 3 Pro Preview
**And** billing multipliers SHALL be set (1.06-1.08)

#### Scenario: config-ohmygpt-prod.json configured for OhMyGPT upstream

**Given** the file `goproxy/config-ohmygpt-prod.json`
**When** the configuration is loaded
**Then** the port SHALL be set to 8005
**And** endpoint `ohmygpt-anthropic` SHALL point to `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg/v1/messages`
**And** all models SHALL have `"upstream": "ohmygpt"`
**And** models SHALL include: Claude Opus 4.5, Claude Sonnet 4.5, Claude Haiku 4.5
**And** billing multipliers SHALL be set (1.04-1.1)

---

### Requirement: DNS configuration for chat2 subdomain

The DNS provider SHALL have an A record for `chat2.trollllm.xyz` pointing to the VPS IP address.

#### Scenario: DNS resolves chat2.trollllm.xyz to VPS IP

**Given** a DNS query for `chat2.trollllm.xyz`
**When** the query is resolved
**Then** it SHALL return an A record with the VPS IP address
**And** the TTL SHOULD be reasonably short (e.g., 300-3600 seconds) for easier updates

---

