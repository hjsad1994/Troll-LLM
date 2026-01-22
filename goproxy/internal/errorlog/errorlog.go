package errorlog

import (
	"context"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"goproxy/db"
)

// ErrorLog represents an error log entry in MongoDB
type ErrorLog struct {
	Source         string            `bson:"source"`
	Method         string            `bson:"method"`
	Path           string            `bson:"path"`
	Endpoint       string            `bson:"endpoint"`
	UserID         string            `bson:"userId,omitempty"`
	UserKeyID      string            `bson:"userKeyId,omitempty"`
	ClientIP       string            `bson:"clientIp"`
	UserAgent      string            `bson:"userAgent,omitempty"`
	StatusCode     int               `bson:"statusCode"`
	ErrorType      string            `bson:"errorType"`
	ErrorMessage   string            `bson:"errorMessage"`
	ErrorDetails   interface{}       `bson:"errorDetails,omitempty"`
	RequestHeaders map[string]string `bson:"requestHeaders,omitempty"`
	RequestBody    interface{}       `bson:"requestBody,omitempty"`
	ResponseBody   interface{}       `bson:"responseBody,omitempty"`
	LatencyMs      int64             `bson:"latencyMs,omitempty"`
	StackTrace     string            `bson:"stackTrace,omitempty"`
	CreatedAt      time.Time         `bson:"createdAt"`
}

var (
	collection     *mongo.Collection
	collectionOnce sync.Once
)

// getCollection returns the error_logs collection with lazy initialization
func getCollection() *mongo.Collection {
	collectionOnce.Do(func() {
		collection = db.GetCollection("error_logs")

		// Create indexes (idempotent)
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		indexes := []mongo.IndexModel{
			{
				Keys:    bson.D{{Key: "createdAt", Value: 1}},
				Options: options.Index().SetExpireAfterSeconds(2592000), // 30 days TTL
			},
			{
				Keys: bson.D{{Key: "source", Value: 1}, {Key: "createdAt", Value: -1}},
			},
			{
				Keys: bson.D{{Key: "path", Value: 1}, {Key: "createdAt", Value: -1}},
			},
			{
				Keys: bson.D{{Key: "statusCode", Value: 1}, {Key: "createdAt", Value: -1}},
			},
		}

		_, err := collection.Indexes().CreateMany(ctx, indexes)
		if err != nil {
			log.Printf("⚠️ [ErrorLog] Failed to create indexes: %v", err)
		} else {
			log.Printf("✅ [ErrorLog] Indexes created/verified for error_logs collection")
		}
	})
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
	case statusCode == 405:
		return "method_not_allowed"
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
	allowedHeaders := []string{
		"Content-Type",
		"Accept",
		"Origin",
		"Referer",
		"X-Request-Id",
		"User-Agent",
	}

	for _, header := range allowedHeaders {
		if v := h.Get(header); v != "" {
			safe[header] = v
		}
	}
	return safe
}

// MaskAPIKey masks an API key for logging (sk-troll-xxx...yyy format)
func MaskAPIKey(key string) string {
	if key == "" {
		return ""
	}
	if len(key) < 12 {
		return "***"
	}
	return key[:8] + "***" + key[len(key)-4:]
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

		// Sanitize request body before logging
		sanitizedRequestBody := SanitizeBody(params.RequestBody)

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
			RequestBody:    sanitizedRequestBody,
			LatencyMs:      params.LatencyMs,
			CreatedAt:      time.Now(),
		}

		_, err := getCollection().InsertOne(ctx, errorLog)
		if err != nil {
			log.Printf("⚠️ [ErrorLog] Failed to log error: %v", err)
		}
	}()
}

// LogErrorSimple logs an error with minimal parameters
func LogErrorSimple(r *http.Request, statusCode int, errorMessage string) {
	LogError(LogErrorParams{
		Request:      r,
		StatusCode:   statusCode,
		ErrorMessage: errorMessage,
	})
}
