package main

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"strconv"

	"goproxy/config"
	"goproxy/db"
	"goproxy/internal/cache"
	"goproxy/internal/keypool"
	"goproxy/internal/maintarget"
	"goproxy/internal/ohmygpt"
	"goproxy/internal/openhands"
	"goproxy/internal/openhandspool"
	"goproxy/internal/proxy"
	"goproxy/internal/ratelimit"
	"goproxy/internal/usage"
	"goproxy/internal/userkey"
	"goproxy/transformers"

	"github.com/andybalholm/brotli"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/net/http2"
)

var (
	startTime     = time.Now()
	httpClient    *http.Client
	debugMode     = false // Debug mode, disabled by default
	proxyPool     *proxy.ProxyPool
	trollKeyPool  *keypool.KeyPool
	healthChecker *proxy.HealthChecker
	rateLimiter   *ratelimit.RateLimiter
	// Pre-compiled regex for sanitizeBlockedContent (performance optimization)
	blockedPatternRegexes []*regexp.Regexp

	// NEW MODEL-BASED ROUTING - BEGIN
	// Main Target Server configuration (for Sonnet 4.5 and Haiku 4.5)
	mainTargetServer string
	mainUpstreamKey  string
	// NEW MODEL-BASED ROUTING - END
)

func init() {
	// Pre-compile blocked patterns once at startup
	blockedPatterns := []string{
		`(?i)You are Claude Code`,
		`(?i)You are Claude`,
		`(?i)You'?re Claude`,
		`(?i)Claude Code`,
		`(?i)I am Claude Code`,
		`(?i)I'?m Claude Code`,
		`(?i)As Claude Code`,
		`(?i)Claude, an AI assistant`,
		`(?i)Claude, made by Anthropic`,
		`(?i)Claude, created by Anthropic`,
		`(?i)an AI assistant named Claude`,
		`(?i)an AI called Claude`,
		`(?i)assistant Claude`,
		`(?i)Kilo Code`,
		`(?i)Cline`,
		`(?i)Roo Code`,
		`(?i)Cursor`,
	}
	for _, pattern := range blockedPatterns {
		blockedPatternRegexes = append(blockedPatternRegexes, regexp.MustCompile(pattern))
	}
}

// Retry configuration
const (
	maxRetries     = 2
	retryBaseDelay = 1 * time.Second
)

// isRetryableError checks if an error should trigger a retry
// Note: EOF is NOT retryable because it's caused by proxy timeout (15s) - retrying won't help
func isRetryableError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	// Retry on connection errors (but NOT EOF - proxy timeout)
	return strings.Contains(errStr, "connection reset") ||
		strings.Contains(errStr, "connection refused") ||
		strings.Contains(errStr, "no such host") ||
		strings.Contains(errStr, "TLS handshake") ||
		strings.Contains(errStr, "broken pipe")
}

// doRequestWithRetry executes HTTP request with retry on transient errors (same client)
func doRequestWithRetry(client *http.Client, req *http.Request, bodyBytes []byte) (*http.Response, error) {
	var lastErr error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			delay := retryBaseDelay * time.Duration(1<<(attempt-1))
			time.Sleep(delay)
			req.Body = io.NopCloser(bytes.NewReader(bodyBytes))
		}

		resp, err := client.Do(req)
		if err == nil {
			return resp, nil
		}

		lastErr = err
		if !isRetryableError(err) {
			return nil, err
		}
	}
	return nil, lastErr
}

// Initialize HTTP client with HTTP/2 support and browser-like characteristics
func initHTTPClient() {
	// Configure TLS to mimic modern browsers
	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
		MaxVersion: tls.VersionTLS13,
		// Use common browser Cipher Suites
		CipherSuites: []uint16{
			tls.TLS_AES_128_GCM_SHA256,
			tls.TLS_AES_256_GCM_SHA384,
			tls.TLS_CHACHA20_POLY1305_SHA256,
			tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
			tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
			tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
		},
		InsecureSkipVerify: false,
	}

	// Create HTTP/2 capable Transport with improved settings
	transport := &http.Transport{
		TLSClientConfig:       tlsConfig,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          100,
		MaxIdleConnsPerHost:   10,
		MaxConnsPerHost:       20,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   15 * time.Second,
		ExpectContinueTimeout: 2 * time.Second,
		ResponseHeaderTimeout: 360 * time.Second,
		DisableKeepAlives:     false,
	}

	// Configure HTTP/2
	if err := http2.ConfigureTransport(transport); err != nil {
		log.Printf("⚠️ HTTP/2 configuration failed, will use HTTP/1.1: %v", err)
	}

	httpClient = &http.Client{
		Transport: transport,
		Timeout:   0, // No timeout for streaming responses
	}

	log.Printf("✅ HTTP client initialized successfully (HTTP/2 enabled)")
}

// Get environment variable with default value support
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func parseInt(s string) int {
	i, err := strconv.Atoi(s)
	if err != nil {
		return 0
	}
	return i
}

// NEW MODEL-BASED ROUTING - BEGIN
// UpstreamConfig holds the configuration for routing to upstream provider
type UpstreamConfig struct {
	EndpointURL string
	APIKey      string
	UseProxy    bool   // true = use proxy pool, false = direct connection
	KeyID       string // for logging purposes
}

// selectUpstreamConfig returns the upstream configuration based on model
// Returns endpoint URL, API key, whether to use proxy, and key ID for logging
func selectUpstreamConfig(modelID string, clientAPIKey string) (*UpstreamConfig, *proxy.Proxy, error) {
	upstream := config.GetModelUpstream(modelID)

	if upstream == "main" {
		// Use Main Target Server (for Sonnet 4.5 and Haiku 4.5)
		if mainTargetServer == "" || mainUpstreamKey == "" {
			return nil, nil, fmt.Errorf("main target server not configured")
		}
		log.Printf("🔀 [Model Routing] %s -> Main Target Server", modelID)
		return &UpstreamConfig{
			EndpointURL: mainTargetServer + "/v1/messages",
			APIKey:      mainUpstreamKey,
			UseProxy:    false,
			KeyID:       "main",
		}, nil, nil
	}

	// TEMPORARILY DISABLED: Factory AI Key logic
	// All "troll" and "openhands" upstream now route to OpenHands with key rotation
	if upstream == "openhands" || upstream == "troll" {
		// Use OpenHands via TrollProxy with key rotation
		omgProvider := openhands.GetOpenHands()
		if omgProvider == nil || !omgProvider.IsConfigured() {
			return nil, nil, fmt.Errorf("openhands not configured")
		}
		log.Printf("🔀 [Model Routing] %s -> OpenHands (upstream=%s)", modelID, upstream)
		return &UpstreamConfig{
			EndpointURL: openhands.OpenHandsEndpoint,
			APIKey:      "", // handled by OpenHands provider with key rotation
			UseProxy:    false,
			KeyID:       "openhands",
		}, nil, nil
	}

	// OhMyGPT routing
	if upstream == "ohmygpt" {
		// Use OhMyGPT via TrollProxy with key rotation
		ohmygptProvider := ohmygpt.GetOhMyGPT()
		if ohmygptProvider == nil || !ohmygptProvider.IsConfigured() {
			return nil, nil, fmt.Errorf("ohmygpt not configured")
		}
		log.Printf("🔀 [Model Routing] %s -> OhMyGPT (upstream=%s)", modelID, upstream)
		return &UpstreamConfig{
			EndpointURL: ohmygpt.OhMyGPTEndpoint,
			APIKey:      "", // handled by OhMyGPT provider with key rotation
			UseProxy:    false,
			KeyID:       "ohmygpt",
		}, nil, nil
	}

	// OpenHands LLM Proxy routing
	if upstream == "openhands" {
		openhandsPool := openhandspool.GetPool()
		if openhandsPool == nil || openhandsPool.GetKeyCount() == 0 {
			return nil, nil, fmt.Errorf("openhands not configured")
		}
		log.Printf("🔀 [Model Routing] %s -> OpenHands LLM Proxy", modelID)
		return &UpstreamConfig{
			EndpointURL: "https://llm-proxy.app.all-hands.dev",
			APIKey:      "", // handled by OpenHands provider with key rotation
			UseProxy:    false,
			KeyID:       "openhands",
		}, nil, nil
	}

	// Fallback: also use OpenHands
	omgProvider := openhands.GetOpenHands()
	if omgProvider != nil && omgProvider.IsConfigured() {
		log.Printf("🔀 [Model Routing] %s -> OpenHands (fallback)", modelID)
		return &UpstreamConfig{
			EndpointURL: openhands.OpenHandsEndpoint,
			APIKey:      "",
			UseProxy:    false,
			KeyID:       "openhands",
		}, nil, nil
	}

	return nil, nil, fmt.Errorf("no upstream configured for model %s", modelID)

	/* DISABLED: Factory AI Key with proxy pool
	// Default: Use Troll Key (Factory AI) with proxy pool
	var selectedProxy *proxy.Proxy
	var trollAPIKey string
	var trollKeyID string

	if proxyPool != nil && proxyPool.HasProxies() {
		var err error
		selectedProxy, trollKeyID, err = proxyPool.SelectProxyWithKeyByClient(clientAPIKey)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to select proxy: %v", err)
		}
		trollAPIKey = trollKeyPool.GetAPIKey(trollKeyID)
		if trollAPIKey == "" {
			return nil, nil, fmt.Errorf("troll key %s not found in pool", trollKeyID)
		}
		log.Printf("🔀 [Model Routing] %s -> Troll Key (proxy: %s, key: %s)", modelID, selectedProxy.Name, trollKeyID)
	} else {
		trollAPIKey = getEnv("TROLL_API_KEY", "")
		trollKeyID = "env"
		if trollAPIKey == "" {
			return nil, nil, fmt.Errorf("no proxies configured and TROLL_API_KEY not set")
		}
		log.Printf("🔀 [Model Routing] %s -> Troll Key (direct, env key)", modelID)
	}

	endpoint := config.GetEndpointByType("anthropic")
	if endpoint == nil {
		return nil, nil, fmt.Errorf("anthropic endpoint not configured")
	}

	return &UpstreamConfig{
		EndpointURL: endpoint.BaseURL,
		APIKey:      trollAPIKey,
		UseProxy:    true,
		KeyID:       trollKeyID,
	}, selectedProxy, nil
	*/
}

// NEW MODEL-BASED ROUTING - END

// Read response body and automatically handle compression
func readResponseBody(resp *http.Response) ([]byte, error) {
	var reader io.Reader = resp.Body
	contentEncoding := resp.Header.Get("Content-Encoding")

	// Select decompression method based on Content-Encoding header
	switch contentEncoding {
	case "gzip":
		if debugMode {
			log.Printf("📦 Detected gzip compression (Content-Encoding), decompressing...")
		}
		gzipReader, err := gzip.NewReader(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to create gzip reader: %v", err)
		}
		defer gzipReader.Close()
		reader = gzipReader

	case "br":
		if debugMode {
			log.Printf("📦 Detected Brotli compression (Content-Encoding), decompressing...")
		}
		reader = brotli.NewReader(resp.Body)

	case "":
		// No compression
		if debugMode {
			log.Printf("ℹ️ No compression encoding")
		}

	default:
		if debugMode {
			log.Printf("⚠️ Unknown compression encoding: %s", contentEncoding)
		}
	}

	// Read (possibly decompressed) data
	body, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %v", err)
	}

	if debugMode && contentEncoding != "" {
		log.Printf("✅ Decompression successful, decompressed size: %d bytes", len(body))
	}

	return body, nil
}

// min function
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// CORS allowed origins for trollllm.xyz
var corsAllowedOrigins = map[string]bool{
	"http://localhost:3000":     true,
	"http://localhost:3001":     true,
	"https://trollllm.xyz":      true,
	"https://www.trollllm.xyz":  true,
	"https://api.trollllm.xyz":  true,
	"https://chat.trollllm.xyz": true,
}

// corsMiddleware wraps handlers with CORS support
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		// Allow whitelisted origins, or any origin for external services
		if corsAllowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else if origin != "" {
			// Allow any origin for compatibility with external services
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			// No origin header (direct API call) - allow all
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, x-session-id, x-assistant-message-id")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

// Response recorder
type responseRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (r *responseRecorder) WriteHeader(code int) {
	r.statusCode = code
	r.ResponseWriter.WriteHeader(code)
}

// checkRateLimit checks if request is within rate limit for the given API key
// Returns true if allowed, false if rate limited (response already sent)
// Default: OpenAI format for backward compatibility
func checkRateLimit(w http.ResponseWriter, apiKey string) bool {
	return checkRateLimitWithUsername(w, apiKey, "", false)
}

// checkRateLimitWithUsername checks rate limit with key type detection and refCredits support
// Rate limits: User Key (sk-troll-*) = 600 RPM, Friend Key (sk-trollllm-friend-*) = 60 RPM
// When user's main credits are exhausted and using refCredits, Pro-level RPM (1000) is applied (User Keys only)
// isAnthropicEndpoint: true for /v1/messages (Anthropic format), false for /v1/chat/completions (OpenAI format)
func checkRateLimitWithUsername(w http.ResponseWriter, apiKey string, username string, isAnthropicEndpoint bool) bool {
	// Get rate limit based on key type (User: 600, Friend: 60, Unknown: 300)
	limit := ratelimit.GetRPMForAPIKey(apiKey)
	keyType := userkey.GetKeyType(apiKey)

	// Check if user is using refCredits (main credits exhausted) - apply Pro RPM for User Keys only
	if username != "" && keyType == userkey.KeyTypeUser {
		creditResult, err := userkey.CheckUserCreditsDetailed(username)
		if err == nil && creditResult != nil && creditResult.UseRefCredits {
			limit = 1000 // Pro-level RPM when using refCredits
			log.Printf("🎁 [RefCredits] Applying Pro RPM (1000) for user %s using refCredits", username)
		}
	}

	// Log key type detection
	log.Printf("🔑 [RateLimit] Key type: %s, limit: %d RPM for key %s...", keyType.String(), limit, apiKey[:min(8, len(apiKey))])

	// Check rate limit
	if !rateLimiter.Allow(apiKey, limit) {
		retryAfter := rateLimiter.RetryAfter(apiKey, limit)
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
		w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
		w.Header().Set("X-RateLimit-Remaining", "0")
		w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Duration(retryAfter)*time.Second).Unix(), 10))
		w.WriteHeader(http.StatusTooManyRequests)
		// Story 4.2: Return error in correct format based on endpoint type
		if isAnthropicEndpoint {
			// Anthropic format: {"type":"error","error":{"type":"...","message":"..."}}
			w.Write([]byte(fmt.Sprintf(`{"type":"error","error":{"type":"rate_limit_error","message":"Rate limit exceeded. Please retry after %d seconds."}}`, retryAfter)))
		} else {
			// OpenAI format: {"error":{"message":"...","type":"...","code":"..."}}
			w.Write([]byte(fmt.Sprintf(`{"error":{"message":"Rate limit exceeded. Please retry after %d seconds.","type":"rate_limit_error","code":"rate_limit_exceeded"}}`, retryAfter)))
		}
		log.Printf("⚠️ Rate limit exceeded for key %s (limit: %d RPM)", apiKey[:min(8, len(apiKey))]+"...", limit)
		return false
	}

	// Add rate limit headers to successful responses
	w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
	w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(rateLimiter.Remaining(apiKey, limit)))
	w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Minute).Unix(), 10))
	return true
}

// Health check endpoint
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"uptime":    time.Since(startTime).Seconds(),
	}); err != nil {
		log.Printf("Error: failed to encode response: %v", err)
	}
}

// Keys status endpoint - shows all troll keys and their status
func keysStatusHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"stats":                 trollKeyPool.GetStats(),
		"backup_keys_available": keypool.GetBackupKeyCount(),
		"keys":                  trollKeyPool.GetAllKeysStatus(),
	})
}

// OpenHands backup keys endpoint
func openhandsBackupKeysHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	keys, stats := openhands.ListOpenHandsBackupKeys()

	// Mask API keys and add deletesAt for used keys
	maskedKeys := make([]map[string]interface{}, len(keys))
	for i, k := range keys {
		masked := k.APIKey
		if len(masked) > 12 {
			masked = masked[:8] + "..." + masked[len(masked)-4:]
		}
		keyData := map[string]interface{}{
			"id":           k.ID,
			"maskedApiKey": masked,
			"isUsed":       k.IsUsed,
			"activated":    k.Activated,
			"usedFor":      k.UsedFor,
			"createdAt":    k.CreatedAt,
		}
		// Add usedAt and deletesAt for used keys
		if k.IsUsed && k.UsedAt != nil {
			keyData["usedAt"] = k.UsedAt
			// deletesAt = usedAt + 12 hours
			deletesAt := k.UsedAt.Add(12 * time.Hour)
			keyData["deletesAt"] = deletesAt
		}
		maskedKeys[i] = keyData
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"keys":      maskedKeys,
		"total":     stats.Total,
		"available": stats.Available,
		"used":      stats.Used,
	})
}

// Model list endpoint
func modelsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	models := config.GetAllModels()
	openaiModels := make([]map[string]interface{}, 0, len(models))

	// Base timestamp: 2025-01-01 00:00:00 UTC
	baseTimestamp := int64(1735689600)

	for i, model := range models {
		// Each model gets a unique timestamp (1 day apart)
		openaiModels = append(openaiModels, map[string]interface{}{
			"id":       model.ID,
			"object":   "model",
			"created":  baseTimestamp + int64(i*86400),
			"owned_by": "trollLLM",
		})
	}

	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"object": "list",
		"data":   openaiModels,
	}); err != nil {
		log.Printf("Error: failed to encode response: %v", err)
	}
}

// OpenAI compatible chat endpoint
func chatCompletionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// Get client Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, `{"error": {"message": "Authorization header is required", "type": "invalid_request_error"}}`, http.StatusUnauthorized)
		return
	}

	// Extract client API Key for rate limiting
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		http.Error(w, `{"error": {"message": "Invalid authorization header format", "type": "invalid_request_error"}}`, http.StatusUnauthorized)
		return
	}
	clientAPIKey := parts[1]

	// Validate API key - either from env (PROXY_API_KEY) or MongoDB (user_keys)
	proxyAPIKey := getEnv("PROXY_API_KEY", "")
	clientKeyMask := clientAPIKey
	if len(clientKeyMask) > 8 {
		clientKeyMask = clientKeyMask[:4] + "..." + clientKeyMask[len(clientKeyMask)-4:]
	}

	var username string // Username for credit deduction
	var isFriendKeyRequest bool
	var friendKeyID string // Store Friend Key ID for model limit check later

	if proxyAPIKey != "" {
		// Validate with fixed PROXY_API_KEY from env
		if clientAPIKey != proxyAPIKey {
			log.Printf("❌ API Key validation failed (env): %s", clientKeyMask)
			http.Error(w, `{"error": {"message": "Invalid API key", "type": "authentication_error"}}`, http.StatusUnauthorized)
			return
		}
		log.Printf("🔑 Key validated (env): %s", clientKeyMask)
	} else if userkey.IsFriendKey(clientAPIKey) {
		// Validate Friend Key (model limit check will be done after model parsing)
		friendKeyResult, err := userkey.ValidateFriendKeyBasic(clientAPIKey)
		if err != nil {
			log.Printf("❌ Friend Key validation failed: %s - %v", clientKeyMask, err)
			switch err {
			case userkey.ErrFriendKeyNotFound:
				http.Error(w, `{"error": {"message": "Invalid API key", "type": "authentication_error"}}`, http.StatusUnauthorized)
			case userkey.ErrFriendKeyInactive:
				http.Error(w, `{"error": {"message": "Friend Key has been deactivated", "type": "authentication_error"}}`, http.StatusUnauthorized)
			case userkey.ErrFriendKeyOwnerInactive:
				http.Error(w, `{"error": {"message": "Friend Key owner account is inactive", "type": "authentication_error"}}`, http.StatusUnauthorized)
			case userkey.ErrFriendKeyOwnerNoCredits:
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusPaymentRequired)
				// Story 4.1: Updated to use consistent OpenAI error format with code field
				w.Write([]byte(`{"error":{"message":"Insufficient credits. Please contact the key owner.","type":"insufficient_quota","code":"insufficient_credits"}}`))
			default:
				http.Error(w, `{"error": {"message": "Invalid API key", "type": "authentication_error"}}`, http.StatusUnauthorized)
			}
			return
		}
		log.Printf("🔑 Friend Key validated: %s [owner: %s]", clientKeyMask, friendKeyResult.Owner.Username)
		username = friendKeyResult.Owner.Username
		isFriendKeyRequest = true
		friendKeyID = clientAPIKey
	} else {
		// Validate from MongoDB user_keys collection
		userKey, err := userkey.ValidateKey(clientAPIKey)
		if err != nil {
			log.Printf("❌ API Key validation failed (db): %s - %v", clientKeyMask, err)
			if err == userkey.ErrKeyRevoked {
				http.Error(w, `{"error": {"message": "API key has been revoked", "type": "authentication_error"}}`, http.StatusUnauthorized)
			} else if err == userkey.ErrInsufficientCredits {
				// AC3: Include balance info ($0.00 since validation failed due to no credits)
				// Story 4.1: Updated to use consistent OpenAI error format with code field
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusPaymentRequired)
				w.Write([]byte(`{"error":{"message":"Insufficient credits. Current balance: $0.00","type":"insufficient_quota","code":"insufficient_credits","balance":0.00}}`))
			} else if err == userkey.ErrCreditsExpired {
				// Story 4.1: Updated to use consistent OpenAI error format with code field
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusPaymentRequired)
				w.Write([]byte(`{"error":{"message":"Credits have expired. Please purchase new credits.","type":"insufficient_quota","code":"credits_expired"}}`))
			} else if err == userkey.ErrMigrationRequired {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte(`{"error":{"message":"Migration required: please visit https://trollllm.xyz/dashboard to migrate your account to the new billing rate (1000→2500 VNĐ/$)","type":"migration_required","code":"migration_required"}}`))
			} else {
				http.Error(w, `{"error": {"message": "Invalid API key", "type": "authentication_error"}}`, http.StatusUnauthorized)
			}
			return
		}
		log.Printf("🔑 Key validated (db): %s", clientKeyMask)
		username = userKey.Name // Store username for credit deduction

		// NOTE: Credit check moved to after upstream routing to support dual-credit system
		// OpenHands uses creditsNew, OhMyGPT uses credits - check happens per-upstream
	}
	// Store Friend Key info for use in response handlers
	_ = isFriendKeyRequest
	_ = friendKeyID

	// Check rate limit (with refCredits support for Pro RPM) - OpenAI format for /v1/chat/completions
	if !checkRateLimitWithUsername(w, clientAPIKey, username, false) {
		return
	}
	// // Get factory key from proxy pool or environment
	// var selectedProxy *proxy.Proxy
	// var trollAPIKey string
	//
	// if proxyPool != nil && proxyPool.HasProxies() {
	// 	// Use proxy pool - sticky routing based on client API key
	// 	var trollKeyID string
	// 	var err error
	// 	selectedProxy, trollKeyID, err = proxyPool.SelectProxyWithKeyByClient(clientAPIKey)
	// 	if err != nil {
	// 		log.Printf("❌ Failed to select proxy: %v", err)
	// 		http.Error(w, `{"error": {"message": "No available proxies", "type": "server_error"}}`, http.StatusServiceUnavailable)
	// 		return
	// 	}
	// 	trollAPIKey = trollKeyPool.GetAPIKey(trollKeyID)
	// 	if trollAPIKey == "" {
	// 		log.Printf("❌ Troll key %s not found in pool", trollKeyID)
	// 		http.Error(w, `{"error": {"message": "Server configuration error", "type": "server_error"}}`, http.StatusInternalServerError)
	// 		return
	// 	}
	// 	log.Printf("🔄 [OpenAI] Using proxy %s with key %s", selectedProxy.Name, trollKeyID)
	// } else {
	// 	// Fallback to environment variable
	// 	trollAPIKey = getEnv("TROLL_API_KEY", "")
	// 	if trollAPIKey == "" {
	// 		log.Printf("❌ No proxies configured and TROLL_API_KEY not set")
	// 		http.Error(w, `{"error": {"message": "Server configuration error", "type": "server_error"}}`, http.StatusInternalServerError)
	// 		return
	// 	}
	// }
	// authHeader = "Bearer " + trollAPIKey
	// OLD CODE - END

	// Read request body
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error: failed to read request body: %v", err)
		http.Error(w, `{"error": {"message": "Failed to read request body", "type": "invalid_request_error"}}`, http.StatusBadRequest)
		return
	}
	defer func() {
		if err := r.Body.Close(); err != nil {
			log.Printf("Warning: failed to close request body: %v", err)
		}
	}()

	// 📝 Detailed log: record complete request (debug mode only)
	if debugMode {
		log.Printf("📥 ========== Request Received ==========")
		log.Printf("📥 Method: %s", r.Method)
		log.Printf("📥 URL: %s", r.URL.String())
		log.Printf("📥 Headers:")
		for key, values := range r.Header {
			for _, value := range values {
				log.Printf("📥   %s: %s", key, value)
			}
		}
		log.Printf("📥 Request Body:")
		log.Printf("📥 %s", string(bodyBytes))
		log.Printf("📥 ================================")
	}

	// Parse OpenAI request
	var openaiReq transformers.OpenAIRequest
	if err := json.Unmarshal(bodyBytes, &openaiReq); err != nil {
		log.Printf("Error: failed to parse request body: %v", err)
		http.Error(w, `{"error": {"message": "Invalid JSON", "type": "invalid_request_error"}}`, http.StatusBadRequest)
		return
	}

	// Debug: log incoming request details
	log.Printf("📥 [/v1/chat/completions] Model: %s, Messages: %d, Stream: %v", openaiReq.Model, len(openaiReq.Messages), openaiReq.Stream)

	// Check if model is supported
	model := config.GetModelByID(openaiReq.Model)
	if model == nil {
		log.Printf("❌ Unsupported model: %s", openaiReq.Model)
		http.Error(w, fmt.Sprintf(`{"error": {"message": "Model '%s' not found", "type": "invalid_request_error"}}`, openaiReq.Model), http.StatusNotFound)
		return
	}

	// Check Friend Key model limit (now that we have the model ID)
	if isFriendKeyRequest && friendKeyID != "" {
		if err := userkey.CheckFriendKeyModelLimit(friendKeyID, openaiReq.Model); err != nil {
			log.Printf("🚫 Friend Key model limit check failed: %s - %v", clientKeyMask, err)
			w.Header().Set("Content-Type", "application/json")
			switch err {
			case userkey.ErrFriendKeyModelNotAllowed:
				w.WriteHeader(http.StatusPaymentRequired)
				w.Write([]byte(fmt.Sprintf(`{"error": {"message": "Model '%s' is not configured for this Friend Key", "type": "friend_key_model_not_allowed"}}`, openaiReq.Model)))
			case userkey.ErrFriendKeyModelDisabled:
				w.WriteHeader(http.StatusPaymentRequired)
				w.Write([]byte(fmt.Sprintf(`{"error": {"message": "Model '%s' is disabled for this Friend Key", "type": "friend_key_model_disabled"}}`, openaiReq.Model)))
			case userkey.ErrFriendKeyModelLimitExceeded:
				w.WriteHeader(http.StatusPaymentRequired)
				w.Write([]byte(fmt.Sprintf(`{"error": {"message": "Friend Key spending limit exceeded for model '%s'", "type": "friend_key_model_limit_exceeded"}}`, openaiReq.Model)))
			default:
				w.WriteHeader(http.StatusPaymentRequired)
				w.Write([]byte(`{"error": {"message": "Friend Key model access denied", "type": "friend_key_error"}}`))
			}
			return
		}
		log.Printf("✅ Friend Key model limit OK: %s -> %s", clientKeyMask, openaiReq.Model)
	}

	if debugMode {
		log.Printf("✅ %s [%s] stream=%v", openaiReq.Model, model.Type, openaiReq.Stream)
	}

	// OLD CODE - BEGIN
	// // Get trollKeyID for logging (use "env" if from environment variable)
	// var trollKeyID string
	// if proxyPool != nil && proxyPool.HasProxies() {
	// 	_, trollKeyID, _ = proxyPool.SelectProxyWithKeyByClient(clientAPIKey)
	// } else {
	// 	trollKeyID = "env"
	// }
	//
	// // Route request based on model type
	// switch model.Type {
	// case "anthropic":
	// 	handleAnthropicRequest(w, r, &openaiReq, model, authHeader, selectedProxy, clientAPIKey, trollKeyID, username)
	// case "openai":
	// 	handleTrollOpenAIRequest(w, r, &openaiReq, model, authHeader, selectedProxy, clientAPIKey, trollKeyID, username)
	// default:
	// 	http.Error(w, `{"error": {"message": "Unsupported model type", "type": "invalid_request_error"}}`, http.StatusBadRequest)
	// }
	// OLD CODE - END

	// NEW MODEL-BASED ROUTING - BEGIN
	// Select upstream based on model configuration
	upstreamConfig, selectedProxy, err := selectUpstreamConfig(model.ID, clientAPIKey)
	if err != nil {
		log.Printf("❌ Failed to select upstream: %v", err)
		http.Error(w, `{"error": {"message": "Server configuration error", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}
	authHeader = "Bearer " + upstreamConfig.APIKey
	trollKeyID := upstreamConfig.KeyID

	// Credit pre-check based on billing_upstream config (not upstream provider)
	// billing_upstream="openhands" → check creditsNew field
	// billing_upstream="ohmygpt" → check credits+refCredits fields
	if username != "" {
		billingUpstream := config.GetModelBillingUpstream(model.ID)

		if billingUpstream == "openhands" {
			// Check creditsNew field for chat.trollllm.xyz
			if err := userkey.CheckUserCreditsOpenHands(username); err != nil {
				if err == userkey.ErrInsufficientCredits {
					log.Printf("💸 Insufficient creditsNew for user %s (billing_upstream=openhands)", username)
					// Get creditsNew balance for error response
					ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
					defer cancel()
					var user struct {
						CreditsNew float64 `bson:"creditsNew"`
					}
					db.UsersNewCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusPaymentRequired)
					w.Write([]byte(fmt.Sprintf(`{"error":{"message":"Insufficient credits. Current balance: $%.2f","type":"insufficient_quota","code":"insufficient_credits","balance":%.2f}}`, user.CreditsNew, user.CreditsNew)))
					return
				}
				log.Printf("⚠️ Failed to check creditsNew for user %s: %v", username, err)
			}
		} else {
			// Check credits+refCredits fields for chat2.trollllm.xyz
			if err := userkey.CheckUserCredits(username); err != nil {
				if err == userkey.ErrInsufficientCredits {
					log.Printf("💸 Insufficient credits for user %s (billing_upstream=ohmygpt)", username)
					credits, refCredits, _ := userkey.GetUserCreditsWithRef(username)
					totalBalance := credits + refCredits
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusPaymentRequired)
					w.Write([]byte(fmt.Sprintf(`{"error":{"message":"Insufficient credits. Current balance: $%.2f","type":"insufficient_quota","code":"insufficient_credits","balance":%.2f}}`, totalBalance, totalBalance)))
					return
				}
				log.Printf("⚠️ Failed to check credits for user %s: %v", username, err)
			}
		}
	}

	// Route request based on model type and upstream
	switch model.Type {
	case "anthropic":
		handleAnthropicRequest(w, r, &openaiReq, model, authHeader, selectedProxy, clientAPIKey, trollKeyID, username, upstreamConfig, bodyBytes)
	case "openai":
		// For "main" upstream: route to Main Target Server with OpenAI response format
		if upstreamConfig.KeyID == "main" {
			handleMainTargetRequestOpenAI(w, &openaiReq, bodyBytes, model.ID, clientAPIKey, username)
		} else if upstreamConfig.KeyID == "openhands" {
			handleOpenHandsOpenAIRequest(w, &openaiReq, bodyBytes, model.ID, clientAPIKey, username)
		} else if upstreamConfig.KeyID == "ohmygpt" {
			handleOhMyGPTOpenAIRequest(w, &openaiReq, bodyBytes, model.ID, clientAPIKey, username)
		} else {
			handleTrollOpenAIRequest(w, r, &openaiReq, model, authHeader, selectedProxy, clientAPIKey, trollKeyID, username, bodyBytes)
		}
	case "openhands":
		// OpenHands LLM Proxy: Always forward OpenAI format to /v1/chat/completions
		// No transformation needed - OpenHands handles Claude/GPT/Gemini models in OpenAI format
		if upstreamConfig.KeyID == "openhands" {
			handleOpenHandsOpenAIRequest(w, &openaiReq, bodyBytes, model.ID, clientAPIKey, username)
		}
	case "ohmygpt":
		// OhMyGPT: Always forward OpenAI format to /v1/chat/completions
		if upstreamConfig.KeyID == "ohmygpt" {
			handleOhMyGPTOpenAIRequest(w, &openaiReq, bodyBytes, model.ID, clientAPIKey, username)
		}
	default:
		http.Error(w, `{"error": {"message": "Unsupported model type", "type": "invalid_request_error"}}`, http.StatusBadRequest)
	}
	// NEW MODEL-BASED ROUTING - END
}

// Handle Anthropic type request
func handleAnthropicRequest(w http.ResponseWriter, r *http.Request, openaiReq *transformers.OpenAIRequest, model *config.Model, authHeader string, selectedProxy *proxy.Proxy, userApiKey string, trollKeyID string, username string, upstreamConfig *UpstreamConfig, bodyBytes []byte) {
	// For "main" upstream: use maintarget package (passthrough to external proxy)
	if upstreamConfig.KeyID == "main" {
		handleMainTargetRequest(w, openaiReq, bodyBytes, model.ID, userApiKey, username)
		return
	}

	// For "troll" upstream: use Factory AI with full transformation
	anthropicReq := transformers.TransformToAnthropic(openaiReq)

	// Determine thinking state based on assistant messages in conversation history
	// Rules:
	//   - If ANY assistant has thinking blocks → MUST enable thinking
	//   - If ANY assistant lacks thinking blocks → MUST disable thinking
	//   - Mixed state is invalid (shouldn't happen in normal flow)
	//   - No assistant messages → can enable thinking (new conversation)
	hasThinking, hasNonThinking := detectAssistantThinkingState(anthropicReq.Messages)

	if hasThinking && hasNonThinking {
		// Mixed state - shouldn't happen, but prefer enabling thinking
		log.Printf("⚠️ [/v1/chat/completions] Mixed thinking state detected - enabling thinking")
	}

	if hasThinking {
		// Conversation has thinking blocks - MUST enable thinking
		if anthropicReq.Thinking == nil || anthropicReq.Thinking.Type != "enabled" {
			budgetTokens := config.GetModelThinkingBudget(openaiReq.Model)
			anthropicReq.Thinking = &transformers.ThinkingConfig{
				Type:         "enabled",
				BudgetTokens: budgetTokens,
			}
		}
		log.Printf("🧠 [/v1/chat/completions] Thinking: ENABLED (conversation has thinking blocks, budget=%d)", anthropicReq.Thinking.BudgetTokens)
	} else if hasNonThinking {
		// Conversation has assistant messages without thinking - MUST disable
		anthropicReq.Thinking = nil
		log.Printf("🧠 [/v1/chat/completions] Thinking: DISABLED (conversation lacks thinking blocks)")
	} else {
		// No assistant messages - new conversation, use config
		if anthropicReq.Thinking != nil && anthropicReq.Thinking.Type == "enabled" {
			log.Printf("🧠 [/v1/chat/completions] Thinking: ENABLED (new conversation, budget=%d)", anthropicReq.Thinking.BudgetTokens)
		} else {
			log.Printf("🧠 [/v1/chat/completions] Thinking: DISABLED (model config)")
		}
	}

	endpointURL := upstreamConfig.EndpointURL

	reqBody, err := json.Marshal(anthropicReq)
	if err != nil {
		log.Printf("Error: failed to serialize request: %v", err)
		http.Error(w, `{"error": {"message": "Failed to serialize request", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	if debugMode {
		log.Printf("📤 /v1/chat/completions→Anthropic body:")
		log.Printf("📤 %s", string(reqBody))
	}

	proxyReq, err := http.NewRequest(http.MethodPost, endpointURL, bytes.NewBuffer(reqBody))
	if err != nil {
		log.Printf("Error: failed to create request: %v", err)
		http.Error(w, `{"error": {"message": "Failed to create request", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	clientHeaders := extractClientHeaders(r)
	headers := transformers.GetAnthropicHeaders(authHeader, clientHeaders, openaiReq.Stream, model.ID)
	for key, value := range headers {
		proxyReq.Header.Set(key, value)
	}

	client := httpClient
	if selectedProxy != nil {
		proxyClient, err := proxyPool.CreateHTTPClientWithProxy(selectedProxy)
		if err != nil {
			// SECURITY: Do NOT fallback to direct - would expose server IP
			log.Printf("❌ Failed to create proxy client (no fallback): %v", err)
			http.Error(w, `{"error": {"message": "Proxy unavailable", "type": "server_error"}}`, http.StatusServiceUnavailable)
			return
		}
		client = proxyClient
	}

	requestStartTime := time.Now()

	resp, err := doRequestWithRetry(client, proxyReq, reqBody)
	if err != nil {
		log.Printf("Error: request failed after retries: %v", err)
		http.Error(w, `{"error": {"message": "Request to upstream failed", "type": "upstream_error"}}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if debugMode {
		log.Printf("📥 Anthropic response: %d", resp.StatusCode)
	}

	if openaiReq.Stream {
		handleAnthropicStreamResponse(w, resp, model.ID, userApiKey, trollKeyID, requestStartTime, username)
	} else {
		handleAnthropicNonStreamResponse(w, resp, model.ID, userApiKey, trollKeyID, requestStartTime, username)
	}
}

// handleMainTargetRequest handles requests routed to main target (external proxy)
// Forwards OpenAI format directly with model ID mapping
func handleMainTargetRequest(w http.ResponseWriter, openaiReq *transformers.OpenAIRequest, bodyBytes []byte, modelID string, userApiKey string, username string) {
	if !maintarget.IsConfigured() {
		http.Error(w, `{"error": {"message": "Main target not configured", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	// Get upstream model ID (may be different from client-requested model ID)
	upstreamModelID := config.GetUpstreamModelID(modelID)

	// Prepare request body with mapped model ID
	var requestBody []byte
	if upstreamModelID != modelID {
		// Need to replace model ID in request body
		var reqMap map[string]interface{}
		if err := json.Unmarshal(bodyBytes, &reqMap); err == nil {
			reqMap["model"] = upstreamModelID
			if mapped, err := json.Marshal(reqMap); err == nil {
				requestBody = mapped
				log.Printf("🔀 [MainTarget] Model mapping: %s -> %s", modelID, upstreamModelID)
			} else {
				requestBody = bodyBytes
			}
		} else {
			requestBody = bodyBytes
		}
	} else {
		requestBody = bodyBytes
	}

	isStreaming := openaiReq.Stream
	log.Printf("📤 [MainTarget] Forwarding to %s/v1/chat/completions (model=%s, stream=%v)", maintarget.GetServerURL(), upstreamModelID, isStreaming)

	requestStartTime := time.Now()
	resp, err := maintarget.ForwardOpenAIRequest(requestBody, isStreaming)
	if err != nil {
		log.Printf("❌ [MainTarget] Request failed after %v: %v", time.Since(requestStartTime), err)
		http.Error(w, `{"error": {"message": "Request to main target failed", "type": "upstream_error"}}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	onUsage := func(input, output, cacheWrite, cacheHit int64) {
		billingTokens := config.CalculateBillingTokensWithCache(modelID, input, output, cacheWrite, cacheHit)
		billingCost := config.CalculateBillingCostWithCache(modelID, input, output, cacheWrite, cacheHit)

		if userApiKey != "" {
			usage.UpdateUsage(userApiKey, billingTokens)
			creditType := "ohmygpt" // Default credit type
			if username != "" {
				// billing_upstream controls credit field selection, independent of upstream provider
				// "openhands" = deduct from creditsNew field (used by chat.trollllm.xyz)
				// "ohmygpt" = deduct from credits field (used by chat2.trollllm.xyz)
				// Both domains may use the same upstream provider (OpenHands) but different credit fields
				billingUpstream := config.GetModelBillingUpstream(modelID)
				if billingUpstream == "openhands" {
					// billing_upstream='openhands' → DeductCreditsOpenHands() → creditsNew field
					usage.DeductCreditsOpenHands(username, billingCost, billingTokens, input, output)
					creditType = "openhands"
					log.Printf("💳 [MainTarget] Billing upstream: OpenHands (creditsNew)")
				} else {
					// billing_upstream='ohmygpt' → DeductCreditsOhMyGPT() → credits field
					usage.DeductCreditsOhMyGPT(username, billingCost, billingTokens, input, output)
					log.Printf("💳 [MainTarget] Billing upstream: OhMyGPT (credits)")
				}
				// Update Friend Key usage if applicable
				usage.UpdateFriendKeyUsageIfNeeded(userApiKey, modelID, billingCost)
			}
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequestDetailed(usage.RequestLogParams{
				UserID:           username,
				UserKeyID:        userApiKey,
				TrollKeyID:       "main",
				Model:            modelID,
				InputTokens:      input,
				OutputTokens:     output,
				CacheWriteTokens: cacheWrite,
				CacheHitTokens:   cacheHit,
				CreditsCost:      billingCost,
				CreditType:       creditType,
				TokensUsed:       billingTokens,
				StatusCode:       resp.StatusCode,
				LatencyMs:        latencyMs,
			})
		}
		log.Printf("📊 [MainTarget] Usage: in=%d out=%d cache_w=%d cache_h=%d cost=$%.6f", input, output, cacheWrite, cacheHit, billingCost)
	}

	if isStreaming {
		maintarget.HandleOpenAIStreamResponse(w, resp, onUsage)
	} else {
		maintarget.HandleOpenAINonStreamResponse(w, resp, onUsage)
	}
}

// handleMainTargetRequestOpenAI handles requests routed to main target with OpenAI format
// Forwards OpenAI requests directly with model ID mapping
func handleMainTargetRequestOpenAI(w http.ResponseWriter, openaiReq *transformers.OpenAIRequest, bodyBytes []byte, modelID string, userApiKey string, username string) {
	if !maintarget.IsConfigured() {
		http.Error(w, `{"error": {"message": "Main target not configured", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	// Get upstream model ID (may be different from client-requested model ID)
	upstreamModelID := config.GetUpstreamModelID(modelID)

	// Prepare request body with mapped model ID
	var requestBody []byte
	if upstreamModelID != modelID {
		var reqMap map[string]interface{}
		if err := json.Unmarshal(bodyBytes, &reqMap); err == nil {
			reqMap["model"] = upstreamModelID
			if mapped, err := json.Marshal(reqMap); err == nil {
				requestBody = mapped
				log.Printf("🔀 [MainTarget-OpenAI] Model mapping: %s -> %s", modelID, upstreamModelID)
			} else {
				requestBody = bodyBytes
			}
		} else {
			requestBody = bodyBytes
		}
	} else {
		requestBody = bodyBytes
	}

	isStreaming := openaiReq.Stream

	log.Printf("📤 [MainTarget-OpenAI] Forwarding to %s/v1/chat/completions (model=%s, stream=%v)", maintarget.GetServerURL(), upstreamModelID, isStreaming)

	// Forward to main target with mapped model ID
	requestStartTime := time.Now()
	resp, err := maintarget.ForwardOpenAIRequest(requestBody, isStreaming)
	if err != nil {
		log.Printf("❌ [MainTarget-OpenAI] Request failed after %v: %v", time.Since(requestStartTime), err)
		http.Error(w, `{"error": {"message": "Request to main target failed", "type": "upstream_error"}}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Usage callback
	onUsage := func(input, output, cacheWrite, cacheHit int64) {
		billingTokens := config.CalculateBillingTokensWithCache(modelID, input, output, cacheWrite, cacheHit)
		billingCost := config.CalculateBillingCostWithCache(modelID, input, output, cacheWrite, cacheHit)

		if userApiKey != "" {
			usage.UpdateUsage(userApiKey, billingTokens)
			if username != "" {
				usage.DeductCreditsWithTokens(username, billingCost, billingTokens, input, output)
				// Update Friend Key usage if applicable
				usage.UpdateFriendKeyUsageIfNeeded(userApiKey, modelID, billingCost)
			}
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequestDetailed(usage.RequestLogParams{
				UserID:           username,
				UserKeyID:        userApiKey,
				TrollKeyID:       "main",
				Model:            modelID,
				InputTokens:      input,
				OutputTokens:     output,
				CacheWriteTokens: cacheWrite,
				CacheHitTokens:   cacheHit,
				CreditsCost:      billingCost,
				CreditType:       "ohmygpt",
				TokensUsed:       billingTokens,
				StatusCode:       resp.StatusCode,
				LatencyMs:        latencyMs,
			})
		}
		log.Printf("📊 [MainTarget-OpenAI] Usage: in=%d out=%d cache_w=%d cache_h=%d cost=$%.6f", input, output, cacheWrite, cacheHit, billingCost)
	}

	// Handle response (passthrough OpenAI format)
	if isStreaming {
		maintarget.HandleOpenAIStreamResponse(w, resp, onUsage)
	} else {
		maintarget.HandleOpenAINonStreamResponse(w, resp, onUsage)
	}
}

// handleMainTargetMessagesRequest handles /v1/messages requests routed to main target
// Forwards the original Anthropic request with model ID mapping
func handleMainTargetMessagesRequest(w http.ResponseWriter, originalBody []byte, isStreaming bool, modelID string, userApiKey string, username string) {
	if !maintarget.IsConfigured() {
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Main target not configured"}}`, http.StatusInternalServerError)
		return
	}

	// Get upstream model ID (may be different from client-requested model ID)
	upstreamModelID := config.GetUpstreamModelID(modelID)

	// Prepare request body with mapped model ID
	var requestBody []byte
	if upstreamModelID != modelID {
		// Need to replace model ID in request body
		var reqMap map[string]interface{}
		if err := json.Unmarshal(originalBody, &reqMap); err == nil {
			reqMap["model"] = upstreamModelID
			if mapped, err := json.Marshal(reqMap); err == nil {
				requestBody = mapped
				log.Printf("🔀 [MainTarget] Model mapping: %s -> %s", modelID, upstreamModelID)
			} else {
				requestBody = originalBody
			}
		} else {
			requestBody = originalBody
		}
	} else {
		requestBody = originalBody
	}

	log.Printf("📤 [MainTarget] Forwarding /v1/messages to %s (model=%s, stream=%v)", maintarget.GetServerURL(), upstreamModelID, isStreaming)

	// Forward request body with mapped model ID
	requestStartTime := time.Now()
	resp, err := maintarget.ForwardRequest(requestBody, isStreaming)
	if err != nil {
		log.Printf("❌ [MainTarget] Request failed after %v: %v", time.Since(requestStartTime), err)
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Request to main target failed"}}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Usage callback
	onUsage := func(input, output, cacheWrite, cacheHit int64) {
		billingTokens := config.CalculateBillingTokensWithCache(modelID, input, output, cacheWrite, cacheHit)
		billingCost := config.CalculateBillingCostWithCache(modelID, input, output, cacheWrite, cacheHit)

		if userApiKey != "" {
			usage.UpdateUsage(userApiKey, billingTokens)
			if username != "" {
				usage.DeductCreditsWithCache(username, billingCost, billingTokens, input, output, cacheWrite, cacheHit)
				// Update Friend Key usage if applicable
				usage.UpdateFriendKeyUsageIfNeeded(userApiKey, modelID, billingCost)
			}
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequestDetailed(usage.RequestLogParams{
				UserID:           username,
				UserKeyID:        userApiKey,
				TrollKeyID:       "main",
				Model:            modelID,
				InputTokens:      input,
				OutputTokens:     output,
				CacheWriteTokens: cacheWrite,
				CacheHitTokens:   cacheHit,
				CreditsCost:      billingCost,
				CreditType:       "ohmygpt",
				TokensUsed:       billingTokens,
				StatusCode:       resp.StatusCode,
				LatencyMs:        latencyMs,
			})
		}
		log.Printf("📊 [MainTarget] Usage: in=%d out=%d cacheW=%d cacheH=%d cost=$%.6f", input, output, cacheWrite, cacheHit, billingCost)
	}

	// Handle response
	if isStreaming {
		maintarget.HandleStreamResponse(w, resp, onUsage)
	} else {
		maintarget.HandleNonStreamResponse(w, resp, onUsage)
	}
}

// handleOpenHandsMessagesRequest handles /v1/messages requests routed to OpenHands LLM Proxy
// Forwards Anthropic format request to OpenHands /v1/messages endpoint
func handleOpenHandsMessagesRequest(w http.ResponseWriter, originalBody []byte, isStreaming bool, modelID string, userApiKey string, username string) {
	openhandsPool := openhandspool.GetPool()
	if openhandsPool == nil || openhandsPool.GetKeyCount() == 0 {
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Service not configured"}}`, http.StatusInternalServerError)
		return
	}

	// Select a key from the pool
	key, err := openhandsPool.SelectKey()
	if err != nil {
		log.Printf("❌ [Troll-LLM] No healthy keys available: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Service temporarily unavailable. Please try again later."}}`, http.StatusServiceUnavailable)
		return
	}

	// Parse request to inject system prompt
	var anthropicReq transformers.AnthropicRequest
	if err := json.Unmarshal(originalBody, &anthropicReq); err != nil {
		log.Printf("❌ [Troll-LLM] Failed to parse request: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"invalid_request_error","message":"Invalid JSON"}}`, http.StatusBadRequest)
		return
	}

	// Get upstream model ID (may be different from client-requested model ID)
	upstreamModelID := config.GetUpstreamModelID(modelID)
	anthropicReq.Model = upstreamModelID

	// Claude/Anthropic doesn't allow both temperature and top_p
	// We need to check and remove top_p from the raw JSON if temperature exists
	var rawRequest map[string]interface{}
	json.Unmarshal(originalBody, &rawRequest)
	_, hasTemperature := rawRequest["temperature"]
	_, hasTopP := rawRequest["top_p"]
	if hasTemperature && hasTopP {
		log.Printf("⚠️ [Troll-LLM] Removing top_p - Claude doesn't allow both temperature and top_p")
		delete(rawRequest, "top_p")
	}

	// Inject and merge system prompt
	configSystemPrompt := config.GetSystemPrompt()
	userSystemText := sanitizeBlockedContent(combineSystemText(anthropicReq.GetSystemAsArray()))
	var systemEntries []map[string]interface{}

	// Add config system prompt first (higher priority)
	if configSystemPrompt != "" {
		systemEntries = append(systemEntries, map[string]interface{}{
			"type": "text",
			"text": configSystemPrompt,
		})
		log.Printf("✅ [Troll-LLM] Injected config system prompt (%d chars)", len(configSystemPrompt))
	}

	// Add user system prompt (sanitized to remove blocked content)
	if userSystemText != "" {
		sanitizedUserSystem := sanitizeBlockedContent(userSystemText)
		if sanitizedUserSystem != "" {
			systemEntries = append(systemEntries, map[string]interface{}{
				"type": "text",
				"text": sanitizedUserSystem,
			})
			log.Printf("✅ [Troll-LLM] Merged user system prompt (%d chars)", len(sanitizedUserSystem))
		}
	}

	if len(systemEntries) > 0 {
		anthropicReq.System = systemEntries
	} else {
		anthropicReq.System = nil
	}

	// AUTO-TRUNCATE: Check if request exceeds token limit and truncate if needed
	// First, try to get accurate token count from API (call_endpoint=true)
	maxTokensAnthropic := transformers.GetModelMaxTokens(upstreamModelID)
	estimatedTokensAnthropic := transformers.EstimateAnthropicTokens(&anthropicReq)

	// Try to get accurate token count from /utils/token_counter API
	var actualTokens int64 = estimatedTokensAnthropic
	if key != nil && estimatedTokensAnthropic > maxTokensAnthropic-10000 { // Only call API if close to limit
		// Convert Anthropic messages to map format for token counting API
		messagesForCount := make([]map[string]interface{}, 0, len(anthropicReq.Messages)+1)
		// Add system as first message if present
		if anthropicReq.System != nil {
			var systemContent string
			if systemStr, ok := anthropicReq.System.(string); ok {
				systemContent = systemStr
			} else if systemArray, ok := anthropicReq.System.([]interface{}); ok {
				for _, item := range systemArray {
					if itemMap, ok := item.(map[string]interface{}); ok {
						if text, ok := itemMap["text"].(string); ok {
							systemContent += text
						}
					}
				}
			}
			if systemContent != "" {
				messagesForCount = append(messagesForCount, map[string]interface{}{
					"role":    "system",
					"content": systemContent,
				})
			}
		}
		// Add conversation messages
		for _, msg := range anthropicReq.Messages {
			msgMap := map[string]interface{}{
				"role":    msg.Role,
				"content": msg.Content,
			}
			messagesForCount = append(messagesForCount, msgMap)
		}

		// Call token counter API with call_endpoint=true for accurate count
		apiTokens, err := openhands.CountTokensViaAPI(openhands.OpenHandsBaseURL, key.APIKey, upstreamModelID, messagesForCount, true)
		if err == nil && apiTokens > 0 {
			actualTokens = apiTokens
			log.Printf("📊 [TokenCount-Anthropic] API accurate count: %d tokens (estimated: %d)", actualTokens, estimatedTokensAnthropic)
		} else if err != nil {
			log.Printf("⚠️ [TokenCount-Anthropic] API call failed, using estimation: %v", err)
		}
	}

	// Truncation loop: Keep truncating until under limit (with API verification)
	maxTruncationAttempts := 5
	truncationAttempt := 0
	for transformers.ShouldTruncate(actualTokens, maxTokensAnthropic) && truncationAttempt < maxTruncationAttempts {
		truncationAttempt++
		log.Printf("⚠️ [OpenHands-Anthropic] Attempt %d: Request exceeds limit (%d > %d tokens), auto-truncating...",
			truncationAttempt, actualTokens, maxTokensAnthropic)

		truncatedReq, truncResult := transformers.TruncateAnthropicRequest(&anthropicReq, maxTokensAnthropic)
		if truncResult.WasTruncated {
			anthropicReq = *truncatedReq
			log.Printf("✂️ [OpenHands-Anthropic] Truncated: removed %d messages, %d -> %d tokens (estimated)",
				truncResult.MessagesRemoved, truncResult.OriginalTokens, truncResult.FinalTokens)

			// Re-verify with API after truncation to ensure we're actually under limit
			if key != nil {
				// Rebuild messages for count
				messagesForRecount := make([]map[string]interface{}, 0, len(anthropicReq.Messages)+1)
				if anthropicReq.System != nil {
					var systemContent string
					if systemStr, ok := anthropicReq.System.(string); ok {
						systemContent = systemStr
					} else if systemArray, ok := anthropicReq.System.([]interface{}); ok {
						for _, item := range systemArray {
							if itemMap, ok := item.(map[string]interface{}); ok {
								if text, ok := itemMap["text"].(string); ok {
									systemContent += text
								}
							}
						}
					}
					if systemContent != "" {
						messagesForRecount = append(messagesForRecount, map[string]interface{}{
							"role":    "system",
							"content": systemContent,
						})
					}
				}
				for _, msg := range anthropicReq.Messages {
					msgMap := map[string]interface{}{
						"role":    msg.Role,
						"content": msg.Content,
					}
					messagesForRecount = append(messagesForRecount, msgMap)
				}

				// Call API to verify actual token count after truncation
				verifyTokens, verifyErr := openhands.CountTokensViaAPI(openhands.OpenHandsBaseURL, key.APIKey, upstreamModelID, messagesForRecount, true)
				if verifyErr == nil && verifyTokens > 0 {
					actualTokens = verifyTokens
					log.Printf("📊 [TokenCount-Anthropic] Post-truncation verify: %d tokens (limit: %d)", actualTokens, maxTokensAnthropic)
				} else {
					// If API fails, use estimation and break to avoid infinite loop
					actualTokens = truncResult.FinalTokens
					log.Printf("⚠️ [TokenCount-Anthropic] Post-truncation API failed, using estimate: %d tokens", actualTokens)
					break
				}
			} else {
				// No key available, use estimation
				actualTokens = truncResult.FinalTokens
				break
			}
		} else {
			// Cannot truncate further (only protected messages remain)
			log.Printf("⚠️ [OpenHands-Anthropic] Cannot truncate further - only protected messages remain")
			break
		}
	}

	if transformers.ShouldTruncate(actualTokens, maxTokensAnthropic) {
		log.Printf("🚨 [OpenHands-Anthropic] WARNING: Still over limit after %d truncation attempts (%d > %d tokens)",
			truncationAttempt, actualTokens, maxTokensAnthropic)
	}

	// Serialize modified request
	requestBody, err := json.Marshal(anthropicReq)
	if err != nil {
		log.Printf("❌ [Troll-LLM] Failed to serialize request: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Failed to serialize request"}}`, http.StatusInternalServerError)
		return
	}

	if upstreamModelID != modelID {
		log.Printf("🔀 [Troll-LLM] Model mapping: %s -> %s", modelID, upstreamModelID)
	}

	// PRE-CHECK: Estimate cost and verify user can afford this request BEFORE forwarding
	if username != "" {
		// Estimate input tokens for cost calculation
		estimatedInputTokens := estimateAnthropicInputTokens(&anthropicReq)
		estimatedCost := config.CalculateBillingCostWithCache(modelID, estimatedInputTokens, 0, 0, 0)

		// Check which credit field to use based on billing_upstream
		billingUpstream := config.GetModelBillingUpstream(modelID)

		// Get user balance from appropriate credit field
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var user struct {
			Credits    float64 `bson:"credits"`
			RefCredits float64 `bson:"refCredits"`
			CreditsNew float64 `bson:"creditsNew"`
		}
		err := db.UsersNewCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
		if err != nil {
			log.Printf("❌ Failed to get user %s balance: %v", username, err)
			http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Failed to check balance"}}`, http.StatusInternalServerError)
			return
		}

		var totalBalance float64
		if billingUpstream == "openhands" {
			totalBalance = user.CreditsNew
		} else {
			totalBalance = user.Credits + user.RefCredits
		}

		// Block request if insufficient balance
		if totalBalance < estimatedCost {
			log.Printf("💸 [Pre-Check] [%s] Insufficient balance: estimated=$%.6f > balance=$%.6f (field=%s)", username, estimatedCost, totalBalance, billingUpstream)
			http.Error(w, fmt.Sprintf(`{"type":"error","error":{"type":"insufficient_balance","message":"Insufficient credits. Cost: $%.4f, Balance: $%.4f"}}`, estimatedCost, totalBalance), http.StatusPaymentRequired)
			return
		}
		log.Printf("✅ [Pre-Check] [%s] Balance OK: estimated=$%.6f, balance=$%.6f (field=%s)", username, estimatedCost, totalBalance, billingUpstream)
	}

	log.Printf("📤 [OpenHands-Anthropic] Forwarding /v1/messages (model=%s, stream=%v, key=%s)", upstreamModelID, isStreaming, key.ID)

	// Create HTTP request
	req, err := http.NewRequest(http.MethodPost, "https://llm-proxy.app.all-hands.dev/v1/messages", bytes.NewBuffer(requestBody))
	if err != nil {
		log.Printf("❌ [Troll-LLM] Failed to create request: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Request creation failed"}}`, http.StatusInternalServerError)
		return
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key.APIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	// Send request
	requestStartTime := time.Now()
	resp, err := httpClient.Do(req)
	if err != nil {
		log.Printf("❌ [Troll-LLM] Request failed after %v: %v", time.Since(requestStartTime), err)
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Request to upstream service failed"}}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Check for errors and handle key rotation
	if resp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		errorBody := string(bodyBytes)
		log.Printf("⚠️ [Troll-LLM] Error response (status=%d, key=%s): %s", resp.StatusCode, key.ID, truncateErrorLog(errorBody, 300))

		// Check if this is a rotatable error (budget exceeded, auth error, etc.)
		isBudgetExceeded := strings.Contains(errorBody, "ExceededBudget") ||
			strings.Contains(strings.ToLower(errorBody), "budget_exceeded") ||
			strings.Contains(strings.ToLower(errorBody), "over budget")
		isAuthError := resp.StatusCode == 401 || resp.StatusCode == 403 || resp.StatusCode == 402

		if isBudgetExceeded || isAuthError {
			// Rotate the key
			openhandsPool.CheckAndRotateOnError(key.ID, resp.StatusCode, errorBody)

			// For non-streaming requests, retry with new key
			if !isStreaming {
				newKey, retryErr := openhandsPool.SelectKey()
				if retryErr == nil && newKey.ID != key.ID {
					log.Printf("🔄 [Troll-LLM] Retrying with new key: %s", newKey.ID)

					// Create new request with new key
					retryReq, _ := http.NewRequest(http.MethodPost, "https://llm-proxy.app.all-hands.dev/v1/messages", bytes.NewBuffer(requestBody))
					retryReq.Header.Set("Content-Type", "application/json")
					retryReq.Header.Set("Authorization", "Bearer "+newKey.APIKey)
					retryReq.Header.Set("anthropic-version", "2023-06-01")

					retryResp, retryDoErr := httpClient.Do(retryReq)
					if retryDoErr == nil {
						defer retryResp.Body.Close()
						if retryResp.StatusCode < 400 {
							// Success! Update key for billing and continue to response handling
							key = newKey
							resp = retryResp
							log.Printf("✅ [Troll-LLM] Retry successful with key: %s", newKey.ID)
							goto handleMessagesResponse
						}
						// Retry also failed
						retryBody, _ := io.ReadAll(retryResp.Body)
						log.Printf("❌ [Troll-LLM] Retry also failed (status=%d): %s", retryResp.StatusCode, string(retryBody))
						w.Header().Set("Content-Type", "application/json")
						w.WriteHeader(retryResp.StatusCode)
						w.Write(openhands.SanitizeAnthropicError(retryResp.StatusCode, retryBody))
						return
					}
				}
			}
		}

		// Return sanitized error to client
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(openhands.SanitizeAnthropicError(resp.StatusCode, bodyBytes))
		return
	}

handleMessagesResponse:

	// Usage callback for billing (with cache support)
	onUsage := func(input, output, cacheWrite, cacheHit int64) {
		billingTokens := config.CalculateBillingTokensWithCache(modelID, input, output, cacheWrite, cacheHit)
		billingCost := config.CalculateBillingCostWithCache(modelID, input, output, cacheWrite, cacheHit)

		// Update OpenHands key usage stats in MongoDB
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		db.OpenHandsKeysCollection().UpdateByID(ctx, key.ID, bson.M{
			"$inc": bson.M{
				"tokensUsed":    input + output,
				"requestsCount": 1,
			},
		})

		if userApiKey != "" {
			usage.UpdateUsage(userApiKey, billingTokens)
			creditType := "ohmygpt" // Default
			if username != "" {
				// Check billing_upstream to determine which credit field to deduct from
				// Even though this is OpenHands upstream, billing field depends on config
				billingUpstream := config.GetModelBillingUpstream(modelID)
				if billingUpstream == "openhands" {
					usage.DeductCreditsOpenHands(username, billingCost, billingTokens, input, output)
					creditType = "openhands"
				} else {
					usage.DeductCreditsOhMyGPT(username, billingCost, billingTokens, input, output)
				}
				usage.UpdateFriendKeyUsageIfNeeded(userApiKey, modelID, billingCost)
			}
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequestDetailed(usage.RequestLogParams{
				UserID:           username,
				UserKeyID:        userApiKey,
				TrollKeyID:       "openhands:" + key.ID,
				Model:            modelID,
				InputTokens:      input,
				OutputTokens:     output,
				CacheWriteTokens: cacheWrite,
				CacheHitTokens:   cacheHit,
				CreditsCost:      billingCost,
				CreditType:       creditType,
				TokensUsed:       billingTokens,
				StatusCode:       resp.StatusCode,
				LatencyMs:        latencyMs,
			})
		}
		// Get remaining creditsNew for logging (OpenHands uses creditsNew)
		remainingCredits := 0.0
		if username != "" {
			if creditsNew, err := userkey.GetUserCreditsNew(username); err == nil {
				remainingCredits = creditsNew
			}
		}
		log.Printf("📊 [Troll-LLM] Usage: model=%s in=%d out=%d cache_write=%d cache_hit=%d cost=$%.6f (multiplier=%.2f) remaining=$%.6f", modelID, input, output, cacheWrite, cacheHit, billingCost, config.GetBillingMultiplier(modelID), remainingCredits)
	}

	// Handle response using maintarget handlers (same format as Anthropic)
	if isStreaming {
		maintarget.HandleStreamResponseWithPrefix(w, resp, onUsage, "OpenHands")
	} else {
		maintarget.HandleNonStreamResponseWithPrefix(w, resp, onUsage, "OpenHands")
	}
}

// handleOpenHandsOpenAIRequest handles /v1/chat/completions requests routed to OpenHands
// Forwards OpenAI format request to OpenHands /v1/chat/completions endpoint
func handleOpenHandsOpenAIRequest(w http.ResponseWriter, openaiReq *transformers.OpenAIRequest, bodyBytes []byte, modelID string, userApiKey string, username string) {
	openhandsPool := openhandspool.GetPool()
	if openhandsPool == nil || openhandsPool.GetKeyCount() == 0 {
		http.Error(w, `{"error": {"message": "Service not configured", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	// Select a key from the pool
	key, err := openhandsPool.SelectKey()
	if err != nil {
		log.Printf("❌ [Troll-LLM] No healthy keys available: %v", err)
		http.Error(w, `{"error": {"message": "Service temporarily unavailable. Please try again later.", "type": "server_error"}}`, http.StatusServiceUnavailable)
		return
	}

	// Get upstream model ID and inject system prompt
	upstreamModelID := config.GetUpstreamModelID(modelID)
	openaiReq.Model = upstreamModelID

	// Fix tool-related issues for Anthropic/Claude models
	// 1. If no tools param but messages contain tool_calls/tool messages, strip them
	// 2. Convert tool messages without tool_call_id to user messages
	// 3. Ensure tool_use and tool_result are always in sync (both present or both stripped)
	hasToolsParam := len(openaiReq.Tools) > 0

	// First pass: collect all valid tool_call_ids from assistant messages
	// This ensures we only keep tool results that have matching tool_use blocks
	validToolCallIDs := make(map[string]bool)
	if hasToolsParam {
		for _, msg := range openaiReq.Messages {
			if msg.Role == "assistant" && msg.ToolCalls != nil {
				// ToolCalls is interface{}, need to extract IDs via type assertion
				if toolCalls, ok := msg.ToolCalls.([]interface{}); ok {
					for _, tc := range toolCalls {
						if tcMap, ok := tc.(map[string]interface{}); ok {
							if id, ok := tcMap["id"].(string); ok && id != "" {
								validToolCallIDs[id] = true
							}
						}
					}
				}
			}
		}
	}

	// Second pass: filter and fix messages
	fixedMessages := make([]transformers.OpenAIMessage, 0, len(openaiReq.Messages))

	for _, msg := range openaiReq.Messages {
		if msg.Role == "tool" {
			// Tool result message
			content := ""
			if c, ok := msg.Content.(string); ok {
				content = c
			}

			// Convert to user message if:
			// 1. No tools param, OR
			// 2. Missing tool_call_id, OR
			// 3. tool_call_id doesn't match any tool_use in assistant messages (orphaned result)
			if !hasToolsParam || msg.ToolCallID == "" || !validToolCallIDs[msg.ToolCallID] {
				log.Printf("⚠️ [OpenHands-OpenAI] Converting tool message to user message (hasTools=%v, hasToolCallID=%v, validID=%v)",
					hasToolsParam, msg.ToolCallID != "", validToolCallIDs[msg.ToolCallID])
				fixedMessages = append(fixedMessages, transformers.OpenAIMessage{
					Role:    "user",
					Content: "[Tool Result]\n" + content,
				})
			} else {
				fixedMessages = append(fixedMessages, msg)
			}
		} else if msg.Role == "assistant" && msg.ToolCalls != nil && !hasToolsParam {
			// Assistant message with tool_calls but no tools param - strip tool_calls
			log.Printf("⚠️ [OpenHands-OpenAI] Stripping tool_calls from assistant message (no tools param)")
			content := ""
			if c, ok := msg.Content.(string); ok {
				content = c
			}
			fixedMessages = append(fixedMessages, transformers.OpenAIMessage{
				Role:    "assistant",
				Content: content,
			})
		} else {
			fixedMessages = append(fixedMessages, msg)
		}
	}
	openaiReq.Messages = fixedMessages

	// Claude/Anthropic doesn't allow both temperature and top_p
	// Check the original body and remove top_p if both exist
	var rawRequest map[string]interface{}
	json.Unmarshal(bodyBytes, &rawRequest)
	_, hasTemperature := rawRequest["temperature"]
	_, hasTopP := rawRequest["top_p"]
	removeTopP := hasTemperature && hasTopP
	if removeTopP {
		log.Printf("⚠️ [OpenHands-OpenAI] Removing top_p - Claude doesn't allow both temperature and top_p")
		openaiReq.TopP = 0 // Reset to zero value, will be omitempty
	}

	// Inject and merge system prompt (OpenAI format uses system message)
	configSystemPrompt := config.GetSystemPrompt()
	if configSystemPrompt != "" {
		// Check if there's already a system message
		var existingSystemContent string
		foundSystemIndex := -1

		for i, msg := range openaiReq.Messages {
			if msg.Role == "system" {
				if content, ok := msg.Content.(string); ok {
					existingSystemContent = content
					foundSystemIndex = i
					break
				}
			}
		}

		// Merge: config prompt first, then user's system message
		mergedSystemContent := configSystemPrompt
		if existingSystemContent != "" {
			mergedSystemContent = configSystemPrompt + "\n\n" + sanitizeBlockedContent(existingSystemContent)
			log.Printf("✅ [OpenHands-OpenAI] Merged system prompts (config: %d chars, user: %d chars)", len(configSystemPrompt), len(existingSystemContent))
			// Remove existing system message, we'll add merged one at the beginning
			openaiReq.Messages = append(openaiReq.Messages[:foundSystemIndex], openaiReq.Messages[foundSystemIndex+1:]...)
		} else {
			log.Printf("✅ [OpenHands-OpenAI] Injected config system prompt (%d chars)", len(configSystemPrompt))
		}

		// Insert merged system message at the beginning
		systemMessage := transformers.OpenAIMessage{
			Role:    "system",
			Content: mergedSystemContent,
		}
		openaiReq.Messages = append([]transformers.OpenAIMessage{systemMessage}, openaiReq.Messages...)
	}

	// AUTO-TRUNCATE: Check if request exceeds token limit and truncate if needed
	// First, try to get accurate token count from API (call_endpoint=true)
	maxTokens := transformers.GetModelMaxTokens(upstreamModelID)
	estimatedTokens := transformers.EstimateOpenAITokens(openaiReq)

	// Try to get accurate token count from /utils/token_counter API
	var actualTokens int64 = estimatedTokens
	if key != nil && estimatedTokens > maxTokens-10000 { // Only call API if close to limit
		// Convert OpenAI messages to map format for token counting API
		messagesForCount := make([]map[string]interface{}, 0, len(openaiReq.Messages))
		for _, msg := range openaiReq.Messages {
			msgMap := map[string]interface{}{
				"role":    msg.Role,
				"content": msg.Content,
			}
			if msg.ToolCallID != "" {
				msgMap["tool_call_id"] = msg.ToolCallID
			}
			if msg.ToolCalls != nil {
				msgMap["tool_calls"] = msg.ToolCalls
			}
			messagesForCount = append(messagesForCount, msgMap)
		}

		// Call token counter API with call_endpoint=true for accurate count
		apiTokens, err := openhands.CountTokensViaAPI(openhands.OpenHandsBaseURL, key.APIKey, upstreamModelID, messagesForCount, true)
		if err == nil && apiTokens > 0 {
			actualTokens = apiTokens
			log.Printf("📊 [TokenCount-OpenAI] API accurate count: %d tokens (estimated: %d)", actualTokens, estimatedTokens)
		} else if err != nil {
			log.Printf("⚠️ [TokenCount-OpenAI] API call failed, using estimation: %v", err)
		}
	}

	// Truncation loop: Keep truncating until under limit (with API verification)
	maxTruncationAttempts := 5
	truncationAttempt := 0
	for transformers.ShouldTruncate(actualTokens, maxTokens) && truncationAttempt < maxTruncationAttempts {
		truncationAttempt++
		log.Printf("⚠️ [OpenHands-OpenAI] Attempt %d: Request exceeds limit (%d > %d tokens), auto-truncating...",
			truncationAttempt, actualTokens, maxTokens)

		truncatedReq, truncResult := transformers.TruncateOpenAIRequest(openaiReq, maxTokens)
		if truncResult.WasTruncated {
			openaiReq = truncatedReq
			log.Printf("✂️ [OpenHands-OpenAI] Truncated: removed %d messages, %d -> %d tokens (estimated)",
				truncResult.MessagesRemoved, truncResult.OriginalTokens, truncResult.FinalTokens)

			// Re-verify with API after truncation to ensure we're actually under limit
			if key != nil {
				// Rebuild messages for count
				messagesForRecount := make([]map[string]interface{}, 0, len(openaiReq.Messages))
				for _, msg := range openaiReq.Messages {
					msgMap := map[string]interface{}{
						"role":    msg.Role,
						"content": msg.Content,
					}
					if msg.ToolCallID != "" {
						msgMap["tool_call_id"] = msg.ToolCallID
					}
					if msg.ToolCalls != nil {
						msgMap["tool_calls"] = msg.ToolCalls
					}
					messagesForRecount = append(messagesForRecount, msgMap)
				}

				// Call API to verify actual token count after truncation
				verifyTokens, verifyErr := openhands.CountTokensViaAPI(openhands.OpenHandsBaseURL, key.APIKey, upstreamModelID, messagesForRecount, true)
				if verifyErr == nil && verifyTokens > 0 {
					actualTokens = verifyTokens
					log.Printf("📊 [TokenCount-OpenAI] Post-truncation verify: %d tokens (limit: %d)", actualTokens, maxTokens)
				} else {
					// If API fails, use estimation and break to avoid infinite loop
					actualTokens = truncResult.FinalTokens
					log.Printf("⚠️ [TokenCount-OpenAI] Post-truncation API failed, using estimate: %d tokens", actualTokens)
					break
				}
			} else {
				// No key available, use estimation
				actualTokens = truncResult.FinalTokens
				break
			}
		} else {
			// Cannot truncate further (only protected messages remain)
			log.Printf("⚠️ [OpenHands-OpenAI] Cannot truncate further - only protected messages remain")
			break
		}
	}

	if transformers.ShouldTruncate(actualTokens, maxTokens) {
		log.Printf("🚨 [OpenHands-OpenAI] WARNING: Still over limit after %d truncation attempts (%d > %d tokens)",
			truncationAttempt, actualTokens, maxTokens)
	}

	// Serialize modified request
	requestBody, err := json.Marshal(openaiReq)
	if err != nil {
		log.Printf("❌ [OpenHands-OpenAI] Failed to serialize request: %v", err)
		http.Error(w, `{"error": {"message": "Failed to serialize request", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	if upstreamModelID != modelID {
		log.Printf("🔀 [OpenHands-OpenAI] Model mapping: %s -> %s", modelID, upstreamModelID)
	}

	// PRE-CHECK: Estimate cost and verify user can afford this request BEFORE forwarding
	if username != "" {
		// Estimate input tokens for cost calculation
		estimatedInputTokens := estimateInputTokens(openaiReq)
		estimatedCost := config.CalculateBillingCostWithCache(modelID, estimatedInputTokens, 0, 0, 0)

		// Check which credit field to use based on billing_upstream
		billingUpstream := config.GetModelBillingUpstream(modelID)

		// Get user balance from appropriate credit field
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var user struct {
			Credits    float64 `bson:"credits"`
			RefCredits float64 `bson:"refCredits"`
			CreditsNew float64 `bson:"creditsNew"`
		}
		err := db.UsersNewCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
		if err != nil {
			log.Printf("❌ Failed to get user %s balance: %v", username, err)
			http.Error(w, `{"error": {"message": "Failed to check balance", "type": "server_error"}}`, http.StatusInternalServerError)
			return
		}

		var totalBalance float64
		if billingUpstream == "openhands" {
			totalBalance = user.CreditsNew
		} else {
			totalBalance = user.Credits + user.RefCredits
		}

		// Block request if insufficient balance
		if totalBalance < estimatedCost {
			log.Printf("💸 [Pre-Check] [%s] Insufficient balance: estimated=$%.6f > balance=$%.6f (field=%s)", username, estimatedCost, totalBalance, billingUpstream)
			http.Error(w, fmt.Sprintf(`{"error": {"message": "Insufficient credits. Cost: $%.4f, Balance: $%.4f", "type": "insufficient_balance"}}`, estimatedCost, totalBalance), http.StatusPaymentRequired)
			return
		}
		log.Printf("✅ [Pre-Check] [%s] Balance OK: estimated=$%.6f, balance=$%.6f (field=%s)", username, estimatedCost, totalBalance, billingUpstream)
	}

	isStreaming := openaiReq.Stream
	log.Printf("📤 [OpenHands-OpenAI] Forwarding /v1/chat/completions (model=%s, stream=%v, key=%s)", upstreamModelID, isStreaming, key.ID)

	// Create HTTP request
	req, err := http.NewRequest(http.MethodPost, "https://llm-proxy.app.all-hands.dev/v1/chat/completions", bytes.NewBuffer(requestBody))
	if err != nil {
		log.Printf("❌ [Troll-LLM] Failed to create request: %v", err)
		http.Error(w, `{"error": {"message": "Request creation failed", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key.APIKey)

	// Send request
	requestStartTime := time.Now()
	resp, err := httpClient.Do(req)
	if err != nil {
		log.Printf("❌ [Troll-LLM] Request failed after %v: %v", time.Since(requestStartTime), err)
		http.Error(w, `{"error": {"message": "Request to upstream service failed", "type": "upstream_error"}}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Check for errors and handle key rotation
	if resp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		errorBody := string(bodyBytes)
		log.Printf("⚠️ [Troll-LLM] Error response (status=%d, key=%s): %s", resp.StatusCode, key.ID, truncateErrorLog(errorBody, 300))

		// Check if this is a rotatable error (budget exceeded, auth error, etc.)
		isBudgetExceeded := strings.Contains(errorBody, "ExceededBudget") ||
			strings.Contains(strings.ToLower(errorBody), "budget_exceeded") ||
			strings.Contains(strings.ToLower(errorBody), "over budget")
		isAuthError := resp.StatusCode == 401 || resp.StatusCode == 403 || resp.StatusCode == 402

		if isBudgetExceeded || isAuthError {
			// Rotate the key
			openhandsPool.CheckAndRotateOnError(key.ID, resp.StatusCode, errorBody)

			// For non-streaming requests, retry with new key
			if !isStreaming {
				newKey, retryErr := openhandsPool.SelectKey()
				if retryErr == nil && newKey.ID != key.ID {
					log.Printf("🔄 [OpenHands-OpenAI] Retrying with new key: %s", newKey.ID)

					// Create new request with new key
					retryReq, _ := http.NewRequest(http.MethodPost, "https://llm-proxy.app.all-hands.dev/v1/chat/completions", bytes.NewBuffer(requestBody))
					retryReq.Header.Set("Content-Type", "application/json")
					retryReq.Header.Set("Authorization", "Bearer "+newKey.APIKey)

					retryResp, retryDoErr := httpClient.Do(retryReq)
					if retryDoErr == nil {
						defer retryResp.Body.Close()
						if retryResp.StatusCode < 400 {
							// Success! Update key for billing and continue to response handling
							key = newKey
							resp = retryResp
							log.Printf("✅ [OpenHands-OpenAI] Retry successful with key: %s", newKey.ID)
							goto handleOpenAIResponse
						}
						// Retry also failed
						retryBody, _ := io.ReadAll(retryResp.Body)
						log.Printf("❌ [OpenHands-OpenAI] Retry also failed (status=%d): %s", retryResp.StatusCode, string(retryBody))
						w.Header().Set("Content-Type", "application/json")
						w.WriteHeader(retryResp.StatusCode)
						w.Write(openhands.SanitizeError(retryResp.StatusCode, retryBody))
						return
					}
				}
			}
		}

		// Return sanitized error to client
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(openhands.SanitizeError(resp.StatusCode, bodyBytes))
		return
	}

handleOpenAIResponse:

	// Usage callback for billing (with cache support)
	onUsage := func(input, output, cacheWrite, cacheHit int64) {
		billingTokens := config.CalculateBillingTokensWithCache(modelID, input, output, cacheWrite, cacheHit)
		billingCost := config.CalculateBillingCostWithCache(modelID, input, output, cacheWrite, cacheHit)

		// Update OpenHands key usage stats in MongoDB
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		db.OpenHandsKeysCollection().UpdateByID(ctx, key.ID, bson.M{
			"$inc": bson.M{
				"tokensUsed":    input + output,
				"requestsCount": 1,
			},
		})

		if userApiKey != "" {
			usage.UpdateUsage(userApiKey, billingTokens)
			creditType := "ohmygpt" // Default
			if username != "" {
				// Check billing_upstream to determine which credit field to deduct from
				// Even though this is OpenHands upstream, billing field depends on config
				billingUpstream := config.GetModelBillingUpstream(modelID)
				if billingUpstream == "openhands" {
					usage.DeductCreditsOpenHands(username, billingCost, billingTokens, input, output)
					creditType = "openhands"
				} else {
					usage.DeductCreditsOhMyGPT(username, billingCost, billingTokens, input, output)
				}
				usage.UpdateFriendKeyUsageIfNeeded(userApiKey, modelID, billingCost)
			}
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequestDetailed(usage.RequestLogParams{
				UserID:           username,
				UserKeyID:        userApiKey,
				TrollKeyID:       "openhands:" + key.ID,
				Model:            modelID,
				InputTokens:      input,
				OutputTokens:     output,
				CacheWriteTokens: cacheWrite,
				CacheHitTokens:   cacheHit,
				CreditsCost:      billingCost,
				CreditType:       creditType,
				TokensUsed:       billingTokens,
				StatusCode:       resp.StatusCode,
				LatencyMs:        latencyMs,
			})
		}
		// Get remaining creditsNew for logging (OpenHands uses creditsNew)
		remainingCredits := 0.0
		if username != "" {
			if creditsNew, err := userkey.GetUserCreditsNew(username); err == nil {
				remainingCredits = creditsNew
			}
		}
		log.Printf("📊 [Troll-LLM] Usage: model=%s in=%d out=%d cache_write=%d cache_hit=%d cost=$%.6f (multiplier=%.2f) remaining=$%.6f", modelID, input, output, cacheWrite, cacheHit, billingCost, config.GetBillingMultiplier(modelID), remainingCredits)
	}

	// Estimate input tokens from request (rough: 1 token ≈ 4 chars)
	// This is needed because OpenHands doesn't return usage in streaming mode
	estimatedInput := estimateInputTokens(openaiReq)

	// Handle response (OpenHands /v1/chat/completions returns OpenAI-compatible format)
	if isStreaming {
		handleOpenHandsOpenAIStreamResponse(w, resp, onUsage, estimatedInput)
	} else {
		handleOpenHandsOpenAINonStreamResponse(w, resp, onUsage)
	}
}

// estimateInputTokens estimates input tokens from OpenAI request
// Uses rough estimation: 1 token ≈ 4 characters
func estimateInputTokens(req *transformers.OpenAIRequest) int64 {
	var totalChars int64

	// Count characters in all messages
	for _, msg := range req.Messages {
		// Add role chars
		totalChars += int64(len(msg.Role))

		// Add content chars
		if content, ok := msg.Content.(string); ok {
			totalChars += int64(len(content))
		}
	}

	// Rough estimation: 1 token ≈ 4 chars
	estimatedTokens := totalChars / 4

	// Add overhead for message structure (rough estimate)
	estimatedTokens += int64(len(req.Messages) * 4)

	return estimatedTokens
}

// estimateAnthropicInputTokens estimates input tokens for Anthropic requests
func estimateAnthropicInputTokens(req *transformers.AnthropicRequest) int64 {
	var totalChars int64

	// Count system prompt chars
	if req.System != nil {
		if systemArray, ok := req.System.([]interface{}); ok {
			for _, item := range systemArray {
				if itemMap, ok := item.(map[string]interface{}); ok {
					if text, ok := itemMap["text"].(string); ok {
						totalChars += int64(len(text))
					}
				}
			}
		} else if systemStr, ok := req.System.(string); ok {
			totalChars += int64(len(systemStr))
		}
	}

	// Count characters in all messages
	for _, msg := range req.Messages {
		// Add role chars
		totalChars += int64(len(msg.Role))

		// Add content chars (can be string or array)
		if content, ok := msg.Content.(string); ok {
			totalChars += int64(len(content))
		} else if contentArray, ok := msg.Content.([]interface{}); ok {
			for _, item := range contentArray {
				if itemMap, ok := item.(map[string]interface{}); ok {
					if text, ok := itemMap["text"].(string); ok {
						totalChars += int64(len(text))
					}
				}
			}
		}
	}

	// Rough estimation: 1 token ≈ 4 chars
	estimatedTokens := totalChars / 4

	// Add overhead for message structure (rough estimate)
	estimatedTokens += int64(len(req.Messages) * 4)

	return estimatedTokens
}

// handleOpenHandsOpenAIStreamResponse handles OpenHands streaming response with proper logging
func handleOpenHandsOpenAIStreamResponse(w http.ResponseWriter, resp *http.Response, onUsage func(input, output, cacheWrite, cacheHit int64), estimatedInputTokens int64) {
	// Wrap onUsage to inject estimated input tokens if not provided by stream
	wrappedOnUsage := func(input, output, cacheWrite, cacheHit int64) {
		// If stream doesn't provide input tokens, use estimation
		if input == 0 && estimatedInputTokens > 0 {
			input = estimatedInputTokens
			log.Printf("⚠️ [OpenHands-OpenAI] Using estimated input tokens: %d (stream provided 0)", input)
		}
		log.Printf("📊 [OpenHands-OpenAI] Stream usage: in=%d out=%d cache_write=%d cache_hit=%d", input, output, cacheWrite, cacheHit)
		if onUsage != nil {
			onUsage(input, output, cacheWrite, cacheHit)
		}
	}

	maintarget.HandleOpenAIStreamResponse(w, resp, wrappedOnUsage)
}

// handleOpenHandsOpenAINonStreamResponse handles OpenHands non-streaming response with proper logging
func handleOpenHandsOpenAINonStreamResponse(w http.ResponseWriter, resp *http.Response, onUsage func(input, output, cacheWrite, cacheHit int64)) {
	log.Printf("📋 [OpenHands-OpenAI] Handling non-streaming response")

	// Wrap onUsage to add OpenHands-specific logging
	wrappedOnUsage := func(input, output, cacheWrite, cacheHit int64) {
		log.Printf("📊 [OpenHands-OpenAI] Non-stream usage: in=%d out=%d cache_write=%d cache_hit=%d", input, output, cacheWrite, cacheHit)
		if onUsage != nil {
			onUsage(input, output, cacheWrite, cacheHit)
		}
	}

	maintarget.HandleOpenAINonStreamResponse(w, resp, wrappedOnUsage)
}

// handleOhMyGPTOpenAIRequest handles /v1/chat/completions requests routed to OhMyGPT
func handleOhMyGPTOpenAIRequest(w http.ResponseWriter, openaiReq *transformers.OpenAIRequest, bodyBytes []byte, modelID string, userApiKey string, username string) {
	ohmygptProvider := ohmygpt.GetOhMyGPT()
	if ohmygptProvider == nil || !ohmygptProvider.IsConfigured() {
		http.Error(w, `{"error": {"message": "Service not configured", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	// Get upstream model ID and inject system prompt
	upstreamModelID := config.GetUpstreamModelID(modelID)
	openaiReq.Model = upstreamModelID

	// Serialize request
	requestBody, err := json.Marshal(openaiReq)
	if err != nil {
		log.Printf("❌ [OhMyGPT-OpenAI] Failed to serialize request: %v", err)
		http.Error(w, `{"error": {"message": "Failed to serialize request", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	isStreaming := openaiReq.Stream
	log.Printf("📤 [OhMyGPT-OpenAI] Forwarding /v1/chat/completions (model=%s, stream=%v)", upstreamModelID, isStreaming)

	// Track request start time for latency measurement
	requestStartTime := time.Now()

	// Forward request using OhMyGPT provider
	resp, err := ohmygptProvider.ForwardRequest(requestBody, isStreaming)
	if err != nil {
		log.Printf("❌ [OhMyGPT-OpenAI] Request failed after %v: %v", time.Since(requestStartTime), err)
		http.Error(w, `{"error": {"message": "Request to upstream service failed", "type": "upstream_error"}}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Usage callback for billing and logging
	onUsage := func(input, output, cacheWrite, cacheHit int64) {
		billingTokens := config.CalculateBillingTokensWithCache(modelID, input, output, cacheWrite, cacheHit)
		billingCost := config.CalculateBillingCostWithCache(modelID, input, output, cacheWrite, cacheHit)

		// Get OhMyGPT key ID for logging
		factoryKeyID := ohmygptProvider.GetLastUsedKeyID()

		// Update OhMyGPT key usage stats in MongoDB
		if factoryKeyID != "" {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			db.OhMyGPTKeysCollection().UpdateByID(ctx, factoryKeyID, bson.M{
				"$inc": bson.M{
					"tokensUsed":    input + output,
					"requestsCount": 1,
				},
			})
		}

		if userApiKey != "" {
			usage.UpdateUsage(userApiKey, billingTokens)
			if username != "" {
				usage.DeductCreditsOhMyGPT(username, billingCost, billingTokens, input, output)
				usage.UpdateFriendKeyUsageIfNeeded(userApiKey, modelID, billingCost)
			}
			// Log request to request_logs collection
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequestDetailed(usage.RequestLogParams{
				UserID:           username,
				UserKeyID:        userApiKey,
				FactoryKeyID:     factoryKeyID,
				Model:            modelID,
				InputTokens:      input,
				OutputTokens:     output,
				CacheWriteTokens: cacheWrite,
				CacheHitTokens:   cacheHit,
				CreditsCost:      billingCost,
				CreditType:       "ohmygpt",
				TokensUsed:       billingTokens,
				StatusCode:       resp.StatusCode,
				LatencyMs:        latencyMs,
			})
		}
	}

	// Handle response
	if isStreaming {
		ohmygptProvider.HandleStreamResponse(w, resp, modelID, onUsage)
	} else {
		ohmygptProvider.HandleNonStreamResponse(w, resp, modelID, onUsage)
	}
}

// handleOhMyGPTMessagesRequest handles /v1/messages requests routed to OhMyGPT Provider
// Forwards Anthropic format request to OhMyGPT /v1/messages endpoint
func handleOhMyGPTMessagesRequest(w http.ResponseWriter, originalBody []byte, isStreaming bool, modelID string, userApiKey string, username string) {
	ohmygptProvider := ohmygpt.GetOhMyGPT()
	if ohmygptProvider == nil || !ohmygptProvider.IsConfigured() {
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Service not configured"}}`, http.StatusInternalServerError)
		return
	}

	// Get upstream model ID (may be different from client-requested model ID)
	upstreamModelID := config.GetUpstreamModelID(modelID)

	// Parse original body as raw JSON to preserve all fields
	var rawRequest map[string]interface{}
	if err := json.Unmarshal(originalBody, &rawRequest); err != nil {
		log.Printf("❌ [OhMyGPT-Anthropic] Failed to parse request: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"invalid_request_error","message":"Invalid JSON"}}`, http.StatusBadRequest)
		return
	}

	// Update model ID in the raw request
	rawRequest["model"] = upstreamModelID

	// Check if messages exists and is not empty
	if messages, ok := rawRequest["messages"].([]interface{}); !ok || len(messages) == 0 {
		log.Printf("❌ [OhMyGPT-Anthropic] Messages array is empty or missing in request")
		http.Error(w, `{"type":"error","error":{"type":"invalid_request_error","message":"Messages array cannot be empty"}}`, http.StatusBadRequest)
		return
	}

	// Serialize the raw request (preserves all original fields including complex content types)
	requestBody, err := json.Marshal(rawRequest)
	if err != nil {
		log.Printf("❌ [OhMyGPT-Anthropic] Failed to serialize request: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Failed to serialize request"}}`, http.StatusInternalServerError)
		return
	}

	if upstreamModelID != modelID {
		log.Printf("🔀 [OhMyGPT-Anthropic] Model mapping: %s -> %s", modelID, upstreamModelID)
	}

	log.Printf("📤 [OhMyGPT-Anthropic] Forwarding /v1/messages (model=%s, stream=%v)", upstreamModelID, isStreaming)

	// Track request start time for latency measurement
	requestStartTime := time.Now()

	// Forward request using OhMyGPT messages endpoint
	resp, err := ohmygptProvider.ForwardMessagesRequest(requestBody, isStreaming)
	if err != nil {
		log.Printf("❌ [OhMyGPT-Anthropic] Request failed after %v: %v", time.Since(requestStartTime), err)
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Request to upstream service failed"}}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Usage callback for billing and logging
	onUsage := func(input, output, cacheWrite, cacheHit int64) {
		billingTokens := config.CalculateBillingTokensWithCache(modelID, input, output, cacheWrite, cacheHit)
		billingCost := config.CalculateBillingCostWithCache(modelID, input, output, cacheWrite, cacheHit)

		// Get OhMyGPT key ID for logging
		factoryKeyID := ohmygptProvider.GetLastUsedKeyID()

		// Update OhMyGPT key usage stats in MongoDB
		if factoryKeyID != "" {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			db.OhMyGPTKeysCollection().UpdateByID(ctx, factoryKeyID, bson.M{
				"$inc": bson.M{
					"tokensUsed":    input + output,
					"requestsCount": 1,
				},
			})
		}

		if userApiKey != "" {
			usage.UpdateUsage(userApiKey, billingTokens)
			if username != "" {
				usage.DeductCreditsOhMyGPT(username, billingCost, billingTokens, input, output)
				usage.UpdateFriendKeyUsageIfNeeded(userApiKey, modelID, billingCost)
			}
			// Log request to request_logs collection
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequestDetailed(usage.RequestLogParams{
				UserID:           username,
				UserKeyID:        userApiKey,
				FactoryKeyID:     factoryKeyID,
				Model:            modelID,
				InputTokens:      input,
				OutputTokens:     output,
				CacheWriteTokens: cacheWrite,
				CacheHitTokens:   cacheHit,
				CreditsCost:      billingCost,
				CreditType:       "ohmygpt",
				TokensUsed:       billingTokens,
				StatusCode:       resp.StatusCode,
				LatencyMs:        latencyMs,
			})
		}

		// Check for cache fallback and record event
		if detector := cache.GetCacheDetector(); detector != nil && detector.IsEnabled() {
			detector.RecordEvent(modelID, input, cacheHit, cacheWrite)
		}
	}

	// Handle response (OhMyGPT /v1/messages returns Anthropic-compatible format)
	if isStreaming {
		ohmygptProvider.HandleStreamResponse(w, resp, modelID, onUsage)
	} else {
		ohmygptProvider.HandleNonStreamResponse(w, resp, modelID, onUsage)
	}
}

// Handle TrollOpenAI type request
func handleTrollOpenAIRequest(w http.ResponseWriter, r *http.Request, openaiReq *transformers.OpenAIRequest, model *config.Model, authHeader string, selectedProxy *proxy.Proxy, userApiKey string, trollKeyID string, username string, bodyBytes []byte) {
	// Transform request
	trollReq := transformers.TransformToTrollOpenAI(openaiReq)

	// Get endpoint
	endpoint := config.GetEndpointByType("openai")
	if endpoint == nil {
		http.Error(w, `{"error": {"message": "OpenAI endpoint not configured", "type": "configuration_error"}}`, http.StatusInternalServerError)
		return
	}

	// Serialize request
	reqBody, err := json.Marshal(trollReq)
	if err != nil {
		log.Printf("Error: failed to serialize request: %v", err)
		http.Error(w, `{"error": {"message": "Failed to serialize request", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	// Create HTTP request
	proxyReq, err := http.NewRequest(http.MethodPost, endpoint.BaseURL, bytes.NewBuffer(reqBody))
	if err != nil {
		log.Printf("Error: failed to create request: %v", err)
		http.Error(w, `{"error": {"message": "Failed to create request", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	// Set request headers
	clientHeaders := extractClientHeaders(r)
	headers := transformers.GetTrollOpenAIHeaders(authHeader, clientHeaders)
	for key, value := range headers {
		proxyReq.Header.Set(key, value)
	}

	// Debug mode: save request to file
	if debugMode && proxyReq.Body != nil {
		bodyBytes, _ := io.ReadAll(proxyReq.Body)
		proxyReq.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		timestamp := time.Now().Format("20060102_150405")
		requestFile := fmt.Sprintf("request_openai_%s.json", timestamp)
		if err := os.WriteFile(requestFile, bodyBytes, 0644); err == nil {
			log.Printf("💾 Complete request saved to: %s", requestFile)
		}
	}

	// Send request (using proxy client if selected, otherwise global client)
	client := httpClient
	if selectedProxy != nil {
		proxyClient, err := proxyPool.CreateHTTPClientWithProxy(selectedProxy)
		if err != nil {
			// SECURITY: Do NOT fallback to direct - would expose server IP
			log.Printf("❌ Failed to create proxy client (no fallback): %v", err)
			http.Error(w, `{"error": {"message": "Proxy unavailable", "type": "server_error"}}`, http.StatusServiceUnavailable)
			return
		}
		client = proxyClient
	}

	// Track request start time for latency measurement
	requestStartTime := time.Now()

	resp, err := doRequestWithRetry(client, proxyReq, reqBody)
	if err != nil {
		log.Printf("Error: request failed after retries: %v", err)
		http.Error(w, `{"error": {"message": "Request to upstream failed", "type": "upstream_error"}}`, http.StatusBadGateway)
		return
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			log.Printf("Warning: failed to close response body: %v", err)
		}
	}()

	if debugMode {
		log.Printf("📥 TrollOpenAI response: %d", resp.StatusCode)
	}

	// Handle response
	if openaiReq.Stream {
		// Streaming response
		handleTrollOpenAIStreamResponse(w, resp, model.ID, userApiKey, trollKeyID, requestStartTime, username)
	} else {
		// Non-streaming response
		handleTrollOpenAINonStreamResponse(w, resp, model.ID, userApiKey, trollKeyID, requestStartTime, username)
	}
}

// sanitizeError returns a generic error message without revealing upstream details (OpenAI format)
// Story 4.1: Added "code" field to all error responses for OpenAI SDK compatibility
func sanitizeError(statusCode int, originalError []byte) []byte {
	log.Printf("🔒 [GoProxy] Original error (hidden): %s", truncateErrorLog(string(originalError), 300))
	switch statusCode {
	case 400:
		return []byte(`{"error":{"message":"Bad request","type":"invalid_request_error","code":"invalid_request_error"}}`)
	case 401:
		return []byte(`{"error":{"message":"Authentication failed","type":"authentication_error","code":"invalid_api_key"}}`)
	case 402:
		return []byte(`{"error":{"message":"Insufficient credits. Please purchase credits to continue.","type":"insufficient_quota","code":"insufficient_credits"}}`)
	case 403:
		return []byte(`{"error":{"message":"Access denied","type":"permission_error","code":"permission_denied"}}`)
	case 404:
		return []byte(`{"error":{"message":"Resource not found","type":"not_found_error","code":"not_found"}}`)
	case 429:
		return []byte(`{"error":{"message":"Rate limit exceeded","type":"rate_limit_error","code":"rate_limit_exceeded"}}`)
	case 500, 502, 503, 504:
		return []byte(`{"error":{"message":"Upstream service unavailable","type":"server_error","code":"server_error"}}`)
	default:
		return []byte(`{"error":{"message":"Request failed","type":"api_error","code":"api_error"}}`)
	}
}

// sanitizeAnthropicError returns a generic error message in Anthropic format
func sanitizeAnthropicError(statusCode int, originalError []byte) []byte {
	log.Printf("🔒 [GoProxy] Original error (hidden): %s", truncateErrorLog(string(originalError), 300))
	switch statusCode {
	case 400:
		return []byte(`{"type":"error","error":{"type":"invalid_request_error","message":"Bad request"}}`)
	case 401:
		return []byte(`{"type":"error","error":{"type":"authentication_error","message":"Authentication failed"}}`)
	case 402:
		// Story 4.2: Use insufficient_credits type for payment required errors
		return []byte(`{"type":"error","error":{"type":"insufficient_credits","message":"Insufficient credits. Please purchase credits to continue."}}`)
	case 403:
		return []byte(`{"type":"error","error":{"type":"permission_error","message":"Access denied"}}`)
	case 404:
		return []byte(`{"type":"error","error":{"type":"not_found_error","message":"Resource not found"}}`)
	case 429:
		return []byte(`{"type":"error","error":{"type":"rate_limit_error","message":"Rate limit exceeded"}}`)
	case 500, 502, 503, 504:
		return []byte(`{"type":"error","error":{"type":"api_error","message":"Upstream service unavailable"}}`)
	default:
		return []byte(`{"type":"error","error":{"type":"api_error","message":"Request failed"}}`)
	}
}

// Handle Anthropic non-streaming response
func handleAnthropicNonStreamResponse(w http.ResponseWriter, resp *http.Response, modelID string, userApiKey string, trollKeyID string, requestStartTime time.Time, username string) {
	// Read response body (automatically handle gzip)
	body, err := readResponseBody(resp)
	if err != nil {
		log.Printf("Error: failed to read response: %v", err)
		http.Error(w, `{"error": {"message": "Failed to read response", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	if resp.StatusCode != http.StatusOK {
		// Log failed request for analytics
		if userApiKey != "" {
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequest(userApiKey, trollKeyID, 0, resp.StatusCode, latencyMs)
		}
		// Sanitize and forward error response (hide upstream details)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		if _, err := w.Write(sanitizeError(resp.StatusCode, body)); err != nil {
			log.Printf("Error: failed to write error response: %v", err)
		}
		return
	}

	// Parse Anthropic response
	var anthropicResp map[string]interface{}
	if err := json.Unmarshal(body, &anthropicResp); err != nil {
		log.Printf("Error: failed to parse response: %v", err)
		log.Printf("Raw response content: %s", string(body))
		http.Error(w, `{"error": {"message": "Failed to parse response", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	if debugMode {
		log.Printf("📋 Parsed Anthropic response successfully")
		log.Printf("📋 Response keys: %v", getMapKeys(anthropicResp))
	}

	// Extract and track token usage
	if usageData, ok := anthropicResp["usage"].(map[string]interface{}); ok {
		inputTokens := int64(0)
		outputTokens := int64(0)
		cacheWriteTokens := int64(0)
		cacheHitTokens := int64(0)
		if it, ok := usageData["input_tokens"].(float64); ok {
			inputTokens = int64(it)
		}
		if ot, ok := usageData["output_tokens"].(float64); ok {
			outputTokens = int64(ot)
		}
		if cwt, ok := usageData["cache_creation_input_tokens"].(float64); ok {
			cacheWriteTokens = int64(cwt)
		}
		if cht, ok := usageData["cache_read_input_tokens"].(float64); ok {
			cacheHitTokens = int64(cht)
		}
		billingTokens := config.CalculateBillingTokensWithCache(modelID, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens)
		billingCost := config.CalculateBillingCostWithCache(modelID, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens)

		// Update user usage in database
		if userApiKey != "" {
			if err := usage.UpdateUsage(userApiKey, billingTokens); err != nil {
				log.Printf("⚠️ Failed to update usage: %v", err)
			} else if debugMode {
				inputPrice, outputPrice := config.GetModelPricing(modelID)
				cacheWritePrice, cacheHitPrice := config.GetModelCachePricing(modelID)
				log.Printf("📊 Updated usage: in=%d out=%d cache_write=%d cache_hit=%d, billing=%d (price: $%.2f/$%.2f/$%.2f/$%.2f/MTok)",
					inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens, billingTokens, inputPrice, outputPrice, cacheWritePrice, cacheHitPrice)
			}
			// Deduct credits and update tokensUsed for user
			if username != "" {
				if err := usage.DeductCreditsWithCache(username, billingCost, billingTokens, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens); err != nil {
					log.Printf("⚠️ Failed to update user: %v", err)
				} else if debugMode {
					log.Printf("💰 Deducted $%.6f, used %d tokens for user %s", billingCost, billingTokens, username)
				}
				// Update Friend Key usage if applicable
				usage.UpdateFriendKeyUsageIfNeeded(userApiKey, modelID, billingCost)
			}
			// Log request for analytics (include latency)
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequestDetailed(usage.RequestLogParams{
				UserID:           username,
				UserKeyID:        userApiKey,
				TrollKeyID:       trollKeyID,
				Model:            modelID,
				InputTokens:      inputTokens,
				OutputTokens:     outputTokens,
				CacheWriteTokens: cacheWriteTokens,
				CacheHitTokens:   cacheHitTokens,
				CreditsCost:      billingCost,
				CreditType:       "ohmygpt",
				TokensUsed:       billingTokens,
				StatusCode:       resp.StatusCode,
				LatencyMs:        latencyMs,
			})
		}
	}

	// Transform to OpenAI format
	transformer := transformers.NewAnthropicResponseTransformer(modelID, "")
	openaiResp, err := transformer.TransformNonStreamResponse(anthropicResp)
	if err != nil {
		log.Printf("Error: failed to transform response: %v", err)
		http.Error(w, `{"error": {"message": "Failed to transform response", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	if debugMode {
		log.Printf("✅ Transformed to OpenAI format successfully")
	}

	// Return OpenAI format response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(openaiResp); err != nil {
		log.Printf("Error: failed to encode response: %v", err)
	}
}

// Handle Anthropic streaming response
func handleAnthropicStreamResponse(w http.ResponseWriter, resp *http.Response, modelID string, userApiKey string, trollKeyID string, requestStartTime time.Time, username string) {
	// Handle error responses from upstream
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		// Log failed request for analytics
		if userApiKey != "" {
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequest(userApiKey, trollKeyID, 0, resp.StatusCode, latencyMs)
		}
		// Check if key needs rotation (async)
		if trollKeyID != "" && trollKeyID != "env" && trollKeyID != "main" {
			trollKeyPool.CheckAndRotateOnError(trollKeyID, resp.StatusCode, string(body))
		}
		// Sanitize and forward error response (hide upstream details)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(sanitizeError(resp.StatusCode, body))
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, `{"error": {"message": "Streaming not supported", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	// Create transformer
	transformer := transformers.NewAnthropicResponseTransformer(modelID, "")

	// Process SSE events manually to capture usage data
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 1024*1024), 10*1024*1024) // 10MB max buffer
	var totalInputTokens, totalOutputTokens, totalCacheWriteTokens, totalCacheHitTokens int64
	var currentEvent string
	var hasError bool // Track if there was an error in the stream

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		if strings.HasPrefix(line, "event: ") {
			currentEvent = strings.TrimPrefix(line, "event: ")
		} else if strings.HasPrefix(line, "data: ") {
			dataStr := strings.TrimPrefix(line, "data: ")
			var eventData map[string]interface{}
			if err := json.Unmarshal([]byte(dataStr), &eventData); err == nil {
				// Check for error events - don't charge if there's an error
				if currentEvent == "error" {
					hasError = true
					log.Printf("❌ Error event in stream: %s", dataStr)
				}

				// Capture usage from message_start event
				if currentEvent == "message_start" {
					if message, ok := eventData["message"].(map[string]interface{}); ok {
						if usageData, ok := message["usage"].(map[string]interface{}); ok {
							if it, ok := usageData["input_tokens"].(float64); ok {
								totalInputTokens = int64(it)
							}
							if cwt, ok := usageData["cache_creation_input_tokens"].(float64); ok {
								totalCacheWriteTokens = int64(cwt)
							}
							if cht, ok := usageData["cache_read_input_tokens"].(float64); ok {
								totalCacheHitTokens = int64(cht)
							}
						}
					}
				}

				// Capture usage from message_delta event
				if currentEvent == "message_delta" {
					if usageData, ok := eventData["usage"].(map[string]interface{}); ok {
						if ot, ok := usageData["output_tokens"].(float64); ok {
							totalOutputTokens = int64(ot)
						}
					}
				}

				// Transform and forward the chunk
				if chunk, err := transformer.TransformStreamChunk(currentEvent, eventData); err == nil && chunk != "" {
					// Debug: log first few chunks to verify format
					if debugMode && totalOutputTokens < 3 {
						log.Printf("🔍 [Stream] event=%s, chunk=%s", currentEvent, chunk[:min(200, len(chunk))])
					}
					if _, err := fmt.Fprint(w, chunk); err != nil {
						log.Printf("Error: failed to write streaming response: %v", err)
						return
					}
					flusher.Flush()
				}
			}
		}
	}

	// Send final chunk with usage data (OpenAI format)
	if totalInputTokens > 0 || totalOutputTokens > 0 {
		usageChunk := map[string]interface{}{
			"id":      fmt.Sprintf("chatcmpl-%d", time.Now().UnixNano()),
			"object":  "chat.completion.chunk",
			"created": time.Now().Unix(),
			"model":   modelID,
			"choices": []map[string]interface{}{},
			"usage": map[string]interface{}{
				"prompt_tokens":     totalInputTokens,
				"completion_tokens": totalOutputTokens,
				"total_tokens":      totalInputTokens + totalOutputTokens,
			},
		}
		if usageJSON, err := json.Marshal(usageChunk); err == nil {
			fmt.Fprintf(w, "data: %s\n\n", string(usageJSON))
			flusher.Flush()
		}
	}

	// Check for scanner errors (connection issues, truncation, etc)
	if err := scanner.Err(); err != nil {
		log.Printf("❌ [Stream] Scanner error detected: %v (in=%d out=%d)", err, totalInputTokens, totalOutputTokens)
		// Send error event to client
		errorEvent := fmt.Sprintf("event: error\ndata: {\"type\":\"error\",\"error\":{\"type\":\"stream_error\",\"message\":\"Stream interrupted\"}}\n\n")
		fmt.Fprint(w, errorEvent)
		flusher.Flush()
		return
	}

	// Send end marker
	log.Printf("✅ [Stream] Sending [DONE] marker (events processed, in=%d, out=%d)", totalInputTokens, totalOutputTokens)
	fmt.Fprint(w, "data: [DONE]\n\n")
	flusher.Flush()

	// Update usage after stream completes - only if no errors occurred
	if !hasError && (totalInputTokens > 0 || totalOutputTokens > 0) {
		billingTokens := config.CalculateBillingTokensWithCache(modelID, totalInputTokens, totalOutputTokens, totalCacheWriteTokens, totalCacheHitTokens)
		billingCost := config.CalculateBillingCostWithCache(modelID, totalInputTokens, totalOutputTokens, totalCacheWriteTokens, totalCacheHitTokens)
		if userApiKey != "" {
			if err := usage.UpdateUsage(userApiKey, billingTokens); err != nil {
				log.Printf("⚠️ Failed to update usage: %v", err)
			} else if debugMode {
				inputPrice, outputPrice := config.GetModelPricing(modelID)
				cacheWritePrice, cacheHitPrice := config.GetModelCachePricing(modelID)
				log.Printf("📊 Updated usage (stream): in=%d out=%d cache_write=%d cache_hit=%d, billing=%d (price: $%.2f/$%.2f/$%.2f/$%.2f/MTok)",
					totalInputTokens, totalOutputTokens, totalCacheWriteTokens, totalCacheHitTokens, billingTokens, inputPrice, outputPrice, cacheWritePrice, cacheHitPrice)
			}
			// Deduct credits and update tokensUsed for user
			if username != "" {
				if err := usage.DeductCreditsWithCache(username, billingCost, billingTokens, totalInputTokens, totalOutputTokens, totalCacheWriteTokens, totalCacheHitTokens); err != nil {
					log.Printf("⚠️ Failed to update user: %v", err)
				} else if debugMode {
					log.Printf("💰 Deducted $%.6f, used %d tokens for user %s", billingCost, billingTokens, username)
				}
				// Update Friend Key usage if applicable
				usage.UpdateFriendKeyUsageIfNeeded(userApiKey, modelID, billingCost)
			}
			// Log request for analytics
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequestDetailed(usage.RequestLogParams{
				UserID:           username,
				UserKeyID:        userApiKey,
				TrollKeyID:       trollKeyID,
				Model:            modelID,
				InputTokens:      totalInputTokens,
				OutputTokens:     totalOutputTokens,
				CacheWriteTokens: totalCacheWriteTokens,
				CacheHitTokens:   totalCacheHitTokens,
				CreditsCost:      billingCost,
				CreditType:       "ohmygpt",
				TokensUsed:       billingTokens,
				StatusCode:       resp.StatusCode,
				LatencyMs:        latencyMs,
			})
		}
	} else if hasError {
		log.Printf("⚠️ Skipping billing due to error in stream")
	}
}

// Handle TrollOpenAI non-streaming response
func handleTrollOpenAINonStreamResponse(w http.ResponseWriter, resp *http.Response, modelID string, userApiKey string, trollKeyID string, requestStartTime time.Time, username string) {
	// Debug mode: log response headers
	if debugMode {
		log.Printf("📋 Response headers:")
		for key, values := range resp.Header {
			for _, value := range values {
				log.Printf("   %s: %s", key, value)
			}
		}
	}

	// Read response body (automatically handle compression)
	body, err := readResponseBody(resp)
	if err != nil {
		log.Printf("Error: failed to read response: %v", err)
		http.Error(w, `{"error": {"message": "Failed to read response", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	// Debug mode: save complete response to file
	if debugMode {
		timestamp := time.Now().Format("20060102_150405")
		responseFile := fmt.Sprintf("response_%s.bin", timestamp)
		if err := os.WriteFile(responseFile, body, 0644); err != nil {
			log.Printf("⚠️ Unable to save response to file: %v", err)
		} else {
			log.Printf("💾 Complete response saved to: %s", responseFile)
		}
	}

	if resp.StatusCode != http.StatusOK {
		// Log failed request for analytics
		if userApiKey != "" {
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequest(userApiKey, trollKeyID, 0, resp.StatusCode, latencyMs)
		}
		// Check if key needs rotation (async)
		if trollKeyID != "" && trollKeyID != "env" && trollKeyID != "main" {
			trollKeyPool.CheckAndRotateOnError(trollKeyID, resp.StatusCode, string(body))
		}
		// Sanitize and forward error response (hide upstream details)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		if _, err := w.Write(sanitizeError(resp.StatusCode, body)); err != nil {
			log.Printf("Error: failed to write error response: %v", err)
		}
		return
	}

	// Parse TrollOpenAI response
	var trollResp map[string]interface{}
	if err := json.Unmarshal(body, &trollResp); err != nil {
		log.Printf("Error: failed to parse response: %v", err)
		if debugMode {
			log.Printf("Raw response content (first 200 bytes): %s", string(body[:min(200, len(body))]))
			log.Printf("Raw response content (hex first 50 bytes): % x", body[:min(50, len(body))])
		}
		// Return error
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		errorMsg := `{"error": {"message": "Failed to parse TrollLLM API response", "type": "server_error"}}`
		w.Write([]byte(errorMsg))
		return
	}

	// Extract and track token usage
	if usageData, ok := trollResp["usage"].(map[string]interface{}); ok {
		inputTokens := int64(0)
		outputTokens := int64(0)
		cacheWriteTokens := int64(0)
		cacheHitTokens := int64(0)
		if it, ok := usageData["input_tokens"].(float64); ok {
			inputTokens = int64(it)
		} else if it, ok := usageData["prompt_tokens"].(float64); ok {
			inputTokens = int64(it)
		}
		if ot, ok := usageData["output_tokens"].(float64); ok {
			outputTokens = int64(ot)
		} else if ot, ok := usageData["completion_tokens"].(float64); ok {
			outputTokens = int64(ot)
		}
		if cwt, ok := usageData["cache_creation_input_tokens"].(float64); ok {
			cacheWriteTokens = int64(cwt)
		}
		if cht, ok := usageData["cache_read_input_tokens"].(float64); ok {
			cacheHitTokens = int64(cht)
		}
		billingTokens := config.CalculateBillingTokensWithCache(modelID, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens)
		billingCost := config.CalculateBillingCostWithCache(modelID, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens)

		// Update user usage in database
		if userApiKey != "" {
			if err := usage.UpdateUsage(userApiKey, billingTokens); err != nil {
				log.Printf("⚠️ Failed to update usage: %v", err)
			} else if debugMode {
				inputPrice, outputPrice := config.GetModelPricing(modelID)
				cacheWritePrice, cacheHitPrice := config.GetModelCachePricing(modelID)
				log.Printf("📊 Updated usage: in=%d out=%d cache_write=%d cache_hit=%d, billing=%d (price: $%.2f/$%.2f/$%.2f/$%.2f/MTok)",
					inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens, billingTokens, inputPrice, outputPrice, cacheWritePrice, cacheHitPrice)
			}
			// Deduct credits and update tokensUsed for user
			if username != "" {
				if err := usage.DeductCreditsWithCache(username, billingCost, billingTokens, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens); err != nil {
					log.Printf("⚠️ Failed to update user: %v", err)
				} else if debugMode {
					log.Printf("💰 Deducted $%.6f, used %d tokens for user %s", billingCost, billingTokens, username)
				}
				// Update Friend Key usage if applicable
				usage.UpdateFriendKeyUsageIfNeeded(userApiKey, modelID, billingCost)
			}
			// Log request for analytics (include latency)
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequestDetailed(usage.RequestLogParams{
				UserID:           username,
				UserKeyID:        userApiKey,
				TrollKeyID:       trollKeyID,
				Model:            modelID,
				InputTokens:      inputTokens,
				OutputTokens:     outputTokens,
				CacheWriteTokens: cacheWriteTokens,
				CacheHitTokens:   cacheHitTokens,
				CreditsCost:      billingCost,
				CreditType:       "ohmygpt",
				TokensUsed:       billingTokens,
				StatusCode:       resp.StatusCode,
				LatencyMs:        latencyMs,
			})
		}
	}

	// Transform to OpenAI format
	transformer := transformers.NewTrollOpenAIResponseTransformer(modelID, "")
	openaiResp, err := transformer.TransformNonStreamResponse(trollResp)
	if err != nil {
		log.Printf("Error: failed to transform response: %v", err)
		http.Error(w, `{"error": {"message": "Failed to transform response", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	// Return OpenAI format response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(openaiResp); err != nil {
		log.Printf("Error: failed to encode response: %v", err)
	}
}

// Handle TrollOpenAI streaming response
func handleTrollOpenAIStreamResponse(w http.ResponseWriter, resp *http.Response, modelID string, userApiKey string, trollKeyID string, requestStartTime time.Time, username string) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, `{"error": {"message": "Streaming not supported", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	// Create transformer
	transformer := transformers.NewTrollOpenAIResponseTransformer(modelID, "")

	// Process SSE events manually to capture usage data
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 1024*1024), 10*1024*1024) // 10MB max buffer
	var totalInputTokens, totalOutputTokens int64
	var currentEvent string
	var hasError bool // Track if there was an error in the stream

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		if strings.HasPrefix(line, "event: ") {
			currentEvent = strings.TrimPrefix(line, "event: ")
		} else if strings.HasPrefix(line, "data: ") {
			dataStr := strings.TrimPrefix(line, "data: ")

			// Check if it's [DONE] marker
			if strings.TrimSpace(dataStr) == "[DONE]" {
				fmt.Fprint(w, "data: [DONE]\n\n")
				flusher.Flush()
				continue
			}

			var eventData map[string]interface{}
			if err := json.Unmarshal([]byte(dataStr), &eventData); err == nil {
				// Check for error in response
				if _, hasErr := eventData["error"]; hasErr {
					hasError = true
					log.Printf("❌ Error in stream response: %s", dataStr)
				}

				// Check if standard OpenAI format with choices
				if _, hasChoices := eventData["choices"]; hasChoices {
					// Extract usage from final chunk (OpenAI format)
					if usageData, ok := eventData["usage"].(map[string]interface{}); ok {
						if it, ok := usageData["prompt_tokens"].(float64); ok {
							totalInputTokens = int64(it)
						}
						if ot, ok := usageData["completion_tokens"].(float64); ok {
							totalOutputTokens = int64(ot)
						}
					}
					// Forward with filtering
					eventData["model"] = modelID
					if choices, ok := eventData["choices"].([]interface{}); ok {
						for _, choice := range choices {
							if choiceMap, ok := choice.(map[string]interface{}); ok {
								if delta, ok := choiceMap["delta"].(map[string]interface{}); ok {
									if content, ok := delta["content"].(string); ok {
										delta["content"] = transformers.FilterDroidIdentity(content, true)
									}
								}
							}
						}
					}
					if jsonData, err := json.Marshal(eventData); err == nil {
						fmt.Fprintf(w, "data: %s\n\n", string(jsonData))
						flusher.Flush()
					}
					continue
				}

				// TrollLLM custom format - extract usage from response.done
				if currentEvent == "response.done" {
					if response, ok := eventData["response"].(map[string]interface{}); ok {
						if usageData, ok := response["usage"].(map[string]interface{}); ok {
							if it, ok := usageData["input_tokens"].(float64); ok {
								totalInputTokens = int64(it)
							}
							if ot, ok := usageData["output_tokens"].(float64); ok {
								totalOutputTokens = int64(ot)
							}
						}
					}
				}

				// Transform and forward the chunk
				if chunk, err := transformer.TransformStreamChunk(currentEvent, eventData); err == nil && chunk != "" {
					if _, err := fmt.Fprint(w, chunk); err != nil {
						log.Printf("Error: failed to write streaming response: %v", err)
						return
					}
					flusher.Flush()
				}
			}
		}
	}

	// Check for scanner errors (connection issues, truncation, etc)
	if err := scanner.Err(); err != nil {
		log.Printf("❌ [TrollOpenAI Stream] Scanner error detected: %v (in=%d out=%d)", err, totalInputTokens, totalOutputTokens)
		// Send error event to client
		errorEvent := fmt.Sprintf("data: {\"error\":{\"message\":\"Stream interrupted\",\"type\":\"stream_error\"}}\n\n")
		fmt.Fprint(w, errorEvent)
		flusher.Flush()
		return
	}

	// Send end marker if not sent
	fmt.Fprint(w, "data: [DONE]\n\n")
	flusher.Flush()

	// Update usage after stream completes - only if no errors occurred
	if !hasError && (totalInputTokens > 0 || totalOutputTokens > 0) {
		billingTokens := config.CalculateBillingTokensWithCache(modelID, totalInputTokens, totalOutputTokens, 0, 0)
		billingCost := config.CalculateBillingCostWithCache(modelID, totalInputTokens, totalOutputTokens, 0, 0)
		if userApiKey != "" {
			if err := usage.UpdateUsage(userApiKey, billingTokens); err != nil {
				log.Printf("⚠️ Failed to update usage: %v", err)
			} else if debugMode {
				inputPrice, outputPrice := config.GetModelPricing(modelID)
				log.Printf("📊 Updated usage (stream): in=%d out=%d, billing=%d (price: $%.2f/$%.2f/MTok)",
					totalInputTokens, totalOutputTokens, billingTokens, inputPrice, outputPrice)
			}
			// Deduct credits and update tokensUsed for user
			if username != "" {
				if err := usage.DeductCreditsWithTokens(username, billingCost, billingTokens, totalInputTokens, totalOutputTokens); err != nil {
					log.Printf("⚠️ Failed to update user: %v", err)
				} else if debugMode {
					log.Printf("💰 Deducted $%.6f, used %d tokens for user %s", billingCost, billingTokens, username)
				}
				// Update Friend Key usage if applicable
				usage.UpdateFriendKeyUsageIfNeeded(userApiKey, modelID, billingCost)
			}
			// Log request for analytics
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequestDetailed(usage.RequestLogParams{
				UserID:       username,
				UserKeyID:    userApiKey,
				TrollKeyID:   trollKeyID,
				Model:        modelID,
				InputTokens:  totalInputTokens,
				OutputTokens: totalOutputTokens,
				CreditsCost:  billingCost,
				CreditType:   "ohmygpt",
				TokensUsed:   billingTokens,
				StatusCode:   resp.StatusCode,
				LatencyMs:    latencyMs,
			})
		}
	} else if hasError {
		log.Printf("⚠️ Skipping billing due to error in stream")
	}
}

// Helper function to get map keys for debugging
func getMapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// sanitizeBlockedContent removes or replaces content that Factory AI blocks
// This includes phrases like "You are Claude Code" which trigger 403 errors
// Uses pre-compiled regex patterns for performance
func sanitizeBlockedContent(text string) string {
	result := text
	for _, re := range blockedPatternRegexes {
		result = re.ReplaceAllString(result, "an AI assistant")
	}
	return result
}

// detectAssistantThinkingState analyzes assistant messages to determine thinking state.
// Returns:
//   - hasThinking: true if ANY assistant message has thinking/redacted_thinking blocks
//   - hasNonThinking: true if ANY assistant message lacks thinking blocks
//
// Anthropic API rules:
//   - If thinking enabled: ALL assistant messages MUST have thinking blocks
//   - If thinking disabled: NO assistant message can have thinking blocks
func detectAssistantThinkingState(messages []transformers.AnthropicMessage) (hasThinking, hasNonThinking bool) {
	for i := range messages {
		if messages[i].Role != "assistant" {
			continue
		}

		// Check if content is array
		var contentArray []interface{}
		switch content := messages[i].Content.(type) {
		case []interface{}:
			contentArray = content
		case []map[string]interface{}:
			contentArray = make([]interface{}, len(content))
			for j, item := range content {
				contentArray[j] = item
			}
		case string:
			// String content means no thinking block
			hasNonThinking = true
			continue
		default:
			continue
		}

		if len(contentArray) == 0 {
			continue
		}

		// Check if first block is thinking or redacted_thinking
		hasThinkingBlock := false
		if firstBlock, ok := contentArray[0].(map[string]interface{}); ok {
			blockType, _ := firstBlock["type"].(string)
			if blockType == "thinking" || blockType == "redacted_thinking" {
				hasThinkingBlock = true
			}
		}

		if hasThinkingBlock {
			hasThinking = true
		} else {
			hasNonThinking = true
		}
	}
	return hasThinking, hasNonThinking
}

// sanitizeAnthropicMessages sanitizes all messages to remove blocked content
func sanitizeAnthropicMessages(messages []transformers.AnthropicMessage) []transformers.AnthropicMessage {
	for i := range messages {
		// Handle string content
		if strContent, ok := messages[i].Content.(string); ok {
			messages[i].Content = sanitizeBlockedContent(strContent)
			continue
		}

		// Handle array content
		if arrContent, ok := messages[i].Content.([]map[string]interface{}); ok {
			for j := range arrContent {
				if text, ok := arrContent[j]["text"].(string); ok {
					arrContent[j]["text"] = sanitizeBlockedContent(text)
				}
			}
			messages[i].Content = arrContent
		}

		// Handle []interface{} content
		if arrContent, ok := messages[i].Content.([]interface{}); ok {
			for j := range arrContent {
				if block, ok := arrContent[j].(map[string]interface{}); ok {
					if text, ok := block["text"].(string); ok {
						block["text"] = sanitizeBlockedContent(text)
					}
				}
			}
			messages[i].Content = arrContent
		}
	}
	return messages
}

// combineSystemText flattens Anthropic system prompt entries into a single string
func combineSystemText(systemEntries []map[string]interface{}) string {
	var builder strings.Builder
	for _, entry := range systemEntries {
		text, _ := entry["text"].(string)
		if text == "" {
			continue
		}
		if builder.Len() > 0 {
			builder.WriteString("\n\n")
		}
		builder.WriteString(text)
	}
	return builder.String()
}

// Extract client request headers
func extractClientHeaders(r *http.Request) map[string]string {
	headers := make(map[string]string)

	// Extract headers to forward
	forwardHeaders := []string{
		"x-session-id",
		"x-assistant-message-id",
		"x-stainless-arch",
		"x-stainless-lang",
		"x-stainless-os",
		"x-stainless-runtime",
		"x-stainless-retry-count",
		"x-stainless-package-version",
		"x-stainless-runtime-version",
	}

	for _, header := range forwardHeaders {
		if value := r.Header.Get(header); value != "" {
			headers[header] = value
		}
	}

	return headers
}

// Anthropic Messages API endpoint - Direct pass-through to Factory AI
// Supports Anthropic native provider in Droid CLI and Anthropic SDK
func handleAnthropicMessagesEndpoint(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"type":"error","error":{"type":"invalid_request_error","message":"Method not allowed"}}`, http.StatusMethodNotAllowed)
		return
	}

	// Validate Authorization header (support both Authorization/Bearer and x-api-key)
	authHeader := r.Header.Get("Authorization")
	clientAPIKey := ""

	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || parts[1] == "" {
			http.Error(w, `{"type":"error","error":{"type":"authentication_error","message":"Invalid authorization header format"}}`, http.StatusUnauthorized)
			return
		}
		clientAPIKey = parts[1]
	} else if xAPIKey := r.Header.Get("x-api-key"); xAPIKey != "" {
		// Anthropic SDKs send x-api-key without Authorization header
		clientAPIKey = xAPIKey
		authHeader = "Bearer " + xAPIKey
	} else {
		http.Error(w, `{"type":"error","error":{"type":"authentication_error","message":"Authorization header is required"}}`, http.StatusUnauthorized)
		return
	}

	// Validate API key - either from env (PROXY_API_KEY) or MongoDB (user_keys)
	proxyAPIKey := getEnv("PROXY_API_KEY", "")
	clientKeyMask := clientAPIKey
	if len(clientKeyMask) > 8 {
		clientKeyMask = clientKeyMask[:4] + "..." + clientKeyMask[len(clientKeyMask)-4:]
	}

	var username string // Username for credit deduction
	var isFriendKeyRequest bool
	var friendKeyID string // Store Friend Key ID for model limit check later

	if proxyAPIKey != "" {
		// Validate with fixed PROXY_API_KEY from env
		if clientAPIKey != proxyAPIKey {
			log.Printf("❌ API Key validation failed (env): %s", clientKeyMask)
			http.Error(w, `{"type":"error","error":{"type":"authentication_error","message":"Invalid API key"}}`, http.StatusUnauthorized)
			return
		}
		log.Printf("🔑 Key validated (env): %s", clientKeyMask)
	} else if userkey.IsFriendKey(clientAPIKey) {
		// Validate Friend Key (model limit check will be done after model parsing)
		friendKeyResult, err := userkey.ValidateFriendKeyBasic(clientAPIKey)
		if err != nil {
			log.Printf("❌ Friend Key validation failed: %s - %v", clientKeyMask, err)
			switch err {
			case userkey.ErrFriendKeyNotFound:
				http.Error(w, `{"type":"error","error":{"type":"authentication_error","message":"Invalid API key"}}`, http.StatusUnauthorized)
			case userkey.ErrFriendKeyInactive:
				http.Error(w, `{"type":"error","error":{"type":"authentication_error","message":"Friend Key has been deactivated"}}`, http.StatusUnauthorized)
			case userkey.ErrFriendKeyOwnerInactive:
				http.Error(w, `{"type":"error","error":{"type":"authentication_error","message":"Friend Key owner account is inactive"}}`, http.StatusUnauthorized)
			case userkey.ErrFriendKeyOwnerNoCredits:
				// Story 4.2 AC4: Generic message for Friend Key - do NOT expose owner's balance
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusPaymentRequired)
				w.Write([]byte(`{"type":"error","error":{"type":"insufficient_credits","message":"Insufficient credits. Please contact the key owner."}}`))
			default:
				http.Error(w, `{"type":"error","error":{"type":"authentication_error","message":"Invalid API key"}}`, http.StatusUnauthorized)
			}
			return
		}
		log.Printf("🔑 Friend Key validated: %s [owner: %s]", clientKeyMask, friendKeyResult.Owner.Username)
		username = friendKeyResult.Owner.Username
		isFriendKeyRequest = true
		friendKeyID = clientAPIKey
	} else {
		// Validate from MongoDB user_keys collection
		userKey, err := userkey.ValidateKey(clientAPIKey)
		if err != nil {
			log.Printf("❌ API Key validation failed (db): %s - %v", clientKeyMask, err)
			if err == userkey.ErrKeyRevoked {
				http.Error(w, `{"type":"error","error":{"type":"authentication_error","message":"API key has been revoked"}}`, http.StatusUnauthorized)
			} else if err == userkey.ErrInsufficientCredits {
				// Story 4.2 AC2: Use insufficient_credits type, include balance info
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusPaymentRequired)
				w.Write([]byte(`{"type":"error","error":{"type":"insufficient_credits","message":"Insufficient credits. Current balance: $0.00"}}`))
			} else if err == userkey.ErrCreditsExpired {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusPaymentRequired)
				w.Write([]byte(`{"type":"error","error":{"type":"credits_expired","message":"Credits have expired. Please purchase new credits."}}`))
			} else if err == userkey.ErrMigrationRequired {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte(`{"type":"error","error":{"type":"migration_required","message":"Migration required: please visit https://trollllm.xyz/dashboard to migrate your account to the new billing rate (1000→2500 VNĐ/$)"}}`))
			} else {
				http.Error(w, `{"type":"error","error":{"type":"authentication_error","message":"Invalid API key"}}`, http.StatusUnauthorized)
			}
			return
		}
		log.Printf("🔑 Key validated (db): %s", clientKeyMask)
		username = userKey.Name // Store username for credit deduction

		// NOTE: Credit check moved to after upstream routing to support dual-credit system
		// OpenHands uses creditsNew, OhMyGPT uses credits - check happens per-upstream
	}
	// Store Friend Key info for use in response handlers
	_ = isFriendKeyRequest
	_ = friendKeyID

	// Check rate limit (with refCredits support for Pro RPM) - Anthropic format for /v1/messages
	if !checkRateLimitWithUsername(w, clientAPIKey, username, true) {
		return
	}

	// Read request body (no parsing - direct pass-through)
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"invalid_request_error","message":"Failed to read request body"}}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if debugMode {
		log.Printf("📥 /v1/messages request received (body: %d bytes)", len(bodyBytes))
	}

	// Parse Anthropic request
	var anthropicReq transformers.AnthropicRequest
	if err := json.Unmarshal(bodyBytes, &anthropicReq); err != nil {
		log.Printf("Error parsing request: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"invalid_request_error","message":"Invalid JSON"}}`, http.StatusBadRequest)
		return
	}

	// Always log the model being requested for debugging
	log.Printf("📥 /v1/messages - Model requested: %s, Stream: %v", anthropicReq.Model, anthropicReq.Stream)

	stream := anthropicReq.Stream

	// Get model to validate and configure request
	model := config.GetModelByID(anthropicReq.Model)
	if model == nil {
		log.Printf("❌ Unsupported model: %s", anthropicReq.Model)
		http.Error(w, `{"type":"error","error":{"type":"invalid_request_error","message":"Model not found"}}`, http.StatusNotFound)
		return
	}

	// Check Friend Key model limit (now that we have the model ID)
	if isFriendKeyRequest && friendKeyID != "" {
		if err := userkey.CheckFriendKeyModelLimit(friendKeyID, anthropicReq.Model); err != nil {
			log.Printf("🚫 Friend Key model limit check failed: %s - %v", clientKeyMask, err)
			w.Header().Set("Content-Type", "application/json")
			switch err {
			case userkey.ErrFriendKeyModelNotAllowed:
				w.WriteHeader(http.StatusPaymentRequired)
				w.Write([]byte(fmt.Sprintf(`{"type":"error","error":{"type":"friend_key_model_not_allowed","message":"Model '%s' is not configured for this Friend Key"}}`, anthropicReq.Model)))
			case userkey.ErrFriendKeyModelDisabled:
				w.WriteHeader(http.StatusPaymentRequired)
				w.Write([]byte(fmt.Sprintf(`{"type":"error","error":{"type":"friend_key_model_disabled","message":"Model '%s' is disabled for this Friend Key"}}`, anthropicReq.Model)))
			case userkey.ErrFriendKeyModelLimitExceeded:
				w.WriteHeader(http.StatusPaymentRequired)
				w.Write([]byte(fmt.Sprintf(`{"type":"error","error":{"type":"friend_key_model_limit_exceeded","message":"Friend Key spending limit exceeded for model '%s'"}}`, anthropicReq.Model)))
			default:
				w.WriteHeader(http.StatusPaymentRequired)
				w.Write([]byte(`{"type":"error","error":{"type":"friend_key_error","message":"Friend Key model access denied"}}`))
			}
			return
		}
		log.Printf("✅ Friend Key model limit OK: %s -> %s", clientKeyMask, anthropicReq.Model)
	}

	// NEW MODEL-BASED ROUTING - BEGIN
	// Select upstream based on model configuration
	upstreamConfig, selectedProxy, err := selectUpstreamConfig(model.ID, clientAPIKey)
	if err != nil {
		log.Printf("❌ Failed to select upstream: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Server configuration error"}}`, http.StatusInternalServerError)
		return
	}
	authHeader = "Bearer " + upstreamConfig.APIKey
	trollKeyID := upstreamConfig.KeyID

	// Credit pre-check based on billing_upstream config (not upstream provider)
	// billing_upstream="openhands" → check creditsNew field
	// billing_upstream="ohmygpt" → check credits+refCredits fields
	if username != "" {
		billingUpstream := config.GetModelBillingUpstream(model.ID)

		if billingUpstream == "openhands" {
			// Check creditsNew field for chat.trollllm.xyz
			if err := userkey.CheckUserCreditsOpenHands(username); err != nil {
				if err == userkey.ErrInsufficientCredits {
					log.Printf("💸 Insufficient creditsNew for user %s (billing_upstream=openhands)", username)
					// Get creditsNew balance for error response
					ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
					defer cancel()
					var user struct {
						CreditsNew float64 `bson:"creditsNew"`
					}
					db.UsersNewCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusPaymentRequired)
					w.Write([]byte(fmt.Sprintf(`{"type":"error","error":{"type":"insufficient_credits","message":"Insufficient creditsNew. Current balance: $%.2f"}}`, user.CreditsNew)))
					return
				}
				log.Printf("⚠️ Failed to check creditsNew for user %s: %v", username, err)
			}
		} else {
			// Check credits+refCredits fields for chat2.trollllm.xyz
			if err := userkey.CheckUserCredits(username); err != nil {
				if err == userkey.ErrInsufficientCredits {
					log.Printf("💸 Insufficient credits for user %s (billing_upstream=ohmygpt)", username)
					credits, refCredits, _ := userkey.GetUserCreditsWithRef(username)
					balance := credits + refCredits
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusPaymentRequired)
					w.Write([]byte(fmt.Sprintf(`{"type":"error","error":{"type":"insufficient_credits","message":"Insufficient credits. Current balance: $%.2f"}}`, balance)))
					return
				}
				log.Printf("⚠️ Failed to check credits for user %s: %v", username, err)
			}
		}
	}

	// For "main" upstream: forward original request as-is (no transformation)
	if upstreamConfig.KeyID == "main" {
		handleMainTargetMessagesRequest(w, bodyBytes, stream, anthropicReq.Model, clientAPIKey, username)
		return
	}

	// For "openhands" upstream: forward via OpenHands LLM Proxy
	if upstreamConfig.KeyID == "openhands" {
		handleOpenHandsMessagesRequest(w, bodyBytes, stream, anthropicReq.Model, clientAPIKey, username)
		return
	}

	// For "ohmygpt" upstream: forward via OhMyGPT Provider
	if upstreamConfig.KeyID == "ohmygpt" {
		handleOhMyGPTMessagesRequest(w, bodyBytes, stream, anthropicReq.Model, clientAPIKey, username)
		return
	}
	// NEW MODEL-BASED ROUTING - END

	// Normalize message content format (convert string to array if needed)
	for i := range anthropicReq.Messages {
		if strContent, ok := anthropicReq.Messages[i].Content.(string); ok {
			// Convert string to array format
			anthropicReq.Messages[i].Content = []map[string]interface{}{
				{
					"type": "text",
					"text": strContent,
				},
			}
			if debugMode {
				log.Printf("🔄 Normalized message %d content from string to array", i)
			}
		}
	}

	// Sanitize messages to remove blocked content (e.g., "Claude Code" phrases)
	anthropicReq.Messages = sanitizeAnthropicMessages(anthropicReq.Messages)
	if debugMode {
		log.Printf("🧹 Sanitized messages to remove blocked content")
	}

	// OLD CODE - BEGIN
	// // Get Anthropic endpoint from config (same as existing handler)
	// endpoint := config.GetEndpointByType("anthropic")
	// if endpoint == nil {
	// 	http.Error(w, `{"type":"error","error":{"type":"server_error","message":"Anthropic endpoint not configured"}}`, http.StatusInternalServerError)
	// 	return
	// }
	// OLD CODE - END

	// NEW MODEL-BASED ROUTING - Use endpoint from upstreamConfig
	endpointURL := upstreamConfig.EndpointURL

	// Add system prompt if not present (Factory AI requires this)
	userSystemText := sanitizeBlockedContent(combineSystemText(anthropicReq.GetSystemAsArray()))
	// Combine proxy system prompt + user system prompt (sanitized)
	systemPrompt := config.GetSystemPrompt()
	var systemEntries []map[string]interface{}

	// Add proxy system prompt first (higher priority)
	if systemPrompt != "" {
		systemEntries = append(systemEntries, map[string]interface{}{
			"type": "text",
			"text": systemPrompt,
		})
	}

	// Add user system prompt (sanitized to remove blocked content)
	if userSystemText != "" {
		sanitizedUserSystem := sanitizeBlockedContent(userSystemText)
		if sanitizedUserSystem != "" {
			systemEntries = append(systemEntries, map[string]interface{}{
				"type": "text",
				"text": sanitizedUserSystem,
			})
		}
	}

	if len(systemEntries) > 0 {
		anthropicReq.System = systemEntries
	} else {
		anthropicReq.System = nil
	}

	// Determine thinking state based on assistant messages in conversation history
	hasThinking, hasNonThinking := detectAssistantThinkingState(anthropicReq.Messages)
	reasoning := config.GetModelReasoning(anthropicReq.Model)

	if hasThinking && hasNonThinking {
		log.Printf("⚠️ [/v1/messages] Mixed thinking state detected - enabling thinking")
	}

	if hasThinking {
		// Conversation has thinking blocks - MUST enable thinking
		budgetTokens := config.GetModelThinkingBudget(anthropicReq.Model)
		anthropicReq.Thinking = &transformers.ThinkingConfig{
			Type:         "enabled",
			BudgetTokens: budgetTokens,
		}
		log.Printf("🧠 [/v1/messages] Thinking: ENABLED (conversation has thinking blocks, budget=%d)", budgetTokens)
	} else if hasNonThinking {
		// Conversation has assistant messages without thinking - MUST disable
		anthropicReq.Thinking = nil
		log.Printf("🧠 [/v1/messages] Thinking: DISABLED (conversation lacks thinking blocks)")
	} else if reasoning != "" {
		// No assistant messages - new conversation, enable based on config
		budgetTokens := config.GetModelThinkingBudget(anthropicReq.Model)
		anthropicReq.Thinking = &transformers.ThinkingConfig{
			Type:         "enabled",
			BudgetTokens: budgetTokens,
		}
		log.Printf("🧠 [/v1/messages] Thinking: ENABLED (new conversation, budget=%d)", budgetTokens)
	} else {
		anthropicReq.Thinking = nil
		log.Printf("🧠 [/v1/messages] Thinking: DISABLED (model has no reasoning config)")
	}

	// Ensure max_tokens is always large enough for thinking + response
	if anthropicReq.MaxTokens <= 0 {
		maxLimit := 64000
		if model.ID == "claude-opus-4-1-20250805" {
			maxLimit = 32000
		}
		anthropicReq.MaxTokens = maxLimit
		if debugMode {
			log.Printf("✅ Set default max_tokens: %d", anthropicReq.MaxTokens)
		}
	}

	if anthropicReq.Thinking != nil {
		minTokens := anthropicReq.Thinking.BudgetTokens + 4000 // reserve space for final response
		if anthropicReq.MaxTokens < minTokens {
			if debugMode {
				log.Printf("🔧 max_tokens(%d) < thinking budget requirement(%d), increasing", anthropicReq.MaxTokens, minTokens)
			}
			anthropicReq.MaxTokens = minTokens
		}
	} else if anthropicReq.MaxTokens == 0 {
		// Set reasonable default if not specified
		maxLimit := 64000
		if model.ID == "claude-opus-4-1-20250805" {
			maxLimit = 32000
		}
		anthropicReq.MaxTokens = maxLimit
		if debugMode {
			log.Printf("✅ Set default max_tokens: %d", anthropicReq.MaxTokens)
		}
	}

	// Re-serialize to send (with added system prompt and thinking config)
	reqBody, err := json.Marshal(anthropicReq)
	if err != nil {
		log.Printf("Error serializing request: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Failed to serialize request"}}`, http.StatusInternalServerError)
		return
	}

	// Create request to upstream (Factory AI or Main Target Server)
	// OLD CODE: proxyReq, err := http.NewRequest(http.MethodPost, endpoint.BaseURL, bytes.NewBuffer(reqBody))
	proxyReq, err := http.NewRequest(http.MethodPost, endpointURL, bytes.NewBuffer(reqBody))
	if err != nil {
		log.Printf("Error creating request: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Failed to create request"}}`, http.StatusInternalServerError)
		return
	}

	// Set headers based on upstream type
	clientHeaders := extractClientHeaders(r)
	var headers map[string]string
	if upstreamConfig.KeyID == "main" {
		// Use Main Target headers (standard Anthropic API with x-api-key)
		headers = transformers.GetMainTargetHeaders(upstreamConfig.APIKey, clientHeaders, stream)
	} else {
		// Use Factory AI headers (Authorization Bearer + x-factory-client)
		headers = transformers.GetAnthropicHeaders(authHeader, clientHeaders, stream, model.ID)
	}
	for key, value := range headers {
		proxyReq.Header.Set(key, value)
	}

	// Debug: log request details
	if debugMode {
		log.Printf("📤 [%s] Endpoint: %s", upstreamConfig.KeyID, endpointURL)
		log.Printf("📤 [%s] Headers: content-type=%s, anthropic-version=%s", upstreamConfig.KeyID, headers["content-type"], headers["anthropic-version"])
	}

	// Send request (using proxy client if selected, otherwise global client)
	client := httpClient
	if selectedProxy != nil {
		proxyClient, err := proxyPool.CreateHTTPClientWithProxy(selectedProxy)
		if err != nil {
			log.Printf("❌ Failed to create proxy client (no fallback): %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"type":"error","error":{"type":"api_error","message":"Proxy unavailable"}}`))
			return
		}
		client = proxyClient
	}

	// Log upstream destination
	if upstreamConfig.KeyID == "main" {
		log.Printf("📤 Sending request to Main Target Server...")
	} else {
		log.Printf("📤 Sending request to Factory API...")
	}
	reqStart := time.Now()
	resp, err := doRequestWithRetry(client, proxyReq, reqBody)
	if err != nil {
		log.Printf("❌ Request failed after %v (with retries): %v", time.Since(reqStart), err)
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Request to upstream failed"}}`, http.StatusBadGateway)
		return
	}
	log.Printf("📥 Response received from %s after %v", upstreamConfig.KeyID, time.Since(reqStart))
	defer resp.Body.Close()

	if debugMode {
		log.Printf("📥 Factory AI response: %d", resp.StatusCode)
	}

	// Handle response based on streaming
	if stream {
		handleAnthropicMessagesStreamResponse(w, resp, anthropicReq.Model, clientAPIKey, trollKeyID, reqStart, username)
	} else {
		handleAnthropicMessagesNonStreamResponse(w, resp, anthropicReq.Model, clientAPIKey, trollKeyID, reqStart, username)
	}
}

// Handle non-streaming response from Factory AI (Anthropic format)
func handleAnthropicMessagesNonStreamResponse(w http.ResponseWriter, resp *http.Response, modelID string, userApiKey string, trollKeyID string, requestStartTime time.Time, username string) {
	body, err := readResponseBody(resp)
	if err != nil {
		log.Printf("Error reading response: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Failed to read response"}}`, http.StatusInternalServerError)
		return
	}

	// Debug: log response details
	if debugMode {
		log.Printf("📥 [%s] Response status: %d, body length: %d bytes", trollKeyID, resp.StatusCode, len(body))
		if len(body) < 2000 {
			log.Printf("📥 [%s] Response body: %s", trollKeyID, string(body))
		} else {
			log.Printf("📥 [%s] Response body (truncated): %s...", trollKeyID, string(body[:2000]))
		}
	}

	// Handle error responses
	if resp.StatusCode != http.StatusOK {
		if userApiKey != "" {
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequest(userApiKey, trollKeyID, 0, resp.StatusCode, latencyMs)
		}
		// Check if key needs rotation (async)
		if trollKeyID != "" && trollKeyID != "env" && trollKeyID != "main" {
			trollKeyPool.CheckAndRotateOnError(trollKeyID, resp.StatusCode, string(body))
		}
		// Sanitize and return error response (hide upstream details)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(sanitizeAnthropicError(resp.StatusCode, body))
		return
	}

	// Filter Droid identity from response content and track usage
	if resp.StatusCode == http.StatusOK {
		var anthropicResp map[string]interface{}
		if err := json.Unmarshal(body, &anthropicResp); err == nil {
			// Extract and track token usage
			if usageData, ok := anthropicResp["usage"].(map[string]interface{}); ok {
				inputTokens := int64(0)
				outputTokens := int64(0)
				cacheWriteTokens := int64(0)
				cacheHitTokens := int64(0)
				if it, ok := usageData["input_tokens"].(float64); ok {
					inputTokens = int64(it)
				}
				if ot, ok := usageData["output_tokens"].(float64); ok {
					outputTokens = int64(ot)
				}
				if cwt, ok := usageData["cache_creation_input_tokens"].(float64); ok {
					cacheWriteTokens = int64(cwt)
				}
				if cht, ok := usageData["cache_read_input_tokens"].(float64); ok {
					cacheHitTokens = int64(cht)
				}
				billingTokens := config.CalculateBillingTokensWithCache(modelID, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens)
				billingCost := config.CalculateBillingCostWithCache(modelID, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens)

				// Update user usage in database
				if userApiKey != "" {
					if err := usage.UpdateUsage(userApiKey, billingTokens); err != nil {
						log.Printf("⚠️ Failed to update usage: %v", err)
					} else if debugMode {
						inputPrice, outputPrice := config.GetModelPricing(modelID)
						cacheWritePrice, cacheHitPrice := config.GetModelCachePricing(modelID)
						log.Printf("📊 Updated usage: in=%d out=%d cache_write=%d cache_hit=%d, billing=%d (price: $%.2f/$%.2f/$%.2f/$%.2f/MTok)",
							inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens, billingTokens, inputPrice, outputPrice, cacheWritePrice, cacheHitPrice)
					}
					// Deduct credits and update tokensUsed for user
					if username != "" {
						if err := usage.DeductCreditsWithCache(username, billingCost, billingTokens, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens); err != nil {
							log.Printf("⚠️ Failed to update user: %v", err)
						} else if debugMode {
							log.Printf("💰 Deducted $%.6f, used %d tokens for user %s", billingCost, billingTokens, username)
						}
						// Update Friend Key usage if applicable
						usage.UpdateFriendKeyUsageIfNeeded(userApiKey, modelID, billingCost)
					}
					// Log request for analytics (include latency)
					latencyMs := time.Since(requestStartTime).Milliseconds()
					usage.LogRequestDetailed(usage.RequestLogParams{
						UserID:           username,
						UserKeyID:        userApiKey,
						TrollKeyID:       trollKeyID,
						Model:            modelID,
						InputTokens:      inputTokens,
						OutputTokens:     outputTokens,
						CacheWriteTokens: cacheWriteTokens,
						CacheHitTokens:   cacheHitTokens,
						CreditsCost:      billingCost,
						CreditType:       "ohmygpt",
						TokensUsed:       billingTokens,
						StatusCode:       resp.StatusCode,
						LatencyMs:        latencyMs,
					})
				}
			}

			// Filter content blocks (both text and thinking)
			if content, ok := anthropicResp["content"].([]interface{}); ok {
				for _, item := range content {
					if block, ok := item.(map[string]interface{}); ok {
						// Filter text blocks
						if text, ok := block["text"].(string); ok {
							block["text"] = transformers.FilterDroidIdentity(text)
						}
						// Filter thinking blocks to hide system prompt but show thinking process
						if blockType, ok := block["type"].(string); ok && blockType == "thinking" {
							if thinking, ok := block["thinking"].(string); ok {
								block["thinking"] = transformers.FilterThinkingContent(thinking)
							}
						}
					}
				}
			}
			// Re-serialize
			if filteredBody, err := json.Marshal(anthropicResp); err == nil {
				body = filteredBody
			}
		}
	}

	// Pass through response (with filtered content)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(body)

	if debugMode {
		log.Printf("✅ Response returned: %d bytes", len(body))
	}
}

// Handle streaming response from Factory AI (Anthropic SSE format)
func handleAnthropicMessagesStreamResponse(w http.ResponseWriter, resp *http.Response, modelID string, userApiKey string, trollKeyID string, requestStartTime time.Time, username string) {
	log.Printf("📥 Stream response status: %d", resp.StatusCode)

	// Handle error responses from upstream
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		// Log failed request for analytics
		if userApiKey != "" {
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequest(userApiKey, trollKeyID, 0, resp.StatusCode, latencyMs)
		}
		// Check if key needs rotation (async)
		if trollKeyID != "" && trollKeyID != "env" && trollKeyID != "main" {
			trollKeyPool.CheckAndRotateOnError(trollKeyID, resp.StatusCode, string(body))
		}
		// Sanitize and forward error response (hide upstream details)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(sanitizeAnthropicError(resp.StatusCode, body))
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Streaming not supported"}}`, http.StatusInternalServerError)
		return
	}

	// Process SSE events and filter Droid identity
	scanner := bufio.NewScanner(resp.Body)
	// Increase scanner buffer for large streaming responses
	scanner.Buffer(make([]byte, 1024*1024), 10*1024*1024) // 10MB max
	var totalInputTokens, totalOutputTokens, totalCacheWriteTokens, totalCacheHitTokens int64
	eventCount := 0
	startTime := time.Now()
	var firstEventTime time.Time
	var lastEventType string
	var lastEventTime time.Time
	var hasError bool // Track if there was an error in the stream
	log.Printf("📡 Stream started")

	for scanner.Scan() {
		eventCount++
		lastEventTime = time.Now()
		if eventCount == 1 {
			firstEventTime = lastEventTime
			log.Printf("📡 First event received after %v", firstEventTime.Sub(startTime))
		}
		line := scanner.Text()

		// Filter content_block_delta events (both text and thinking)
		if strings.HasPrefix(line, "data: ") {
			dataStr := strings.TrimPrefix(line, "data: ")
			var eventData map[string]interface{}
			if err := json.Unmarshal([]byte(dataStr), &eventData); err == nil {
				modified := false
				eventType, _ := eventData["type"].(string)

				// Track last event type for debugging
				lastEventType = eventType

				// Check for error events - don't charge if there's an error
				if eventType == "error" {
					hasError = true
					log.Printf("❌ Error event in stream: %s", dataStr)
				}

				// Filter thinking content to hide system prompt but show thinking process
				if eventType == "content_block_delta" {
					if delta, ok := eventData["delta"].(map[string]interface{}); ok {
						deltaType, _ := delta["type"].(string)
						if deltaType == "thinking_delta" {
							if thinking, ok := delta["thinking"].(string); ok {
								delta["thinking"] = transformers.FilterThinkingContent(thinking, true)
								modified = true
							}
						}
					}
				}

				// Filter content_block_start for thinking blocks
				if eventType == "content_block_start" {
					if contentBlock, ok := eventData["content_block"].(map[string]interface{}); ok {
						blockType, _ := contentBlock["type"].(string)
						if blockType == "thinking" {
							if thinking, ok := contentBlock["thinking"].(string); ok {
								contentBlock["thinking"] = transformers.FilterThinkingContent(thinking)
								modified = true
							}
						}
					}
				}

				// Capture usage from message_delta event
				if eventType == "message_delta" {
					if usageData, ok := eventData["usage"].(map[string]interface{}); ok {
						if ot, ok := usageData["output_tokens"].(float64); ok {
							totalOutputTokens = int64(ot)
						}
					}
				}

				// Capture usage from message_start event
				if eventType == "message_start" {
					if message, ok := eventData["message"].(map[string]interface{}); ok {
						if usageData, ok := message["usage"].(map[string]interface{}); ok {
							if it, ok := usageData["input_tokens"].(float64); ok {
								totalInputTokens = int64(it)
							}
							if cwt, ok := usageData["cache_creation_input_tokens"].(float64); ok {
								totalCacheWriteTokens = int64(cwt)
							}
							if cht, ok := usageData["cache_read_input_tokens"].(float64); ok {
								totalCacheHitTokens = int64(cht)
							}
						}
					}
				}

				// Re-serialize if modified
				if modified {
					if filtered, err := json.Marshal(eventData); err == nil {
						line = "data: " + string(filtered)
					}
				}
			}
		}

		fmt.Fprintf(w, "%s\n", line)
		flusher.Flush()
	}

	// Update usage after stream completes - only if no errors occurred
	if !hasError && (totalInputTokens > 0 || totalOutputTokens > 0) {
		billingTokens := config.CalculateBillingTokensWithCache(modelID, totalInputTokens, totalOutputTokens, totalCacheWriteTokens, totalCacheHitTokens)
		billingCost := config.CalculateBillingCostWithCache(modelID, totalInputTokens, totalOutputTokens, totalCacheWriteTokens, totalCacheHitTokens)
		if userApiKey != "" {
			if err := usage.UpdateUsage(userApiKey, billingTokens); err != nil {
				log.Printf("⚠️ Failed to update usage: %v", err)
			} else if debugMode {
				inputPrice, outputPrice := config.GetModelPricing(modelID)
				cacheWritePrice, cacheHitPrice := config.GetModelCachePricing(modelID)
				log.Printf("📊 Updated usage (stream): in=%d out=%d cache_write=%d cache_hit=%d, billing=%d (price: $%.2f/$%.2f/$%.2f/$%.2f/MTok)",
					totalInputTokens, totalOutputTokens, totalCacheWriteTokens, totalCacheHitTokens, billingTokens, inputPrice, outputPrice, cacheWritePrice, cacheHitPrice)
			}
			// Deduct credits and update tokensUsed for user
			if username != "" {
				if err := usage.DeductCreditsWithCache(username, billingCost, billingTokens, totalInputTokens, totalOutputTokens, totalCacheWriteTokens, totalCacheHitTokens); err != nil {
					log.Printf("⚠️ Failed to update user: %v", err)
				} else if debugMode {
					log.Printf("💰 Deducted $%.6f, used %d tokens for user %s", billingCost, billingTokens, username)
				}
				// Update Friend Key usage if applicable
				usage.UpdateFriendKeyUsageIfNeeded(userApiKey, modelID, billingCost)
			}
			// Log request for analytics (include latency)
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequestDetailed(usage.RequestLogParams{
				UserID:           username,
				UserKeyID:        userApiKey,
				TrollKeyID:       trollKeyID,
				Model:            modelID,
				InputTokens:      totalInputTokens,
				OutputTokens:     totalOutputTokens,
				CacheWriteTokens: totalCacheWriteTokens,
				CacheHitTokens:   totalCacheHitTokens,
				CreditsCost:      billingCost,
				CreditType:       "ohmygpt",
				TokensUsed:       billingTokens,
				StatusCode:       200,
				LatencyMs:        latencyMs,
			})
		}
	} else if hasError {
		log.Printf("⚠️ Skipping billing due to error in stream")
	}

	if err := scanner.Err(); err != nil {
		timeSinceLastEvent := time.Since(lastEventTime)
		log.Printf("❌ Error reading stream after %d events (duration: %v, last_event: %s, time_since_last: %v): %v",
			eventCount, time.Since(startTime), lastEventType, timeSinceLastEvent, err)
		// Send error event to client so they know stream failed (don't expose internal error)
		errorEvent := `event: error
data: {"type":"error","error":{"type":"stream_error","message":"Stream interrupted"}}

`
		fmt.Fprint(w, errorEvent)
		flusher.Flush()
	} else if eventCount == 0 {
		log.Printf("⚠️ Stream ended with 0 events (duration: %v)", time.Since(startTime))
	} else {
		log.Printf("✅ Stream completed: %d events in %v", eventCount, time.Since(startTime))
	}
}

// truncateErrorLog truncates error body for logging, keeping only the essential error message
func truncateErrorLog(errorBody string, maxLen int) string {
	if len(errorBody) <= maxLen {
		return errorBody
	}
	// Try to find just the error message part
	if idx := strings.Index(errorBody, `"message":`); idx != -1 {
		// Extract a reasonable portion starting from message
		end := idx + 200
		if end > len(errorBody) {
			end = len(errorBody)
		}
		return errorBody[idx:end] + "..."
	}
	return errorBody[:maxLen] + "..."
}

func main() {
	// Load .env file (if exists)
	if err := godotenv.Load("../.env"); err != nil {
		log.Printf("⚠️ No .env file found, using system environment variables")
	}

	// Initialize HTTP client
	initHTTPClient()

	// Check if debug mode is enabled
	if getEnv("DEBUG", "") == "true" {
		debugMode = true
		log.Printf("🐛 Debug mode enabled")
	}

	// Initialize MongoDB connection
	_ = db.GetClient() // This initializes the connection
	log.Printf("✅ MongoDB initialized")

	// Initialize rate limiter
	rateLimiter = ratelimit.NewRateLimiter()
	log.Printf("✅ Rate limiter initialized (Dev: 300 RPM, Pro: 1000 RPM)")

	// Initialize proxy pool and factory key pool
	proxyPool = proxy.GetPool()
	trollKeyPool = keypool.GetPool()

	// Start health checker
	healthChecker = proxy.NewHealthChecker(proxyPool)
	healthChecker.Start()

	// Start auto-reload for proxy bindings (default 30s, configurable via BINDING_RELOAD_INTERVAL)
	reloadInterval := 30 * time.Second
	if intervalStr := getEnv("BINDING_RELOAD_INTERVAL", ""); intervalStr != "" {
		if parsed, err := time.ParseDuration(intervalStr); err == nil {
			reloadInterval = parsed
		}
	}
	proxyPool.StartAutoReload(reloadInterval)
	trollKeyPool.StartAutoReload(reloadInterval)

	log.Printf("✅ Proxy pool loaded: %d proxies", proxyPool.GetProxyCount())
	log.Printf("✅ Troll key pool loaded: %d keys", trollKeyPool.GetKeyCount())

	// NEW MODEL-BASED ROUTING - BEGIN
	// Load Main Target Server configuration (for Sonnet 4.5 and Haiku 4.5)
	mainTargetServer = getEnv("MAIN_TARGET_SERVER", "")
	mainUpstreamKey = getEnv("MAIN_UPSTREAM_KEY", "")
	if mainTargetServer != "" && mainUpstreamKey != "" {
		maintarget.Configure(mainTargetServer, mainUpstreamKey)
		log.Printf("✅ Main Target Server configured: %s", mainTargetServer)
	} else {
		log.Printf("⚠️ Main Target Server not configured (Sonnet/Haiku will use Troll Key)")
	}

	// Load OpenHands configuration via TrollProxy (from MongoDB)
	if err := openhands.ConfigureOpenHands(); err != nil {
		log.Printf("⚠️ OpenHands configuration failed: %v", err)
	} else {
		openhandsProvider := openhands.GetOpenHands()
		if openhandsProvider.GetKeyCount() > 0 {
			// Start auto-reload for OpenHands keys
			openhandsProvider.StartAutoReload(reloadInterval)
			log.Printf("✅ OpenHands key pool loaded: %d keys", openhandsProvider.GetKeyCount())

			// Set proxy pool for OpenHands (use same pool as Troll)
			if proxyPool != nil && proxyPool.HasProxies() {
				openhandsProvider.SetProxyPool(proxyPool)
			}
		} else {
			log.Printf("⚠️ OpenHands not configured (no keys in openhands_keys collection)")
		}
	}

	// Load OpenHands LLM Proxy key pool (from MongoDB)
	openhandsKeyPool := openhandspool.GetPool()
	if openhandsKeyPool.GetKeyCount() > 0 {
		// Start auto-reload for OpenHands keys
		openhandsKeyPool.StartAutoReload(reloadInterval)
		log.Printf("✅ OpenHands key pool loaded: %d keys", openhandsKeyPool.GetKeyCount())
	} else {
		log.Printf("⚠️ OpenHands not configured (no keys in openhands_keys collection)")
	}

	// Start OpenHands backup key cleanup job (runs every 1 minute, deletes keys used > 12h)
	openhands.StartBackupKeyCleanupJob(1 * time.Minute)

	// Load OhMyGPT configuration via TrollProxy (from MongoDB)
	if err := ohmygpt.ConfigureOhMyGPT(); err != nil {
		log.Printf("⚠️ OhMyGPT configuration failed: %v", err)
	} else {
		ohmygptProvider := ohmygpt.GetOhMyGPT()
		if ohmygptProvider.GetKeyCount() > 0 {
			// Start auto-reload for OhMyGPT keys
			ohmygptProvider.StartAutoReload(reloadInterval)
			log.Printf("✅ OhMyGPT key pool loaded: %d keys", ohmygptProvider.GetKeyCount())

			// Set proxy pool for OhMyGPT (use same pool as Troll)
			if proxyPool != nil && proxyPool.HasProxies() {
				ohmygptProvider.SetProxyPool(proxyPool)
			}
		} else {
			log.Printf("⚠️ OhMyGPT not configured (no keys in ohmygpt_keys collection)")
		}
	}

	// Start OhMyGPT backup key cleanup job (runs every 1 minute, deletes keys used > 12h)
	ohmygpt.StartOhMyGPTBackupKeyCleanupJob(1 * time.Minute)

	// Initialize cache fallback detection
	cacheDetectionEnabled := getEnv("CACHE_FALLBACK_DETECTION", "false") == "true"
	cache.InitCacheDetector(
		cacheDetectionEnabled,
		parseInt(getEnv("CACHE_FALLBACK_THRESHOLD_COUNT", "5")),
		parseInt(getEnv("CACHE_FALLBACK_TIME_WINDOW_MIN", "1")),
		parseInt(getEnv("CACHE_FALLBACK_ALERT_INTERVAL_MIN", "5")),
		getEnv("RESEND_API_KEY", ""),
		getEnv("CACHE_FALLBACK_ALERT_EMAIL", ""),
	)

	// NEW MODEL-BASED ROUTING - END

	// Validate environment variables (TROLL_API_KEY is optional if using key pool from DB)
	trollAPIKey := getEnv("TROLL_API_KEY", "")

	proxyAPIKey := getEnv("PROXY_API_KEY", "")
	if proxyAPIKey != "" {
		log.Printf("🔐 Proxy mode: Enabled (external key required)")
	}

	if proxyPool.HasProxies() {
		log.Printf("🔐 Using proxy pool with %d proxies", proxyPool.GetProxyCount())
	} else if trollAPIKey != "" {
		log.Printf("🔐 Direct mode: Using TROLL_API_KEY (no proxies configured)")
	} else {
		log.Printf("⚠️ Warning: No proxies and no TROLL_API_KEY configured!")
	}

	// Load configuration
	configPath := getEnv("CONFIG_PATH", "config.json")
	log.Printf("📖 Loading configuration file: %s", configPath)

	cfg, err := config.LoadConfig(configPath)
	if err != nil {
		log.Fatalf("❌ Failed to load configuration: %v", err)
	}

	log.Printf("✅ Configuration loaded successfully")
	log.Printf("📍 Supported models (%d):", len(cfg.Models))
	for _, model := range cfg.Models {
		log.Printf("   • %s [%s]", model.ID, model.Type)
	}

	// Setup routes with CORS middleware
	http.HandleFunc("/health", corsMiddleware(healthHandler))
	http.HandleFunc("/keys/status", corsMiddleware(keysStatusHandler))
	http.HandleFunc("/openhands/backup-keys", corsMiddleware(openhandsBackupKeysHandler))
	http.HandleFunc("/v1/models", corsMiddleware(modelsHandler))
	http.HandleFunc("/v1/chat/completions", corsMiddleware(chatCompletionsHandler))
	http.HandleFunc("/v1/messages", corsMiddleware(handleAnthropicMessagesEndpoint))

	// Manual reload endpoint for admin to trigger binding refresh
	http.HandleFunc("/reload", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodPost {
			http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		log.Printf("🔄 Manual reload triggered")

		// Reload proxy pool
		if err := proxyPool.Reload(); err != nil {
			log.Printf("❌ Proxy pool reload failed: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   "Proxy pool reload failed: " + err.Error(),
			})
			return
		}

		// Reload troll key pool
		if err := trollKeyPool.Reload(); err != nil {
			log.Printf("⚠️ Troll key pool reload failed: %v", err)
		}

		// Reload OpenHands keys and bindings
		openhandsReloaded := false
		openhandsKeyCount := 0
		if openhandsProv := openhands.GetOpenHands(); openhandsProv != nil {
			if err := openhandsProv.Reload(); err != nil {
				log.Printf("⚠️ OpenHands reload failed: %v", err)
			} else {
				openhandsReloaded = true
				openhandsKeyCount = openhandsProv.GetKeyCount()
				log.Printf("✅ OpenHands reloaded: %d keys", openhandsKeyCount)
			}
		}

		// Reload OhMyGPT keys and bindings
		ohmygptReloaded := false
		ohmygptKeyCount := 0
		if ohmygptProv := ohmygpt.GetOhMyGPT(); ohmygptProv != nil {
			if err := ohmygptProv.Reload(); err != nil {
				log.Printf("⚠️ OhMyGPT reload failed: %v", err)
			} else {
				ohmygptReloaded = true
				ohmygptKeyCount = ohmygptProv.GetKeyCount()
				log.Printf("✅ OhMyGPT reloaded: %d keys", ohmygptKeyCount)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":            true,
			"message":            "All pools reloaded successfully",
			"proxy_count":        proxyPool.GetProxyCount(),
			"bindings":           proxyPool.GetBindingsInfo(),
			"openhands_reloaded": openhandsReloaded,
			"openhands_keys":     openhandsKeyCount,
			"ohmygpt_reloaded":   ohmygptReloaded,
			"ohmygpt_keys":       ohmygptKeyCount,
		})
	}))

	// Root path
	http.HandleFunc("/", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.Error(w, `{"error": {"message": "Not found", "type": "invalid_request_error"}}`, http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"service": "trolLLM - We Troll So You Don't Have To",
			"version": "999.999.999",
			"endpoints": []string{
				"/health",
				"/v1/models",
				"/v1/chat/completions",
				"/v1/messages",
			},
		}); err != nil {
			log.Printf("Error: failed to encode response: %v", err)
		}
	}))

	// Start server
	port := fmt.Sprintf(":%d", cfg.Port)
	server := &http.Server{
		Addr:         port,
		ReadTimeout:  120 * time.Second,
		WriteTimeout: 300 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Printf("🚀 Service started at http://localhost%s", port)
	log.Printf("📖 Documentation: http://localhost%s/docs", port)

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("❌ Server failed to start: %v", err)
	}
}
