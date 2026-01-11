# Local Testing Guide for Dual-Upstream GoProxy

## Quick Test Setup

This guide shows how to test both GoProxy services locally without domains.

## Step 1: Start the Services

Run both GoProxy services:

```bash
docker-compose -f docker-compose.test.yml up --build
```

This will start:
- **goproxy-openhands** on `localhost:8004` (OpenHands upstream)
- **goproxy-ohmygpt** on `localhost:8005` (OhMyGPT upstream)

## Step 2: Wait for Services to Start

Check logs to see when services are ready:

```bash
docker-compose -f docker-compose.test.yml logs -f
```

Look for messages like:
- `Server listening on :8004`
- `Server listening on :8005`

## Step 3: Test OpenHands Upstream (Port 8004)

Test the OpenHands endpoint:

```bash
curl -X POST http://localhost:8004/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-trollllm-YOUR_API_KEY" \
  -d "{
    \"model\": \"claude-sonnet-4-5-20250929\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Hello, test from port 8004\"}],
    \"max_tokens\": 100
  }"
```

**Expected Result:**
- Status: 200 OK
- Response from OpenHands upstream (`llm-proxy.app.all-hands.dev`)

## Step 4: Test OhMyGPT Upstream (Port 8005)

Test the OhMyGPT endpoint:

```bash
curl -X POST http://localhost:8005/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-trollllm-YOUR_API_KEY" \
  -d "{
    \"model\": \"claude-sonnet-4-5-20250929\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Hello, test from port 8005\"}],
    \"max_tokens\": 100
  }"
```

**Expected Result:**
- Status: 200 OK
- Response from OhMyGPT upstream (`apic1.ohmycdn.com`)

## Step 5: Verify Configuration

### Check Port 8004 (OpenHands):
```bash
curl -v http://localhost:8004/health
```

### Check Port 8005 (OhMyGPT):
```bash
curl -v http://localhost:8005/health
```

## Step 6: Monitor Logs

Watch both services in real-time:

```bash
# Watch both
docker-compose -f docker-compose.test.yml logs -f

# Watch only OpenHands
docker-compose -f docker-compose.test.yml logs -f goproxy-openhands

# Watch only OhMyGPT
docker-compose -f docker-compose.test.yml logs -f goproxy-ohmygpt
```

## Step 7: Check Container Status

Verify both containers are running:

```bash
docker-compose -f docker-compose.test.yml ps
```

Should show:
```
NAME                    STATUS          PORTS
goproxy-openhands       Up              0.0.0.0:8004->8004/tcp
goproxy-ohmygpt         Up              0.0.0.0:8005->8005/tcp
```

## Troubleshooting

### Port Already in Use

If ports are busy:
```bash
# Check what's using the ports
netstat -ano | findstr :8004
netstat -ano | findstr :8005

# Stop the test services
docker-compose -f docker-compose.test.yml down
```

### Services Won't Start

Check logs for errors:
```bash
docker-compose -f docker-compose.test.yml logs
```

Common issues:
1. **Missing .env file**: Ensure `.env` exists with API keys
2. **Invalid config files**: Check JSON syntax in config files
3. **Port conflicts**: Another service using 8004 or 8005

### API Key Not Working

Make sure your `.env` file has valid keys for both upstreams.

## Stop the Services

When done testing:

```bash
docker-compose -f docker-compose.test.yml down
```

## Test Results to Verify

✅ **Success Criteria:**
- [ ] Port 8004 responds to requests
- [ ] Port 8005 responds to requests
- [ ] Both services can process LLM requests
- [ ] Logs show correct upstream routing
- [ ] No port conflicts
- [ ] Both containers stay running

## Next Steps

Once local testing passes:
1. Commit changes to git
2. Follow `DEPLOYMENT_SUMMARY.md` for VPS deployment
3. Configure DNS for `chat2.trollllm.xyz`
4. Request SSL certificates
5. Deploy with `docker-compose.prod.yml`

## Quick Test Script

Save this as `test-local.sh`:

```bash
#!/bin/bash

echo "Starting GoProxy services..."
docker-compose -f docker-compose.test.yml up -d --build

echo "Waiting for services to start..."
sleep 10

echo "Testing OpenHands (port 8004)..."
curl -s http://localhost:8004/health || echo "Port 8004 not responding"

echo "Testing OhMyGPT (port 8005)..."
curl -s http://localhost:8005/health || echo "Port 8005 not responding"

echo "Checking container status..."
docker-compose -f docker-compose.test.yml ps

echo "Done! Check logs with: docker-compose -f docker-compose.test.yml logs -f"
```

Run with:
```bash
bash test-local.sh
```
