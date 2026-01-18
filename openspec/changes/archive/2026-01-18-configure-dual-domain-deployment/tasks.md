# Tasks: Change GoProxy Port to 8004

## Implementation Tasks

### 1. Check GoProxy source code for port configuration
**Priority:** High
**Estimate:** 5 minutes
**Dependencies:** None

Verify how GoProxy reads the port configuration from config files.

- [ ] Check `goproxy/main.go` or similar entry point
- [ ] Confirm port is read from `config.json` "port" field
- [ ] No code changes needed if port is configurable via JSON

**Validation:**
```bash
grep -r "port" goproxy/*.go goproxy/internal/**/*.go
```

### 2. Backup current configuration files
**Priority:** High
**Estimate:** 2 minutes
**Dependencies:** None

- [ ] Backup nginx.conf: `cp nginx/nginx.conf nginx/nginx.conf.backup-$(date +%Y%m%d)`
- [ ] Backup config files: `cp goproxy/config-ohmygpt-prod.json goproxy/config-ohmygpt-prod.json.backup-$(date +%Y%m%d)`

**Validation:**
```bash
ls -la nginx/*.backup* goproxy/*.backup*
```

### 3. Update GoProxy config files to use port 8004
**Priority:** High
**Estimate:** 2 minutes
**Dependencies:** Task 2

Update the port setting in GoProxy configuration files.

**Files to modify:**
- `goproxy/config-ohmygpt-prod.json` - Change `"port": 8005` to `"port": 8004`
- `goproxy/config-ohmygpt-dev.json` - Change `"port": 8005` to `"port": 8004` (for consistency)

**Changes:**
```json
{
  "port": 8004,  // Changed from 8005
  // ... rest of config
}
```

**Validation:**
```bash
grep '"port"' goproxy/config-ohmygpt-prod.json
# Should output: "port": 8004,
```

### 4. Update nginx upstream to point to port 8004
**Priority:** High
**Estimate:** 2 minutes
**Dependencies:** Task 3

**File to modify:** `nginx/nginx.conf`

**Change on line 66-69:**
```nginx
upstream goproxy {
    server goproxy:8004;  # Changed from 8005
    keepalive 32;
}
```

**Validation:**
```bash
grep -A2 "upstream goproxy" nginx/nginx.conf
# Should show: server goproxy:8004;
```

## Deployment Tasks

### 5. Test nginx configuration syntax
**Priority:** Critical
**Estimate:** 1 minute
**Dependencies:** Task 4

```bash
docker compose exec nginx nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 6. Deploy changes to production
**Priority:** High
**Estimate:** 5 minutes
**Dependencies:** Tasks 3, 4, 5

**Deployment steps:**

```bash
# 1. Rebuild and restart goproxy service with new config
docker compose -f docker-compose.prod.yml up -d --build goproxy

# 2. Reload nginx configuration (no downtime)
docker compose exec nginx nginx -s reload

# 3. Check service status
docker compose ps goproxy nginx
```

**Expected output:**
- goproxy service should restart with new port
- nginx should reload without errors

**Validation:**
```bash
# Check goproxy is listening on port 8004
docker compose exec goproxy netstat -tlnp | grep 8004

# Check logs for successful startup
docker compose logs --tail=50 goproxy
```

## Post-Deployment Validation

### 7. Verify chat.trollllm.xyz is accessible
**Priority:** Critical
**Estimate:** 5 minutes
**Dependencies:** Task 6

**Tests to perform:**

```bash
# Test SSL connection
curl -I https://chat.trollllm.xyz
# Expected: HTTP/2 200

# Test LLM API endpoint (requires valid API key)
curl https://chat.trollllm.xyz/v1/models \
  -H "Authorization: Bearer sk-trollllm-your-test-key"
# Expected: JSON response with model list

# Verify internal routing (from server)
docker compose exec nginx curl -I http://goproxy:8004/v1/models
# Expected: HTTP/1.1 200 or similar success response
```

**Success criteria:**
- [ ] SSL certificate is valid (no warnings)
- [ ] HTTP 200 responses for valid endpoints
- [ ] LLM API responds correctly
- [ ] No errors in nginx or goproxy logs

### 8. Monitor service stability
**Priority:** Medium
**Estimate:** 15 minutes
**Dependencies:** Task 7

```bash
# Monitor logs for errors
docker compose logs -f --tail=100 goproxy nginx

# Check resource usage
docker stats goproxy nginx

# Verify no container restarts
docker compose ps
```

**Success criteria:**
- [ ] No error messages in logs
- [ ] CPU and memory usage are normal
- [ ] No container restarts
- [ ] Service responds to requests consistently for 15+ minutes

## Rollback Plan (if needed)

### 9. Rollback to previous configuration
**Priority:** N/A (only if deployment fails)
**Estimate:** 3 minutes

```bash
# 1. Restore config files
cp goproxy/config-ohmygpt-prod.json.backup-YYYYMMDD goproxy/config-ohmygpt-prod.json
cp nginx/nginx.conf.backup-YYYYMMDD nginx/nginx.conf

# 2. Restart goproxy with old config
docker compose restart goproxy

# 3. Reload nginx
docker compose exec nginx nginx -s reload

# 4. Verify service is working
curl -I https://chat.trollllm.xyz
```

## Documentation Tasks

### 10. Update project documentation
**Priority:** Low
**Estimate:** 5 minutes
**Dependencies:** Successful deployment

- [ ] Update `openspec/project.md` line 36 to reflect new port
- [ ] Update any deployment runbooks or documentation

**Change in openspec/project.md:**
```markdown
**LLM Proxy:**
- Go 1.25
- MongoDB driver for state management
- HTTP/2 support with connection pooling
- Custom rate limiting
- Runs on port 8004 (prod) / chat.trollllm.xyz (prod)
```

## Summary Checklist

Pre-deployment:
- [ ] Source code verified - port is configurable via JSON
- [ ] Configuration files backed up

Implementation:
- [ ] config-ohmygpt-prod.json updated (port 8004)
- [ ] nginx.conf updated (upstream points to port 8004)
- [ ] Nginx configuration syntax validated

Deployment:
- [ ] GoProxy service restarted with new config
- [ ] Nginx reloaded successfully
- [ ] No errors in deployment logs

Validation:
- [ ] chat.trollllm.xyz accessible via HTTPS
- [ ] LLM API requests working correctly
- [ ] Service stable for 15+ minutes
- [ ] No errors in logs

Documentation:
- [ ] Project documentation updated with new port

## Time Estimate

- **Total implementation time:** ~15 minutes
- **Deployment time:** ~5 minutes
- **Validation time:** ~20 minutes
- **Total:** ~40 minutes
