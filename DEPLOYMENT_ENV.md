# Environment Variables for Dual-Upstream Deployment

This document describes the environment variables required for the dual-upstream deployment configuration.

## Required Environment Variables

### OpenHands Upstream
The following environment variables are required for the OpenHands upstream service to function:

- **OpenHands API keys**: Configure in `.env` file (exact variable names depend on your backend implementation)
- **GOPROXY_OPENHANDS_CONFIG_PATH**: Set in docker-compose.prod.yml backend service
  - Value: `/app/goproxy/config-openhands-prod.json`
  - Used by backend to read pricing configuration

### OhMyGPT Upstream
The following environment variables are required for the OhMyGPT upstream service:

- **OhMyGPT API keys**: Configure in `.env` file (exact variable names depend on your backend implementation)
- **GOPROXY_OHMYGPT_CONFIG_PATH**: Set in docker-compose.prod.yml backend service
  - Value: `/app/goproxy/config-ohmygpt-prod.json`
  - Used by backend to read pricing configuration

## Configuration File Mapping

### Backend Service
The backend service needs access to both configuration files:

```yaml
environment:
  - BACKEND_PORT=3005
  - GOPROXY_OPENHANDS_CONFIG_PATH=/app/goproxy/config-openhands-prod.json
  - GOPROXY_OHMYGPT_CONFIG_PATH=/app/goproxy/config-ohmygpt-prod.json

volumes:
  - ./goproxy/config-openhands-prod.json:/app/goproxy/config-openhands-prod.json:ro
  - ./goproxy/config-ohmygpt-prod.json:/app/goproxy/config-ohmygpt-prod.json:ro
```

### GoProxy Services
Each GoProxy service mounts its specific configuration:

**goproxy-openhands**:
```yaml
volumes:
  - ./goproxy/config-openhands-prod.json:/app/config.json:ro
env_file:
  - ./.env
```

**goproxy-ohmygpt**:
```yaml
volumes:
  - ./goproxy/config-ohmygpt-prod.json:/app/config.json:ro
env_file:
  - ./.env
```

## Shared Environment Variables

The following variables from `.env` are shared by all services:

- **MongoDB connection strings**: Used by backend and both GoProxy services
- **JWT secrets**: Used by backend for authentication
- **Discord webhook URLs**: Used for system alerts
- **Other API keys**: Depends on your specific implementation

## Verification Checklist

Before deploying, verify that:

- [ ] `.env` file exists and contains all required API keys
- [ ] OpenHands API keys are configured (if backend uses them)
- [ ] OhMyGPT API keys are configured (if backend uses them)
- [ ] MongoDB connection string is correct
- [ ] `GOPROXY_OPENHANDS_CONFIG_PATH` is set in backend environment
- [ ] `GOPROXY_OHMYGPT_CONFIG_PATH` is set in backend environment
- [ ] Both config files exist: `config-openhands-prod.json` and `config-ohmygpt-prod.json`

## Deployment Notes

1. The `.env` file is mounted to both GoProxy services via `env_file` directive
2. Backend service has its own `.env` file at `./backend/.env`
3. Configuration paths must match the volume mount locations
4. All config files are mounted read-only (`:ro`) for security

## Troubleshooting

If services fail to start, check:

1. **Missing .env file**: Ensure `.env` exists in project root
2. **Invalid config paths**: Verify environment variables match volume mounts
3. **Missing API keys**: Check logs for authentication errors
4. **File permissions**: Ensure Docker can read configuration files
