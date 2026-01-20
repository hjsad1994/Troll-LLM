# Dual-Upstream Deployment Summary

This document summarizes the configuration changes made to support dual-upstream deployment.

## ✅ Completed Configuration Changes

### 1. GoProxy Configuration Files
- **config-openhands-prod.json**: Port 8004 ✓ (already configured)
- **config-ohmygpt-prod.json**: Port 8005 ✓ (already configured)

### 2. Docker Compose (docker-compose.prod.yml)
Updated to support two GoProxy services running simultaneously:

**Services Created:**
- `goproxy-openhands`: OpenHands upstream on port 8004
- `goproxy-ohmygpt`: OhMyGPT upstream on port 8005

**Backend Updates:**
- Added volume mounts for both config files
- Set environment variables:
  - `GOPROXY_OPENHANDS_CONFIG_PATH=/app/goproxy/config-openhands-prod.json`
  - `GOPROXY_OHMYGPT_CONFIG_PATH=/app/goproxy/config-ohmygpt-prod.json`

**Nginx Updates:**
- Updated `depends_on` to include both GoProxy services

### 3. Nginx Configuration (nginx/nginx.conf)
Updated to route traffic to both upstreams:

**Upstream Blocks:**
- `goproxy-openhands`: Routes to `goproxy-openhands:8004`
- `goproxy-ohmygpt`: Routes to `goproxy-ohmygpt:8005`

**Server Blocks:**
- `chat.trollllm.xyz` → routes to `goproxy-openhands` (OpenHands)
- `chat2.trollllm.xyz` → routes to `goproxy-ohmygpt` (OhMyGPT)

**HTTP Redirect:**
- Updated to include `chat2.trollllm.xyz` for HTTPS redirect

### 4. Documentation
Created `DEPLOYMENT_ENV.md` with:
- Environment variable requirements
- Configuration file mapping
- Verification checklist
- Troubleshooting guide

### 5. File Cleanup
Archived old configuration files:
- `docker-compose.prod copy.yml` → `archive/`
- `docker-compose.prod-o.yml` → `archive/`

## 🔄 Manual Steps Required (VPS Deployment)

Before deploying to VPS, you must complete these steps:

### Step 1: Configure DNS
Add DNS A record for `chat2.trollllm.xyz`:
```
Type: A
Name: chat2
Value: <VPS_IP_ADDRESS>
TTL: 300-3600 seconds
```

Verify DNS propagation:
```bash
nslookup chat2.trollllm.xyz
```

### Step 2: Request SSL Certificate
Update the SSL certificate to include the new subdomain:

```bash
# Option 1: Expand existing certificate
certbot certonly --expand \
  -d trollllm.xyz \
  -d www.trollllm.xyz \
  -d api.trollllm.xyz \
  -d chat.trollllm.xyz \
  -d chat2.trollllm.xyz

# Option 2: Request separate certificate
certbot certonly --webroot \
  -w /var/www/certbot \
  -d chat2.trollllm.xyz
```

### Step 3: Deploy to VPS
Execute deployment on the VPS:

```bash
# 1. Pull latest changes
git pull origin main

# 2. Stop running containers
docker-compose down

# 3. Rebuild images
docker-compose -f docker-compose.prod.yml build

# 4. Start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Monitor logs
docker-compose logs -f goproxy-openhands goproxy-ohmygpt
```

### Step 4: Verify Deployment
Check that both services are running:

```bash
# Check container status
docker-compose ps

# Check OpenHands endpoint
curl -I https://chat.trollllm.xyz

# Check OhMyGPT endpoint
curl -I https://chat2.trollllm.xyz
```

## 📊 Service Architecture

```
                          ┌─────────────────┐
                          │  Nginx (443)    │
                          │  Reverse Proxy  │
                          └────────┬────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
           ┌────────▼────────┐         ┌─────────▼────────┐
           │ chat.trollllm   │         │ chat2.trollllm   │
           │ (OpenHands)     │         │ (OhMyGPT)        │
           └────────┬────────┘         └─────────┬────────┘
                    │                             │
         ┌──────────▼──────────┐       ┌─────────▼─────────┐
         │ goproxy-openhands   │       │ goproxy-ohmygpt   │
         │ Port: 8004          │       │ Port: 8005        │
         │ Config: openhands   │       │ Config: ohmygpt   │
         └──────────┬──────────┘       └─────────┬─────────┘
                    │                             │
                    ▼                             ▼
         llm-proxy.app.all-hands.dev    apic1.ohmycdn.com
```

## 🎯 Success Criteria

- [x] Docker Compose configuration updated with dual services
- [x] Nginx configuration routes both domains correctly
- [x] Configuration files have correct ports (8004, 8005)
- [x] Backend mounts and references both config files
- [x] Old configuration files archived
- [x] Documentation created
- [ ] DNS configured for chat2.trollllm.xyz (manual step)
- [ ] SSL certificate obtained for chat2.trollllm.xyz (manual step)
- [ ] Deployed to VPS and tested (manual step)

## 🔗 Endpoint URLs

After deployment, users can access:

- **OpenHands Upstream**: `https://chat.trollllm.xyz/v1/messages`
  - Models: Claude Opus/Sonnet/Haiku, Gemini 3 Pro
  - Billing multipliers: 1.06-1.08

- **OhMyGPT Upstream**: `https://chat2.trollllm.xyz/v1/messages`
  - Models: Claude Opus/Sonnet/Haiku
  - Billing multipliers: 1.04-1.1

## 📝 Testing Commands

After deployment, test both endpoints:

```bash
# Test OpenHands
curl -X POST https://chat.trollllm.xyz/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-trollllm-YOUR_KEY" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'

# Test OhMyGPT
curl -X POST https://chat2.trollllm.xyz/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-trollllm-YOUR_KEY" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'
```

## 🔧 Rollback Procedure

If issues occur, rollback by:

1. Stop containers: `docker-compose down`
2. Restore old config: `git checkout HEAD~1 docker-compose.prod.yml nginx/nginx.conf`
3. Restart: `docker-compose up -d`

Or restore from archive:
```bash
cp archive/docker-compose.prod-o.yml docker-compose.prod.yml
docker-compose down && docker-compose up -d
```

## 📌 Next Steps

1. **Configure DNS** for `chat2.trollllm.xyz` pointing to VPS IP
2. **Request SSL certificate** for the new subdomain
3. **Deploy to VPS** following the deployment steps above
4. **Test both endpoints** to ensure they work correctly
5. **Monitor logs** for the first hour after deployment
6. **Update user documentation** to explain the two endpoints
