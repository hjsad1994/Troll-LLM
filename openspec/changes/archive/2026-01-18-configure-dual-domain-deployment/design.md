# Design: Change GoProxy Port from 8005 to 8004

## Problem Statement

GoProxy service hiện đang chạy trên port 8005. Cần đổi sang port 8004 theo yêu cầu deployment mới.

## Current Architecture

```
Internet → Nginx:443 (chat.trollllm.xyz) → goproxy:8005 → Upstream LLM APIs
```

## Proposed Architecture

```
Internet → Nginx:443 (chat.trollllm.xyz) → goproxy:8004 → Upstream LLM APIs
```

## Design Decisions

### 1. Port Configuration Method

**Decision**: Sử dụng config file JSON để set port thay vì environment variable hoặc hardcode.

**Rationale**:
- GoProxy đã sử dụng `config-ohmygpt-prod.json` với field `"port": 8005`
- Chỉ cần thay đổi giá trị trong JSON file, không cần code changes
- Consistent với cách GoProxy đọc config hiện tại

**Implementation**:
- Modify `goproxy/config-ohmygpt-prod.json`: change `"port": 8005` to `"port": 8004`
- Modify `goproxy/config-ohmygpt-dev.json` for dev environment consistency

### 2. Nginx Configuration Update

**Decision**: Chỉ update upstream port, không thay đổi server block hoặc SSL config.

**Rationale**:
- Domain name không đổi (vẫn là `chat.trollllm.xyz`)
- SSL certificates không cần thay đổi
- Chỉ cần update internal routing từ nginx → goproxy

**Implementation**:
```nginx
upstream goproxy {
    server goproxy:8004;  # Changed from 8005
    keepalive 32;
}
```

### 3. Deployment Strategy

**Decision**: Rolling update - restart goproxy service, then reload nginx (no full restart).

**Rationale**:
- Minimize downtime
- Nginx reload is graceful (no connection drops)
- GoProxy restart is quick (~2-3 seconds)

**Steps**:
1. Update config files
2. Restart goproxy service: `docker compose up -d --build goproxy`
3. Reload nginx config: `docker compose exec nginx nginx -s reload`

**Trade-offs**:
- **Downtime**: ~2-3 seconds during goproxy restart (acceptable for this change)
- **Risk**: Low - if port 8004 is available and not blocked

### 4. No Docker Compose Changes Needed

**Decision**: No changes to `docker-compose.prod.yml`.

**Rationale**:
- GoProxy container không expose ports ra host (chỉ dùng Docker internal network)
- Nginx routes to `goproxy:8004` via Docker DNS
- Port change is purely internal to the container

## Validation Strategy

### Pre-deployment checks:
1. Verify port 8004 is not in use: `netstat -tlnp | grep 8004`
2. Verify nginx config syntax: `nginx -t`
3. Backup configs before making changes

### Post-deployment checks:
1. Check goproxy listens on 8004: `docker exec goproxy netstat -tlnp | grep 8004`
2. Test HTTPS endpoint: `curl -I https://chat.trollllm.xyz`
3. Test LLM API functionality with real request
4. Monitor logs for 15+ minutes

## Rollback Plan

If deployment fails:
1. Restore backup config files
2. Restart goproxy: `docker compose restart goproxy`
3. Reload nginx: `docker compose exec nginx nginx -s reload`
4. Total rollback time: ~3 minutes

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Port 8004 already in use | Low | High | Check with netstat before deployment |
| GoProxy doesn't start on 8004 | Low | High | Verify config format, check logs immediately |
| Nginx can't connect to new port | Low | Medium | Test nginx config before reload, have rollback ready |
| Temporary service disruption | High | Low | Deploy during low-traffic period, notify users |

## Alternative Approaches Considered

### Alternative 1: Use environment variable for port
**Rejected** - GoProxy already uses JSON config for all settings, adding env var would be inconsistent

### Alternative 2: Keep port 8005, add port mapping
**Rejected** - User specifically requested port 8004, no reason to keep old port

### Alternative 3: Change port in Dockerfile
**Rejected** - Port should be configurable via config file, not build-time

## Future Considerations

- If multiple GoProxy instances are needed in future, consider port ranges (8004, 8005, 8006, etc.)
- Could add health check endpoint monitoring after deployment
- Consider adding port to monitoring dashboards/alerts
