# Proposal: Change GoProxy Port Configuration

**Change ID:** `configure-dual-domain-deployment`
**Status:** Draft
**Created:** 2026-01-11

## Overview

Đổi port của GoProxy service từ 8005 sang 8004 trong docker-compose và nginx configuration.

## Context

Hiện tại GoProxy service phục vụ domain `chat.trollllm.xyz` đang chạy trên port 8005. Cần đổi sang port 8004 để phù hợp với yêu cầu deployment mới.

## Motivation

- **Port standardization**: Chuẩn hóa port mapping cho deployment
- **Configuration alignment**: Đồng bộ với requirement mới của hệ thống

## Goals

1. Change GoProxy internal port from 8005 to 8004
2. Update nginx upstream configuration to route to port 8004
3. Ensure no service disruption during the change

## Non-Goals

- Thay đổi logic bên trong GoProxy application
- Thêm services mới
- Thay đổi frontend hoặc backend services

## Success Criteria

- [ ] `https://chat.trollllm.xyz` routes to goproxy service on port 8004
- [ ] LLM API requests work correctly after the change
- [ ] No downtime during deployment
- [ ] All health checks pass

## Dependencies

None - this is a simple port reconfiguration

## Affected Components

- `nginx/nginx.conf` - Update goproxy upstream port from 8005 to 8004
- GoProxy application - May need environment variable or config to set port

## Related Specs

- `deployment-configuration` (modified spec)

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| GoProxy không hỗ trợ custom port | Kiểm tra source code hoặc config options trước khi deploy |
| Port 8004 đã được sử dụng | Verify port availability bằng netstat trước khi deploy |
| Downtime khi restart services | Deploy ngoài giờ cao điểm, có rollback plan sẵn sàng |
