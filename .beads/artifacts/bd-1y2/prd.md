# PRD: Priority OpenHands line with role-gated access

## Problem Statement

The platform currently has OpenHands and legacy lines (`chat.trollllm.xyz` on port 8004, `chat2.trollllm.xyz` on port 8005) but no dedicated priority line for high-priority users. The request is to introduce a new domain `chat-priority.trolllm.xyz` backed by `goproxy/config-openhands-prod-uutien.json` on port 8006, while keeping `chat.trollllm.xyz` backed by `goproxy/config-openhands-prod.json`.

Access to the new priority line must be role-gated by `usersNew.role`: only `admin` and `priority` can use it. Users with role `user` (and any non-allowed role) must be denied with the exact message: `vui long lien he qua discord de duoc tham gia line uu tien`.

The deployment flow must remain easy on Linux (Docker Compose + Nginx reverse proxy) with minimal manual changes.

## Scope

### In Scope

- Add production routing for `chat-priority.trolllm.xyz` to a dedicated GoProxy container using port 8006.
- Ensure `chat.trollllm.xyz` continues to route to the existing OpenHands container on port 8004.
- Add server-side authorization gate based on `usersNew.role`:
  - allow: `admin`, `priority`
  - deny: `user` and any other role or missing role
- Return forbidden response with exact message `vui long lien he qua discord de duoc tham gia line uu tien` when denied.
- Update Docker Compose/Nginx wiring for Linux deployment ergonomics.
- Add/adjust tests covering role-gate behavior.

### Out of Scope

- Changes to pricing, billing formulas, or token accounting.
- New user-role management UI/API in frontend/backend.
- Database schema redesign beyond reading existing `usersNew.role`.
- Migration of existing domains away from current behavior.

## Proposed Solution

1. **Priority host routing**
   - Add a new Nginx upstream and server block for `chat-priority.trolllm.xyz` pointing to a new service `goproxy-openhands-priority:8006`.
   - Keep existing `chat.trollllm.xyz` server block unchanged for regular OpenHands line.

2. **Dedicated Docker service for priority line**
   - Add `goproxy-openhands-priority` in `docker-compose.prod.yml`.
   - Mount `goproxy/config-openhands-prod-uutien.json` to `/app/config.json` in that service.
   - Keep `goproxy-openhands` mounting `goproxy/config-openhands-prod.json`.
   - Update service dependency wiring so Nginx waits for the priority service too.

3. **Role-gated authorization in GoProxy**
   - In request entry handlers (`/v1/chat/completions`, `/v1/messages`), detect if request host is the priority domain.
   - For priority host requests, query user role from `usersNew` and enforce allowlist `admin|priority`.
   - For denied users, return `403` JSON error containing exact required message.
   - Keep behavior for non-priority hosts unchanged.

4. **Tests and deployment verification**
   - Add unit/integration-level checks for role-based allow/deny logic.
   - Validate Docker Compose + Nginx config and startup on Linux-friendly workflow.

## Success Criteria

- Priority domain routes to dedicated priority GoProxy service on port 8006.
  - Verify: `docker compose -f docker-compose.prod.yml config`
  - Verify: `docker compose -f docker-compose.prod.yml up -d --build goproxy-openhands-priority nginx`
- `chat.trollllm.xyz` continues using regular OpenHands config (`config-openhands-prod.json`, port 8004).
  - Verify: `docker compose -f docker-compose.prod.yml up -d --build goproxy-openhands`
  - Verify: `docker compose -f docker-compose.prod.yml ps`
- Priority line rejects `role=user` with exact message.
  - Verify: `curl -sS https://chat-priority.trolllm.xyz/v1/models -H "Authorization: Bearer <USER_ROLE_KEY>" | jq`
- Priority line allows `role=admin` and `role=priority`.
  - Verify: `curl -sS https://chat-priority.trolllm.xyz/v1/models -H "Authorization: Bearer <ADMIN_KEY>"`
  - Verify: `curl -sS https://chat-priority.trolllm.xyz/v1/models -H "Authorization: Bearer <PRIORITY_KEY>"`
- GoProxy regression tests for userkey logic pass after role-gate additions.
  - Verify: `cd goproxy && go test ./internal/userkey/...`

## Technical Context

- `goproxy/main.go` currently validates API keys, resolves username, and performs credits pre-check by billing upstream, but does not enforce host-specific role access.
- `goproxy/internal/userkey/model.go` contains `LegacyUser.Role` mapped from `usersNew.role`.
- `goproxy/internal/userkey/validator.go` already queries `usersNew` with 5-second context timeout and can be extended with role lookup helpers.
- `docker-compose.prod.yml` currently defines only two GoProxy services (`goproxy-openhands`, `goproxy-ohmygpt`), no priority OpenHands service yet.
- `nginx/nginx.conf` already has active blocks for `chat.trollllm.xyz` and `chat2.trollllm.xyz`, with a commented-out priority host block that can be reintroduced and pointed to a dedicated upstream.
- `goproxy/config-openhands-prod-uutien.json` already exists with `port: 8006` and is intended for the priority line.

## Affected Files

- `goproxy/main.go`
- `goproxy/internal/userkey/validator.go`
- `goproxy/internal/userkey/model.go`
- `goproxy/internal/userkey/validator_test.go`
- `docker-compose.prod.yml`
- `nginx/nginx.conf`
- `init-ssl.sh`
- `goproxy/config-openhands-prod-uutien.json`

## Tasks

### 1. [routing] Add production routing for priority domain

End state: `chat-priority.trolllm.xyz` terminates at Nginx and proxies to a dedicated upstream targeting the priority GoProxy container on port 8006.

Metadata:

- depends_on: []
- parallel: true
- conflicts_with: ["nginx/nginx.conf", "init-ssl.sh"]
- files: ["nginx/nginx.conf", "init-ssl.sh"]

Verification:

- `docker compose -f docker-compose.prod.yml config`
- `docker compose -f docker-compose.prod.yml up -d --build nginx`

### 2. [docker] Add Linux-ready priority GoProxy service wiring

End state: production Compose includes `goproxy-openhands-priority` mounting `goproxy/config-openhands-prod-uutien.json` and wired into Nginx dependency graph.

Metadata:

- depends_on: []
- parallel: true
- conflicts_with: ["docker-compose.prod.yml"]
- files: ["docker-compose.prod.yml", "goproxy/config-openhands-prod-uutien.json"]

Verification:

- `docker compose -f docker-compose.prod.yml config`
- `docker compose -f docker-compose.prod.yml up -d --build goproxy-openhands-priority`

### 3. [auth] Enforce role gate for priority host in request handlers

End state: requests targeting priority host are allowed only when `usersNew.role` is `admin` or `priority`, and all other roles receive `403` with exact required message.

Metadata:

- depends_on: [1, 2]
- parallel: false
- conflicts_with: ["goproxy/main.go", "goproxy/internal/userkey/validator.go"]
- files: ["goproxy/main.go", "goproxy/internal/userkey/validator.go", "goproxy/internal/userkey/model.go"]

Verification:

- `cd goproxy && go test ./internal/userkey/...`
- `curl -sS https://chat-priority.trolllm.xyz/v1/models -H "Authorization: Bearer <USER_ROLE_KEY>" | jq`
- `curl -sS https://chat-priority.trolllm.xyz/v1/models -H "Authorization: Bearer <ADMIN_KEY>" | jq`

### 4. [regression] Preserve current behavior for regular chat line

End state: `chat.trollllm.xyz` continues to use non-priority OpenHands config and remains accessible for normal authenticated users as before.

Metadata:

- depends_on: [3]
- parallel: false
- conflicts_with: ["goproxy/main.go", "nginx/nginx.conf", "docker-compose.prod.yml"]
- files: ["goproxy/main.go", "nginx/nginx.conf", "docker-compose.prod.yml", "goproxy/config-openhands-prod.json"]

Verification:

- `curl -sS https://chat.trollllm.xyz/v1/models -H "Authorization: Bearer <USER_ROLE_KEY>" | jq`
- `docker compose -f docker-compose.prod.yml ps`

### 5. [test] Add coverage for role access matrix

End state: automated tests assert deny for `user`/unknown roles and allow for `admin`/`priority` on priority host path.

Metadata:

- depends_on: [3]
- parallel: true
- conflicts_with: ["goproxy/internal/userkey/validator_test.go"]
- files: ["goproxy/internal/userkey/validator_test.go", "goproxy/main.go"]

Verification:

- `cd goproxy && go test ./internal/userkey/...`
- `cd goproxy && go test ./...`

## Risks

- **Domain mismatch risk:** requirement uses `trolllm.xyz` while existing infra uses `trollllm.xyz`; wrong domain string can silently misroute traffic.
- **Host-header trust risk:** role gate based only on `Host` must rely on deployment behind Nginx/internal network; direct public access to GoProxy could bypass intended ingress controls.
- **Role data quality risk:** missing or unexpected `usersNew.role` values can accidentally grant/deny access if not explicitly handled (default-deny required).
- **Config drift risk:** two OpenHands config files (regular vs priority) can diverge unexpectedly if not documented and reviewed together.

## Open Questions

- Confirm final production hostname spelling: `chat-priority.trolllm.xyz` (requested) vs `chat-priority.trollllm.xyz` (current project convention).
- Should Friend Keys inherit owner role checks for priority line, or be denied by default regardless of owner role?
