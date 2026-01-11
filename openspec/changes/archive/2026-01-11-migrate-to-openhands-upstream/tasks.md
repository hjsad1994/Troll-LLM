# Tasks: Configure Dual-Upstream Deployment

## Pre-Deployment: DNS & SSL Setup

### Task 1: Configure DNS for chat2.trollllm.xyz ⚠️ MANUAL STEP REQUIRED
**Action**: Add DNS A record for new subdomain
- [ ] Add A record: `chat2.trollllm.xyz` → VPS IP address
- [ ] Wait for DNS propagation (typically 5-30 minutes)
- [ ] Verify with: `nslookup chat2.trollllm.xyz`

**Validation**: DNS resolves to correct IP address

**Status**: ⚠️ Requires VPS access

---

### Task 2: Request SSL Certificate for chat2.trollllm.xyz ⚠️ MANUAL STEP REQUIRED
**Action**: Use Certbot to obtain certificate
- [x] Update nginx HTTP redirect to include `chat2.trollllm.xyz` ✅
- [ ] Run: `certbot certonly --webroot -w /var/www/certbot -d chat2.trollllm.xyz`
- [ ] Or expand existing certificate: `certbot certonly --expand -d trollllm.xyz -d www.trollllm.xyz -d api.trollllm.xyz -d chat.trollllm.xyz -d chat2.trollllm.xyz`

**Validation**: Certificate files exist in `/etc/letsencrypt/live/trollllm.xyz/`

**Status**: ⚠️ Requires VPS access (nginx config updated locally)

---

## Configuration Changes

### Task 3: Update config-openhands-prod.json Port ✅ COMPLETED
**File**: `goproxy/config-openhands-prod.json`
- [x] Verify port is set to 8004
- [x] Verify all upstream endpoints are correct
- [x] Ensure models have `"upstream": "openhands"`

**Validation**: ✅ JSON is valid; port 8004 confirmed

**Status**: ✅ Complete

---

### Task 4: Update config-ohmygpt-prod.json Port ✅ COMPLETED
**File**: `goproxy/config-ohmygpt-prod.json`
- [x] Verify port is set to 8005
- [x] Verify all upstream endpoints are correct
- [x] Ensure models have `"upstream": "ohmygpt"`

**Validation**: ✅ JSON is valid; port 8005 confirmed

**Status**: ✅ Complete

---

### Task 5: Update docker-compose.prod.yml ✅ COMPLETED
**File**: `docker-compose.prod.yml`

**Changes completed:**

1. [x] **Update nginx depends_on**:
   - Added `goproxy-openhands` and `goproxy-ohmygpt` dependencies

2. [x] **Update backend volumes**:
   - Changed to mount `config-openhands-prod.json` and `config-ohmygpt-prod.json`

3. [x] **Update backend environment**:
   - Set `GOPROXY_OPENHANDS_CONFIG_PATH=/app/goproxy/config-openhands-prod.json`
   - Set `GOPROXY_OHMYGPT_CONFIG_PATH=/app/goproxy/config-ohmygpt-prod.json`

4. [x] **Rename and reconfigure goproxy service to goproxy-openhands**:
   - Service name changed
   - Mounts `config-openhands-prod.json`

5. [x] **Add new goproxy-ohmygpt service**:
   - New service created
   - Mounts `config-ohmygpt-prod.json`

**Validation**: ✅ Docker Compose syntax validated with `docker-compose config`

**Status**: ✅ Complete

---

### Task 6: Update nginx.conf ✅ COMPLETED
**File**: `nginx/nginx.conf`

**Changes completed:**

1. [x] **Update upstream blocks**:
   - Created `upstream goproxy-openhands` pointing to port 8004
   - Created `upstream goproxy-ohmygpt` pointing to port 8005

2. [x] **Update HTTP redirect**:
   - Added `chat2.trollllm.xyz` to server_name

3. [x] **Update chat.trollllm.xyz server block**:
   - Changed proxy_pass to `http://goproxy-openhands`
   - Updated comments

4. [x] **Add new server block for chat2.trollllm.xyz**:
   - Created complete server block for OhMyGPT
   - Routes to `http://goproxy-ohmygpt`
   - Includes all security headers and SSL config

**Validation**: ✅ Nginx configuration structure validated

**Status**: ✅ Complete (SSL will be validated on VPS after certificate is obtained)

---

### Task 7: Verify Environment Variables ✅ COMPLETED
**File**: `.env` and documentation
- [x] Created `DEPLOYMENT_ENV.md` documentation
- [x] Documented OpenHands environment requirements
- [x] Documented OhMyGPT environment requirements
- [x] Documented MongoDB connection requirements
- [x] Created verification checklist

**Validation**: ✅ Documentation created with comprehensive environment variable guide

**Status**: ✅ Complete

---

## Deployment

### Task 8: Deploy to VPS ⚠️ MANUAL STEP REQUIRED
**Action**: Execute deployment on production server

1. [ ] Pull latest changes: `git pull origin main`
2. [ ] Stop containers: `docker-compose down`
3. [ ] Rebuild images: `docker-compose -f docker-compose.prod.yml build`
4. [ ] Start services: `docker-compose -f docker-compose.prod.yml up -d`
5. [ ] Monitor logs: `docker-compose logs -f goproxy-openhands goproxy-ohmygpt`

**Validation**: All containers start successfully; no error logs

**Status**: ⚠️ Requires VPS access

---

### Task 9: Test OpenHands Endpoint (chat.trollllm.xyz) ⚠️ MANUAL STEP REQUIRED
**Action**: Send test request to OpenHands upstream

```bash
curl -X POST https://chat.trollllm.xyz/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-trollllm-..." \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'
```

**Validation**: Successful response from OpenHands upstream

**Status**: ⚠️ Requires VPS deployment

---

### Task 10: Test OhMyGPT Endpoint (chat2.trollllm.xyz) ⚠️ MANUAL STEP REQUIRED
**Action**: Send test request to OhMyGPT upstream

```bash
curl -X POST https://chat2.trollllm.xyz/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-trollllm-..." \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'
```

**Validation**: Successful response from OhMyGPT upstream

**Status**: ⚠️ Requires VPS deployment

---

### Task 11: Monitor Production Health ⚠️ MANUAL STEP REQUIRED
**Action**: Check service health for first hour

- [ ] Monitor Docker container stats: `docker stats`
- [ ] Check error logs: `docker-compose logs --tail=100 -f`
- [ ] Verify both endpoints remain responsive
- [ ] Monitor memory usage (2 GoProxy instances)

**Validation**: Both services stable; no memory issues; requests succeed

**Status**: ⚠️ Requires VPS deployment

---

### Task 12: Update Documentation ✅ COMPLETED
**Action**: Document the dual-upstream configuration

- [x] Created `DEPLOYMENT_ENV.md` with environment variable documentation
- [x] Created `DEPLOYMENT_SUMMARY.md` with deployment guide
- [x] Documented differences between OpenHands and OhMyGPT upstreams
- [x] Provided guidance on endpoint usage
- [x] Updated deployment procedures

**Validation**: ✅ Documentation reviewed and complete

**Status**: ✅ Complete

---

## Optional Cleanup

### Task 13: Archive Old Configuration Files ✅ COMPLETED
**Action**: Clean up redundant Docker Compose files

- [x] Archive `docker-compose.prod copy.yml` → moved to `archive/`
- [x] Archive `docker-compose.prod-o.yml` → moved to `archive/`
- [x] Keep only `docker-compose.prod.yml` as primary config

**Validation**: ✅ Old files moved to archive directory

**Status**: ✅ Complete

---

## Summary

### ✅ Completed Tasks (Local Configuration)
- Task 3: Config file verification ✅
- Task 4: Config file verification ✅
- Task 5: Docker Compose updates ✅
- Task 6: Nginx configuration ✅
- Task 7: Environment documentation ✅
- Task 12: Documentation ✅
- Task 13: File cleanup ✅

### ⚠️ Remaining Tasks (VPS Deployment)
- Task 1: DNS configuration (requires VPS DNS access)
- Task 2: SSL certificate (requires VPS access + DNS propagation)
- Task 8: VPS deployment (requires VPS SSH access)
- Task 9: OpenHands endpoint testing (after deployment)
- Task 10: OhMyGPT endpoint testing (after deployment)
- Task 11: Production health monitoring (after deployment)

## Parallel Work

- Tasks 3-7 ✅ Completed in parallel (different files)
- Tasks 1-2 ⚠️ Must complete before Task 8
- Tasks 9-10 can be done in parallel after Task 8
- Task 12-13 ✅ Completed

## Rollback Procedure

If issues arise:

1. Stop containers: `docker-compose down`
2. Restore from archive: `cp archive/docker-compose.prod-o.yml docker-compose.prod.yml`
3. Restart with old configuration: `docker-compose up -d`
4. Investigate issues before retry

Or use git:
```bash
git checkout HEAD docker-compose.prod.yml nginx/nginx.conf
docker-compose down && docker-compose up -d
```

## Dependencies Graph

```
✅ Task 3-7 (Configs) → READY
⚠️ Task 1 (DNS) → Task 2 (SSL) → Task 8 (Deploy)
⚠️ Task 8 → Tasks 9-10 (Test) → Task 11 (Monitor)
✅ Task 12 (Docs) → COMPLETE
✅ Task 13 (Cleanup) → COMPLETE
```

## Next Steps for User

1. **Configure DNS** on your domain provider:
   - Add A record for `chat2.trollllm.xyz` → Your VPS IP
   - Wait for propagation (5-30 minutes)

2. **Request SSL certificate** on VPS:
   ```bash
   certbot certonly --expand -d trollllm.xyz -d www.trollllm.xyz -d api.trollllm.xyz -d chat.trollllm.xyz -d chat2.trollllm.xyz
   ```

3. **Deploy to VPS**:
   ```bash
   git pull origin main
   docker-compose down
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

4. **Test both endpoints** using the curl commands in Tasks 9-10

5. **Monitor logs** for the first hour after deployment

See `DEPLOYMENT_SUMMARY.md` for detailed deployment instructions.
