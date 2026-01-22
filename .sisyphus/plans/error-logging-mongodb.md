# Plan: Error Logging to MongoDB

## 📋 Overview

**Goal**: Lưu tất cả HTTP errors (4xx, 5xx) vào MongoDB để dev có thể debug và trace lỗi dễ dàng.

**Scope**:
- ✅ Backend (Node.js/Express)
- ✅ Go Proxy (goproxy)
- ✅ Lưu tất cả thông tin request/response khi error
- ✅ TTL 30 ngày (tự động xóa)

**Không bao gồm**:
- ❌ Admin UI để xem logs (chỉ query MongoDB trực tiếp)
- ❌ Real-time alerting

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   External      │
│   (Next.js)     │     │   API Clients   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│           Backend (Express)              │
│  ┌─────────────────────────────────┐    │
│  │   Error Logging Middleware      │    │
│  │   - Intercepts all responses    │    │
│  │   - Logs 4xx/5xx to MongoDB     │    │
│  └─────────────────────────────────┘    │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│           Go Proxy (goproxy)             │
│  ┌─────────────────────────────────┐    │
│  │   errorlog package              │    │
│  │   - LogError() function         │    │
│  │   - Called at each http.Error   │    │
│  └─────────────────────────────────┘    │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│              MongoDB                     │
│  Collection: error_logs                  │
│  TTL Index: 30 days on createdAt         │
└─────────────────────────────────────────┘
```

---

## 📊 Data Model

### Collection: `error_logs`

```typescript
interface IErrorLog {
  _id: ObjectId;
  
  // Request Info
  source: 'backend' | 'goproxy';     // Nguồn phát sinh lỗi
  method: string;                     // GET, POST, etc.
  path: string;                       // /api/user/me, /v1/chat/completions
  endpoint: string;                   // Full URL or route pattern
  
  // User/Auth Info
  userId?: string;                    // Username nếu authenticated
  userKeyId?: string;                 // API key ID (masked)
  clientIp: string;                   // IP address
  userAgent?: string;                 // User-Agent header
  
  // Error Details
  statusCode: number;                 // 400, 401, 500, etc.
  errorType: string;                  // 'validation_error', 'auth_error', etc.
  errorMessage: string;               // Error message returned to client
  errorDetails?: any;                 // Additional error details (validation errors, etc.)
  
  // Request Context (sanitized - no sensitive data)
  requestHeaders?: Record<string, string>;  // Selected headers (no auth)
  requestBody?: any;                  // Sanitized request body (no passwords/tokens)
  
  // Response Info
  responseBody?: any;                 // Error response sent to client
  
  // Timing
  latencyMs?: number;                 // Request duration
  createdAt: Date;                    // Timestamp (TTL index)
  
  // Stack trace (only for 5xx)
  stackTrace?: string;                // Stack trace for server errors
}
```

### Indexes

```javascript
// TTL Index - auto-delete after 30 days
db.error_logs.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 2592000 })

// Query indexes
db.error_logs.createIndex({ "source": 1, "createdAt": -1 })
db.error_logs.createIndex({ "statusCode": 1, "createdAt": -1 })
db.error_logs.createIndex({ "userId": 1, "createdAt": -1 })
db.error_logs.createIndex({ "path": 1, "createdAt": -1 })
db.error_logs.createIndex({ "errorType": 1, "createdAt": -1 })
```

---

## 📝 Implementation Tasks

### Phase 1: Backend (Node.js/Express)

#### Task 1.1: Create ErrorLog Model
**File**: `backend/src/models/error-log.model.ts`

```typescript
import mongoose from 'mongoose';

export interface IErrorLog {
  source: 'backend' | 'goproxy';
  method: string;
  path: string;
  endpoint: string;
  userId?: string;
  userKeyId?: string;
  clientIp: string;
  userAgent?: string;
  statusCode: number;
  errorType: string;
  errorMessage: string;
  errorDetails?: any;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  latencyMs?: number;
  stackTrace?: string;
  createdAt: Date;
}

const errorLogSchema = new mongoose.Schema({
  source: { type: String, required: true, enum: ['backend', 'goproxy'] },
  method: { type: String, required: true },
  path: { type: String, required: true },
  endpoint: { type: String },
  userId: { type: String, index: true },
  userKeyId: { type: String },
  clientIp: { type: String, required: true },
  userAgent: { type: String },
  statusCode: { type: Number, required: true, index: true },
  errorType: { type: String, required: true, index: true },
  errorMessage: { type: String, required: true },
  errorDetails: { type: mongoose.Schema.Types.Mixed },
  requestHeaders: { type: mongoose.Schema.Types.Mixed },
  requestBody: { type: mongoose.Schema.Types.Mixed },
  responseBody: { type: mongoose.Schema.Types.Mixed },
  latencyMs: { type: Number },
  stackTrace: { type: String },
  createdAt: { type: Date, default: Date.now, expires: 2592000 }, // 30 days TTL
});

// Compound indexes for common queries
errorLogSchema.index({ source: 1, createdAt: -1 });
errorLogSchema.index({ path: 1, createdAt: -1 });

export const ErrorLog = mongoose.model<IErrorLog>('ErrorLog', errorLogSchema, 'error_logs');
```

#### Task 1.2: Create Error Logging Middleware
**File**: `backend/src/middleware/error-logger.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { ErrorLog } from '../models/error-log.model.js';

// Sanitize sensitive data from request body
function sanitizeBody(body: any): any {
  if (!body) return undefined;
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  for (const field of sensitiveFields) {
    if (sanitized[field]) sanitized[field] = '[REDACTED]';
  }
  return sanitized;
}

// Get safe headers (exclude auth)
function getSafeHeaders(headers: any): Record<string, string> {
  const safe: Record<string, string> = {};
  const allowedHeaders = ['content-type', 'accept', 'origin', 'referer', 'x-request-id'];
  for (const h of allowedHeaders) {
    if (headers[h]) safe[h] = headers[h];
  }
  return safe;
}

// Classify error type from status code and message
function classifyError(statusCode: number, message: string): string {
  if (statusCode === 400) return 'validation_error';
  if (statusCode === 401) return 'authentication_error';
  if (statusCode === 403) return 'authorization_error';
  if (statusCode === 404) return 'not_found';
  if (statusCode === 409) return 'conflict_error';
  if (statusCode === 429) return 'rate_limit_error';
  if (statusCode >= 500) return 'server_error';
  return 'unknown_error';
}

export function errorLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override json method to intercept error responses
  res.json = function(body: any) {
    const statusCode = res.statusCode;
    
    // Only log 4xx and 5xx errors
    if (statusCode >= 400) {
      const latencyMs = Date.now() - startTime;
      
      // Log async - don't block response
      setImmediate(async () => {
        try {
          await ErrorLog.create({
            source: 'backend',
            method: req.method,
            path: req.path,
            endpoint: req.originalUrl,
            userId: (req as any).user?.username,
            clientIp: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.headers['user-agent'],
            statusCode,
            errorType: classifyError(statusCode, body?.error || ''),
            errorMessage: body?.error || body?.message || 'Unknown error',
            errorDetails: body?.details,
            requestHeaders: getSafeHeaders(req.headers),
            requestBody: sanitizeBody(req.body),
            responseBody: body,
            latencyMs,
            stackTrace: statusCode >= 500 ? new Error().stack : undefined,
          });
        } catch (err) {
          console.error('[ErrorLogger] Failed to log error:', err);
        }
      });
    }
    
    return originalJson(body);
  };
  
  next();
}
```

#### Task 1.3: Register Middleware in Express App
**File**: `backend/src/index.ts`

```typescript
// Add import
import { errorLoggerMiddleware } from './middleware/error-logger.middleware.js';

// Add BEFORE routes (after body parser)
app.use(express.json());
app.use(errorLoggerMiddleware);  // <-- Add this line

// ... rest of routes
```

#### Task 1.4: Export from models/index.ts
**File**: `backend/src/models/index.ts`

```typescript
// Add export
export * from './error-log.model.js';
```

---

### Phase 2: Go Proxy (goproxy)

#### Task 2.1: Create ErrorLog Package
**File**: `goproxy/internal/errorlog/errorlog.go`

```go
package errorlog

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"goproxy/db"
)

type ErrorLog struct {
	Source         string                 `bson:"source"`
	Method         string                 `bson:"method"`
	Path           string                 `bson:"path"`
	Endpoint       string                 `bson:"endpoint"`
	UserID         string                 `bson:"userId,omitempty"`
	UserKeyID      string                 `bson:"userKeyId,omitempty"`
	ClientIP       string                 `bson:"clientIp"`
	UserAgent      string                 `bson:"userAgent,omitempty"`
	StatusCode     int                    `bson:"statusCode"`
	ErrorType      string                 `bson:"errorType"`
	ErrorMessage   string                 `bson:"errorMessage"`
	ErrorDetails   interface{}            `bson:"errorDetails,omitempty"`
	RequestHeaders map[string]string      `bson:"requestHeaders,omitempty"`
	RequestBody    interface{}            `bson:"requestBody,omitempty"`
	ResponseBody   interface{}            `bson:"responseBody,omitempty"`
	LatencyMs      int64                  `bson:"latencyMs,omitempty"`
	StackTrace     string                 `bson:"stackTrace,omitempty"`
	CreatedAt      time.Time              `bson:"createdAt"`
}

var collection *mongo.Collection

func init() {
	// Will be initialized when first used
}

func getCollection() *mongo.Collection {
	if collection == nil {
		collection = db.GetCollection("error_logs")
		
		// Ensure indexes exist (idempotent)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		
		indexes := []mongo.IndexModel{
			{
				Keys:    bson.D{{Key: "createdAt", Value: 1}},
				Options: options.Index().SetExpireAfterSeconds(2592000), // 30 days
			},
			{Keys: bson.D{{Key: "source", Value: 1}, {Key: "createdAt", Value: -1}}},
			{Keys: bson.D{{Key: "statusCode", Value: 1}, {Key: "createdAt", Value: -1}}},
			{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "createdAt", Value: -1}}},
			{Keys: bson.D{{Key: "path", Value: 1}, {Key: "createdAt", Value: -1}}},
		}
		
		_, err := collection.Indexes().CreateMany(ctx, indexes)
		if err != nil {
			log.Printf("⚠️ [ErrorLog] Failed to create indexes: %v", err)
		}
	}
	return collection
}

// ClassifyError determines error type from status code
func ClassifyError(statusCode int) string {
	switch {
	case statusCode == 400:
		return "validation_error"
	case statusCode == 401:
		return "authentication_error"
	case statusCode == 402:
		return "payment_required"
	case statusCode == 403:
		return "authorization_error"
	case statusCode == 404:
		return "not_found"
	case statusCode == 429:
		return "rate_limit_error"
	case statusCode == 502:
		return "upstream_error"
	case statusCode == 503:
		return "service_unavailable"
	case statusCode >= 500:
		return "server_error"
	default:
		return "client_error"
	}
}

// GetClientIP extracts client IP from request
func GetClientIP(r *http.Request) string {
	// Check X-Forwarded-For header first (for proxied requests)
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}
	
	// Check X-Real-IP
	xri := r.Header.Get("X-Real-IP")
	if xri != "" {
		return xri
	}
	
	// Fall back to RemoteAddr
	return r.RemoteAddr
}

// GetSafeHeaders returns non-sensitive headers
func GetSafeHeaders(h http.Header) map[string]string {
	safe := make(map[string]string)
	allowedHeaders := []string{"Content-Type", "Accept", "Origin", "Referer", "X-Request-Id"}
	
	for _, header := range allowedHeaders {
		if v := h.Get(header); v != "" {
			safe[header] = v
		}
	}
	return safe
}

// MaskAPIKey masks an API key for logging
func MaskAPIKey(key string) string {
	if len(key) < 10 {
		return "***"
	}
	return key[:7] + "***" + key[len(key)-3:]
}

// LogErrorParams contains parameters for error logging
type LogErrorParams struct {
	Request      *http.Request
	StatusCode   int
	ErrorMessage string
	ErrorDetails interface{}
	RequestBody  interface{}
	UserID       string
	UserKeyID    string
	LatencyMs    int64
}

// LogError logs an error to MongoDB asynchronously
func LogError(params LogErrorParams) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		
		errorLog := ErrorLog{
			Source:         "goproxy",
			Method:         params.Request.Method,
			Path:           params.Request.URL.Path,
			Endpoint:       params.Request.URL.String(),
			UserID:         params.UserID,
			UserKeyID:      MaskAPIKey(params.UserKeyID),
			ClientIP:       GetClientIP(params.Request),
			UserAgent:      params.Request.UserAgent(),
			StatusCode:     params.StatusCode,
			ErrorType:      ClassifyError(params.StatusCode),
			ErrorMessage:   params.ErrorMessage,
			ErrorDetails:   params.ErrorDetails,
			RequestHeaders: GetSafeHeaders(params.Request.Header),
			RequestBody:    params.RequestBody,
			LatencyMs:      params.LatencyMs,
			CreatedAt:      time.Now(),
		}
		
		_, err := getCollection().InsertOne(ctx, errorLog)
		if err != nil {
			log.Printf("⚠️ [ErrorLog] Failed to log error: %v", err)
		}
	}()
}

// Helper function to log with just request and status
func LogErrorSimple(r *http.Request, statusCode int, errorMessage string) {
	LogError(LogErrorParams{
		Request:      r,
		StatusCode:   statusCode,
		ErrorMessage: errorMessage,
	})
}
```

#### Task 2.2: Create Helper Function for http.Error Replacement
**File**: `goproxy/internal/errorlog/helper.go`

```go
package errorlog

import (
	"encoding/json"
	"net/http"
	"time"
)

// HTTPError writes an error response and logs it to MongoDB
// This is a drop-in replacement for http.Error with logging
func HTTPError(w http.ResponseWriter, r *http.Request, body string, statusCode int, params ...LogErrorParams) {
	// Write the error response
	http.Error(w, body, statusCode)
	
	// Extract error message from body (try to parse JSON)
	errorMsg := body
	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(body), &parsed); err == nil {
		if errObj, ok := parsed["error"].(map[string]interface{}); ok {
			if msg, ok := errObj["message"].(string); ok {
				errorMsg = msg
			}
		} else if errStr, ok := parsed["error"].(string); ok {
			errorMsg = errStr
		}
	}
	
	// Use provided params or create default
	logParams := LogErrorParams{
		Request:      r,
		StatusCode:   statusCode,
		ErrorMessage: errorMsg,
	}
	
	if len(params) > 0 {
		logParams = params[0]
		logParams.Request = r
		logParams.StatusCode = statusCode
		if logParams.ErrorMessage == "" {
			logParams.ErrorMessage = errorMsg
		}
	}
	
	LogError(logParams)
}

// HTTPErrorWithContext is like HTTPError but with additional context
func HTTPErrorWithContext(w http.ResponseWriter, r *http.Request, body string, statusCode int, 
	userID, userKeyID string, requestBody interface{}, startTime time.Time) {
	
	HTTPError(w, r, body, statusCode, LogErrorParams{
		Request:      r,
		StatusCode:   statusCode,
		UserID:       userID,
		UserKeyID:    userKeyID,
		RequestBody:  requestBody,
		LatencyMs:    time.Since(startTime).Milliseconds(),
	})
}
```

#### Task 2.3: Update main.go to Use Error Logging

Replace `http.Error` calls with `errorlog.HTTPError` in critical paths.

**Example changes in `goproxy/main.go`**:

```go
// Import
import "goproxy/internal/errorlog"

// Before:
http.Error(w, `{"error": {"message": "Invalid API key", "type": "authentication_error"}}`, http.StatusUnauthorized)

// After:
errorlog.HTTPError(w, r, `{"error": {"message": "Invalid API key", "type": "authentication_error"}}`, http.StatusUnauthorized)

// Or with context:
errorlog.HTTPErrorWithContext(w, r, 
    `{"error": {"message": "Invalid API key", "type": "authentication_error"}}`, 
    http.StatusUnauthorized,
    userID, userKeyID, nil, startTime)
```

**Priority locations to update** (highest traffic/importance):
1. Authentication errors (lines ~584-664)
2. Rate limit errors (line ~466)
3. Upstream errors (lines ~987, 1041, 1138, etc.)
4. Validation errors (lines ~719, 748)
5. Payment required errors (lines ~629, 652, 657, etc.)

---

## 📋 Task Checklist

### Backend (Node.js)
- [ ] 1.1 Create `error-log.model.ts`
- [ ] 1.2 Create `error-logger.middleware.ts`
- [ ] 1.3 Register middleware in `index.ts`
- [ ] 1.4 Export from `models/index.ts`
- [ ] Test: Trigger 400/500 error and verify log in MongoDB

### Go Proxy
- [ ] 2.1 Create `internal/errorlog/errorlog.go`
- [ ] 2.2 Create `internal/errorlog/helper.go`
- [ ] 2.3 Update `main.go` - Authentication errors (~15 locations)
- [ ] 2.4 Update `main.go` - Validation errors (~10 locations)
- [ ] 2.5 Update `main.go` - Upstream errors (~20 locations)
- [ ] 2.6 Update `main.go` - Rate limit errors (~5 locations)
- [ ] Test: Trigger various errors and verify logs in MongoDB

### Verification
- [ ] Verify TTL index works (check MongoDB)
- [ ] Verify no sensitive data in logs (passwords, tokens)
- [ ] Verify async logging doesn't block responses
- [ ] Load test to ensure no performance impact

---

## 🔍 Querying Error Logs (For Developers)

### MongoDB Compass / mongosh queries:

```javascript
// Find all errors in last 24 hours
db.error_logs.find({
  createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
}).sort({ createdAt: -1 })

// Find 500 errors
db.error_logs.find({
  statusCode: { $gte: 500 }
}).sort({ createdAt: -1 })

// Find errors for specific user
db.error_logs.find({
  userId: "username123"
}).sort({ createdAt: -1 })

// Find authentication errors
db.error_logs.find({
  errorType: "authentication_error"
}).sort({ createdAt: -1 })

// Find errors by path pattern
db.error_logs.find({
  path: { $regex: "/v1/chat" }
}).sort({ createdAt: -1 })

// Aggregate errors by type (last 7 days)
db.error_logs.aggregate([
  { $match: { createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } } },
  { $group: { _id: "$errorType", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

// Find slowest errors
db.error_logs.find({
  latencyMs: { $gte: 5000 }
}).sort({ latencyMs: -1 })
```

---

## ⚠️ Important Notes

1. **No Sensitive Data**: 
   - Passwords, tokens, API keys are NEVER logged
   - Request body is sanitized before logging
   - API keys are masked (show only first 7 and last 3 chars)

2. **Performance**:
   - All logging is async (non-blocking)
   - Uses `setImmediate` in Node.js and goroutines in Go
   - Batched writes can be implemented later if needed

3. **Storage**:
   - TTL index auto-deletes logs after 30 days
   - Estimated storage: ~1KB per error log
   - Monitor collection size in production

4. **Security**:
   - Only devs with MongoDB access can view logs
   - No public API to read error logs
   - IP addresses are logged for security analysis

---

## 📅 Timeline Estimate

| Phase | Task | Estimate |
|-------|------|----------|
| 1 | Backend implementation | 1-2 hours |
| 2 | Go Proxy implementation | 2-3 hours |
| 3 | Testing and verification | 1 hour |
| **Total** | | **4-6 hours** |

---

## 🚀 Ready to Execute

Run `/start-work` to begin implementation.
