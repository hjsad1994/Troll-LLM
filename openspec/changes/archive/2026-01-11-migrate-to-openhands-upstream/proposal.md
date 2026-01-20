# Proposal: Configure Dual-Upstream Deployment with OpenHands and OhMyGPT

## Why

Users need flexibility to choose between different LLM upstream providers based on their preferences for pricing, availability, and features. Currently, the production deployment only supports a single upstream at a time, forcing all users to use the same provider. By deploying both OpenHands and OhMyGPT upstreams simultaneously:

1. **User Choice**: Users can select their preferred provider via different endpoints
2. **Redundancy**: If one upstream experiences issues, users can switch to the alternative
3. **Price Options**: Different billing multipliers (OpenHands: 1.06-1.08x vs OhMyGPT: 1.04-1.1x) allow users to optimize costs
4. **Feature Access**: OpenHands offers Gemini 3 Pro Preview which OhMyGPT doesn't support

This change enables a dual-provider architecture where both services run independently on separate domains.

## What Changes

Configure the production deployment to run two GoProxy instances simultaneously:

### Configuration Changes

1. **GoProxy Service #1 (OpenHands)**:
   - Domain: `chat.trollllm.xyz`
   - Port: 8004
   - Config: `config-openhands-prod.json`
   - Upstream: `llm-proxy.app.all-hands.dev`
   - Models: Claude Opus/Sonnet/Haiku, Gemini 3 Pro

2. **GoProxy Service #2 (OhMyGPT)**:
   - Domain: `chat2.trollllm.xyz`
   - Port: 8005
   - Config: `config-ohmygpt-prod.json`
   - Upstream: `apic1.ohmycdn.com`
   - Models: Claude Opus/Sonnet/Haiku

3. **Docker Compose Updates**:
   - Add two separate GoProxy services: `goproxy-openhands` and `goproxy-ohmygpt`
   - Mount correct configuration files for each service
   - Expose different internal ports (8004, 8005)

4. **Nginx Configuration**:
   - Add upstream block for `goproxy-openhands:8004`
   - Add upstream block for `goproxy-ohmygpt:8005`
   - Create server block for `chat.trollllm.xyz` → OpenHands
   - Create server block for `chat2.trollllm.xyz` → OhMyGPT
   - Configure SSL certificates for both domains

5. **Backend Configuration**:
   - Update environment variables to reference both config files
   - Ensure backend can read both upstream configurations for model pricing

## Goals

- ✅ Deploy two GoProxy instances with different upstream providers
- ✅ Route `chat.trollllm.xyz` to OpenHands (port 8004)
- ✅ Route `chat2.trollllm.xyz` to OhMyGPT (port 8005)
- ✅ Allow users to choose their preferred upstream endpoint
- ✅ Maintain independent configuration for each upstream
- ✅ Enable easy monitoring and troubleshooting per upstream

## Non-Goals

- Automatic failover between upstreams (users choose explicitly)
- Load balancing across upstreams
- Merging configuration files
- Changing authentication or billing logic

## Success Criteria

1. Both GoProxy services start successfully in Docker
2. `https://chat.trollllm.xyz/v1/messages` proxies to OpenHands upstream
3. `https://chat2.trollllm.xyz/v1/messages` proxies to OhMyGPT upstream
4. Both endpoints handle concurrent requests without interference
5. SSL certificates work for both domains
6. Nginx properly routes to correct upstream based on domain
7. Each service maintains independent rate limiting and connection pooling

## Dependencies

- **OpenHands Upstream**: Service must be accessible at `llm-proxy.app.all-hands.dev`
- **OhMyGPT Upstream**: Service must be accessible at `apic1.ohmycdn.com`
- **DNS Configuration**: `chat2.trollllm.xyz` must be added to DNS records pointing to VPS IP
- **SSL Certificates**: Need to obtain certificate for `chat2.trollllm.xyz` via Certbot
- **Valid API Keys**: Both upstreams require valid API keys in `.env`
- **VPS Resources**: Sufficient CPU/memory to run two GoProxy instances

## Risks & Mitigation

**Risk**: Running two GoProxy instances doubles memory usage
- *Mitigation*: Monitor VPS resources; adjust connection pool sizes if needed

**Risk**: DNS propagation delay for `chat2.trollllm.xyz`
- *Mitigation*: Set up DNS before deployment; verify propagation before SSL cert request

**Risk**: SSL certificate request may fail for new subdomain
- *Mitigation*: Test Certbot standalone first; ensure port 80 is accessible

**Risk**: Different billing multipliers between upstreams (1.04-1.1 vs 1.06-1.08)
- *Mitigation*: Clearly document pricing differences; ensure backend handles both configs

**Risk**: Users may be confused about which endpoint to use
- *Mitigation*: Document differences in API documentation; provide guidance in frontend

## Timeline

**Phase 1: DNS & SSL Setup** (can start immediately)
- Configure DNS for `chat2.trollllm.xyz`
- Request SSL certificate via Certbot

**Phase 2: Configuration Changes** (after DNS propagation)
- Update `docker-compose.prod.yml` with dual services
- Configure Nginx with both server blocks
- Verify configuration files

**Phase 3: Deployment** (after testing)
- Deploy to VPS
- Test both endpoints
- Monitor for issues

## Related Changes

- This implements the vision outlined in `configure-dual-domain-deployment` change
- May require frontend updates to expose upstream selection to users
- Could benefit from monitoring dashboards to track each upstream's health

## User Impact

**Positive:**
- Users gain flexibility to choose upstream provider
- If one upstream has issues, users can switch to the other
- Different pricing models available (1.04-1.1x vs 1.06-1.08x multipliers)

**Considerations:**
- Users need to understand the difference between endpoints
- API keys work with both endpoints (no separate authentication needed)
- Credit balance is shared across both endpoints
