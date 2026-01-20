# TrollLLM - API Reference

## Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://api.trollllm.xyz` |
| Local GoProxy | `http://localhost:8080` |
| Local Backend | `http://localhost:3000` |

---

## Authentication

All API requests require authentication via Bearer token or x-api-key header.

```bash
# Bearer token (recommended)
curl -H "Authorization: Bearer sk-troll-xxx" ...

# x-api-key (Anthropic SDK compatible)
curl -H "x-api-key: sk-troll-xxx" ...
```

### Key Types

| Prefix | Type | Description |
|--------|------|-------------|
| `sk-troll-*` | User Key | Personal API key linked to user account |
| `fk-*` | Friend Key | Shared key with spending limits |

---

## GoProxy Endpoints

### POST /v1/chat/completions

OpenAI-compatible chat completions endpoint.

**Request:**
```json
{
  "model": "claude-sonnet-4-20250514",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true,
  "max_tokens": 4096
}
```

**Response (non-streaming):**
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "claude-sonnet-4-20250514",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  }
}
```

**Response (streaming):**
```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"}}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","choices":[{"delta":{"content":"!"}}]}

data: [DONE]
```

---

### POST /v1/messages

Anthropic-native messages endpoint.

**Request:**
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4096,
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true
}
```

**Response (non-streaming):**
```json
{
  "id": "msg_xxx",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Hello! How can I help you today?"
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 10,
    "output_tokens": 12,
    "cache_creation_input_tokens": 0,
    "cache_read_input_tokens": 0
  }
}
```

**Response (streaming):**
```
event: message_start
data: {"type":"message_start","message":{"id":"msg_xxx","type":"message","role":"assistant"}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":12}}

event: message_stop
data: {"type":"message_stop"}
```

---

### GET /v1/models

List available models.

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "claude-sonnet-4-20250514",
      "object": "model",
      "created": 1735689600,
      "owned_by": "trollLLM"
    },
    {
      "id": "claude-3-5-sonnet-20241022",
      "object": "model",
      "created": 1735776000,
      "owned_by": "trollLLM"
    }
  ]
}
```

---

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-17T10:00:00Z",
  "uptime": 3600.5
}
```

---

## Backend API Endpoints

### Authentication

#### POST /api/login
```json
// Request
{"username": "user", "password": "pass"}

// Response
{"token": "eyJhbGc...", "user": {...}}
```

#### POST /api/register
```json
// Request
{"username": "user", "password": "pass"}

// Response
{"message": "User registered successfully"}
```

---

### User Endpoints (requires JWT)

#### GET /api/user/me
Get current user profile.

#### GET /api/user/api-key
Get user's API key.

#### POST /api/user/api-key/rotate
Rotate API key.

#### GET /api/user/billing
Get billing information.

---

### Friend Key Endpoints (requires JWT)

#### GET /api/user/friend-key
List friend keys.

#### POST /api/user/friend-key
Create friend key.
```json
{"name": "My Friend Key"}
```

#### POST /api/user/friend-key/rotate
Rotate friend key.

#### DELETE /api/user/friend-key
Delete friend key.

#### PUT /api/user/friend-key/limits
Update model limits.
```json
{
  "limits": {
    "claude-sonnet-4-20250514": {
      "enabled": true,
      "dailyLimit": 10.0
    }
  }
}
```

---

## Error Responses

### OpenAI Format
```json
{
  "error": {
    "message": "Error description",
    "type": "error_type"
  }
}
```

### Anthropic Format
```json
{
  "type": "error",
  "error": {
    "type": "error_type",
    "message": "Error description"
  }
}
```

### Error Types

| Status | Type | Description |
|--------|------|-------------|
| 400 | `invalid_request_error` | Bad request |
| 401 | `authentication_error` | Invalid/missing API key |
| 402 | `insufficient_credits` | No credits remaining |
| 403 | `permission_error` | Access denied |
| 404 | `not_found_error` | Resource not found |
| 429 | `rate_limit_error` | Rate limit exceeded |
| 500 | `server_error` | Internal server error |
| 502 | `upstream_error` | Upstream service failed |

---

## Rate Limits

| Tier | RPM (Requests/Minute) |
|------|----------------------|
| Dev | 300 |
| Pro | 1000 |
| RefCredits | 1000 (Pro level) |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1702814400
Retry-After: 30 (on 429)
```

---

## Supported Models

| Model ID | Type | Upstream |
|----------|------|----------|
| `claude-sonnet-4-20250514` | anthropic | main |
| `claude-3-5-sonnet-20241022` | anthropic | openhands |
| `claude-3-5-haiku-20241022` | anthropic | openhands |
| `claude-opus-4-1-20250805` | anthropic | openhands |
| `gpt-4o` | openai | openhands |
| `gpt-4o-mini` | openai | openhands |

---

*Generated by BMad Method Document Project Workflow*
*Date: 2025-12-17*
