package main

import (
	"bufio"
	"bytes"
	"compress/gzip"
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
	"goproxy/internal/keypool"
	"goproxy/internal/maintarget"
	"goproxy/internal/proxy"
	"goproxy/internal/ratelimit"
	"goproxy/internal/usage"
	"goproxy/internal/userkey"
	"goproxy/transformers"

	"github.com/andybalholm/brotli"
	"github.com/joho/godotenv"
	"golang.org/x/net/http2"
)

var (
	startTime      = time.Now()
	httpClient    *http.Client
	debugMode     = false // Debug mode, disabled by default
	proxyPool     *proxy.ProxyPool
	trollKeyPool  *keypool.KeyPool
	healthChecker *proxy.HealthChecker
	rateLimiter    *ratelimit.RateLimiter
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

	// Create HTTP/2 capable Transport
	transport := &http.Transport{
		TLSClientConfig:       tlsConfig,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          100,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
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
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
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
	"http://localhost:3000":      true,
	"http://localhost:3001":      true,
	"https://trollllm.xyz":       true,
	"https://www.trollllm.xyz":   true,
	"https://api.trollllm.xyz":   true,
	"https://chat.trollllm.xyz":  true,
}

// corsMiddleware wraps handlers with CORS support
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if corsAllowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
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
func checkRateLimit(w http.ResponseWriter, apiKey string) bool {
	// Default limit for unknown users
	limit := ratelimit.DefaultRPM

	// Lookup user to get tier-specific limit
	user, err := userkey.GetKeyByID(apiKey)
	if err == nil && user != nil {
		limit = user.GetRPMLimit()
	}

	// Check rate limit
	if !rateLimiter.Allow(apiKey, limit) {
		retryAfter := rateLimiter.RetryAfter(apiKey, limit)
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
		w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
		w.Header().Set("X-RateLimit-Remaining", "0")
		w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Duration(retryAfter)*time.Second).Unix(), 10))
		w.WriteHeader(http.StatusTooManyRequests)
		w.Write([]byte(`{"error": {"message": "Rate limit exceeded. Please retry after ` + strconv.Itoa(retryAfter) + ` seconds.", "type": "rate_limit_error"}}`))
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

// Model list endpoint
func modelsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	models := config.GetAllModels()
	openaiModels := make([]map[string]interface{}, 0, len(models))

	for _, model := range models {
		openaiModels = append(openaiModels, map[string]interface{}{
			"id":       model.ID,
			"object":   "model",
			"created":  time.Now().Unix(),
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

// API documentation endpoint
func docsHandler(w http.ResponseWriter, r *http.Request) {
	htmlContent, err := os.ReadFile("docs.html")
	if err != nil {
		http.Error(w, "Documentation not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if _, err := w.Write(htmlContent); err != nil {
		log.Printf("Error: failed to write response: %v", err)
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
	
	if proxyAPIKey != "" {
		// Validate with fixed PROXY_API_KEY from env
		if clientAPIKey != proxyAPIKey {
			log.Printf("❌ API Key validation failed (env): %s", clientKeyMask)
			http.Error(w, `{"error": {"message": "Invalid API key", "type": "authentication_error"}}`, http.StatusUnauthorized)
			return
		}
		log.Printf("🔑 Key validated (env): %s", clientKeyMask)
	} else {
		// Validate from MongoDB user_keys collection
		userKey, err := userkey.ValidateKey(clientAPIKey)
		if err != nil {
			log.Printf("❌ API Key validation failed (db): %s - %v", clientKeyMask, err)
			if err == userkey.ErrQuotaExhausted {
				http.Error(w, `{"error": {"message": "Token quota exhausted", "type": "rate_limit_error"}}`, http.StatusTooManyRequests)
			} else if err == userkey.ErrKeyRevoked {
				http.Error(w, `{"error": {"message": "API key has been revoked", "type": "authentication_error"}}`, http.StatusUnauthorized)
			} else {
				http.Error(w, `{"error": {"message": "Invalid API key", "type": "authentication_error"}}`, http.StatusUnauthorized)
			}
			return
		}
		log.Printf("🔑 Key validated (db): %s [%s]", clientKeyMask, userKey.Tier)
		username = userKey.Name // Store username for credit deduction

		// Check if Free Tier user - block access
		if userKey.IsFreeUser() {
			log.Printf("🚫 Free Tier user blocked: %s", clientKeyMask)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(`{"error": {"message": "Free Tier users cannot access this API. Please upgrade your plan.", "type": "free_tier_restricted"}}`))
			return
		}
	}

	// Check rate limit
	if !checkRateLimit(w, clientAPIKey) {
		return
	}

	// OLD CODE - BEGIN (proxy/key selection moved after model parsing for model-based routing)
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

	// Check if model is supported
	model := config.GetModelByID(openaiReq.Model)
	if model == nil {
		log.Printf("❌ Unsupported model: %s", openaiReq.Model)
		http.Error(w, fmt.Sprintf(`{"error": {"message": "Model '%s' not found", "type": "invalid_request_error"}}`, openaiReq.Model), http.StatusNotFound)
		return
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

	// Route request based on model type and upstream
	switch model.Type {
	case "anthropic":
		handleAnthropicRequest(w, r, &openaiReq, model, authHeader, selectedProxy, clientAPIKey, trollKeyID, username, upstreamConfig, bodyBytes)
	case "openai":
		// For "main" upstream: route to Main Target Server with OpenAI response format
		if upstreamConfig.KeyID == "main" {
			handleMainTargetRequestOpenAI(w, &openaiReq, bodyBytes, model.ID, clientAPIKey, username)
		} else {
			handleTrollOpenAIRequest(w, r, &openaiReq, model, authHeader, selectedProxy, clientAPIKey, trollKeyID, username, bodyBytes)
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
			log.Printf("⚠️ Failed to create proxy client, falling back to direct: %v", err)
		} else {
			client = proxyClient
		}
	}
	
	requestStartTime := time.Now()
	
	resp, err := client.Do(proxyReq)
	if err != nil {
		log.Printf("Error: request failed: %v", err)
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
func handleMainTargetRequest(w http.ResponseWriter, openaiReq *transformers.OpenAIRequest, bodyBytes []byte, modelID string, userApiKey string, username string) {
	if !maintarget.IsConfigured() {
		http.Error(w, `{"error": {"message": "Main target not configured", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	// Transform OpenAI -> Anthropic (minimal, no thinking/system prompt)
	anthropicBody, isStreaming, err := maintarget.TransformOpenAIToAnthropic(bodyBytes)
	if err != nil {
		log.Printf("❌ [MainTarget] Transform error: %v", err)
		http.Error(w, `{"error": {"message": "Failed to transform request", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	log.Printf("📤 [MainTarget] Forwarding to %s (stream=%v)", maintarget.GetServerURL(), isStreaming)

	// Forward to main target
	requestStartTime := time.Now()
	resp, err := maintarget.ForwardRequest(anthropicBody, isStreaming)
	if err != nil {
		log.Printf("❌ [MainTarget] Request failed: %v", err)
		http.Error(w, `{"error": {"message": "Request to main target failed", "type": "upstream_error"}}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Usage callback
	onUsage := func(input, output, cacheWrite, cacheHit int64) {
		billingTokens := config.CalculateBillingTokens(modelID, input, output)
		billingCost := config.CalculateBillingCostWithCache(modelID, input, output, cacheWrite, cacheHit)
		
		if userApiKey != "" {
			usage.UpdateUsage(userApiKey, billingTokens)
			if username != "" {
				usage.DeductCredits(username, billingCost, billingTokens)
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
				TokensUsed:       billingTokens,
				StatusCode:       resp.StatusCode,
				LatencyMs:        latencyMs,
			})
		}
		log.Printf("📊 [MainTarget] Usage: in=%d out=%d cost=$%.6f", input, output, billingCost)
	}

	// Handle response (Anthropic format)
	if isStreaming {
		maintarget.HandleStreamResponse(w, resp, onUsage)
	} else {
		maintarget.HandleNonStreamResponse(w, resp, onUsage)
	}
}

// handleMainTargetRequestOpenAI handles requests routed to main target with OpenAI format response
func handleMainTargetRequestOpenAI(w http.ResponseWriter, openaiReq *transformers.OpenAIRequest, bodyBytes []byte, modelID string, userApiKey string, username string) {
	if !maintarget.IsConfigured() {
		http.Error(w, `{"error": {"message": "Main target not configured", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	// Transform OpenAI -> Anthropic
	anthropicBody, isStreaming, err := maintarget.TransformOpenAIToAnthropic(bodyBytes)
	if err != nil {
		log.Printf("❌ [MainTarget-OpenAI] Transform error: %v", err)
		http.Error(w, `{"error": {"message": "Failed to transform request", "type": "server_error"}}`, http.StatusInternalServerError)
		return
	}

	log.Printf("📤 [MainTarget-OpenAI] Forwarding to %s (stream=%v)", maintarget.GetServerURL(), isStreaming)

	// Forward to main target
	requestStartTime := time.Now()
	resp, err := maintarget.ForwardRequest(anthropicBody, isStreaming)
	if err != nil {
		log.Printf("❌ [MainTarget-OpenAI] Request failed: %v", err)
		http.Error(w, `{"error": {"message": "Request to main target failed", "type": "upstream_error"}}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Usage callback
	onUsage := func(input, output, cacheWrite, cacheHit int64) {
		billingTokens := config.CalculateBillingTokens(modelID, input, output)
		billingCost := config.CalculateBillingCostWithCache(modelID, input, output, cacheWrite, cacheHit)
		
		if userApiKey != "" {
			usage.UpdateUsage(userApiKey, billingTokens)
			if username != "" {
				usage.DeductCredits(username, billingCost, billingTokens)
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
				TokensUsed:       billingTokens,
				StatusCode:       resp.StatusCode,
				LatencyMs:        latencyMs,
			})
		}
		log.Printf("📊 [MainTarget-OpenAI] Usage: in=%d out=%d cost=$%.6f", input, output, billingCost)
	}

	// Handle response (transform to OpenAI format)
	if isStreaming {
		maintarget.HandleStreamResponseOpenAI(w, resp, modelID, onUsage)
	} else {
		maintarget.HandleNonStreamResponseOpenAI(w, resp, modelID, onUsage)
	}
}

// handleMainTargetMessagesRequest handles /v1/messages requests routed to main target
// Forwards the original Anthropic request as-is (no transformation)
func handleMainTargetMessagesRequest(w http.ResponseWriter, originalBody []byte, isStreaming bool, modelID string, userApiKey string, username string) {
	if !maintarget.IsConfigured() {
		http.Error(w, `{"type":"error","error":{"type":"server_error","message":"Main target not configured"}}`, http.StatusInternalServerError)
		return
	}

	log.Printf("📤 [MainTarget] Forwarding /v1/messages to %s (stream=%v)", maintarget.GetServerURL(), isStreaming)

	// Forward original request body as-is
	requestStartTime := time.Now()
	resp, err := maintarget.ForwardRequest(originalBody, isStreaming)
	if err != nil {
		log.Printf("❌ [MainTarget] Request failed: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Request to main target failed"}}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Usage callback
	onUsage := func(input, output, cacheWrite, cacheHit int64) {
		billingTokens := config.CalculateBillingTokens(modelID, input, output)
		billingCost := config.CalculateBillingCostWithCache(modelID, input, output, cacheWrite, cacheHit)
		
		if userApiKey != "" {
			usage.UpdateUsage(userApiKey, billingTokens)
			if username != "" {
				usage.DeductCredits(username, billingCost, billingTokens)
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
				TokensUsed:       billingTokens,
				StatusCode:       resp.StatusCode,
				LatencyMs:        latencyMs,
			})
		}
		log.Printf("📊 [MainTarget] Usage: in=%d out=%d cost=$%.6f", input, output, billingCost)
	}

	// Handle response
	if isStreaming {
		maintarget.HandleStreamResponse(w, resp, onUsage)
	} else {
		maintarget.HandleNonStreamResponse(w, resp, onUsage)
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
			log.Printf("⚠️ Failed to create proxy client, falling back to direct: %v", err)
		} else {
			client = proxyClient
		}
	}
	
	// Track request start time for latency measurement
	requestStartTime := time.Now()
	
	resp, err := client.Do(proxyReq)
	if err != nil {
		log.Printf("Error: request failed: %v", err)
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
		// Forward error response directly
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		if _, err := w.Write(body); err != nil {
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
		billingTokens := config.CalculateBillingTokens(modelID, inputTokens, outputTokens)
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
				if err := usage.DeductCredits(username, billingCost, billingTokens); err != nil {
					log.Printf("⚠️ Failed to update user: %v", err)
				} else if debugMode {
					log.Printf("💰 Deducted $%.6f, used %d tokens for user %s", billingCost, billingTokens, username)
				}
			}
			// Log request for analytics (include latency)
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequestDetailed(usage.RequestLogParams{
				UserID:           username,
				UserKeyID:        userApiKey,
				TrollKeyID:     trollKeyID,
				Model:            modelID,
				InputTokens:      inputTokens,
				OutputTokens:     outputTokens,
				CacheWriteTokens: cacheWriteTokens,
				CacheHitTokens:   cacheHitTokens,
				CreditsCost:      billingCost,
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
	// Log error responses from upstream
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("❌ [%s] Upstream error %d: %s", trollKeyID, resp.StatusCode, string(body))
		// Log failed request for analytics
		if userApiKey != "" {
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequest(userApiKey, trollKeyID, 0, resp.StatusCode, latencyMs)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
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

	// Transform streaming response
	outputChan := transformer.TransformStream(resp.Body)

	for chunk := range outputChan {
		if _, err := fmt.Fprint(w, chunk); err != nil {
			log.Printf("Error: failed to write streaming response: %v", err)
			return
		}
		flusher.Flush()
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
		// Forward error response directly
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		if _, err := w.Write(body); err != nil {
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
		billingTokens := config.CalculateBillingTokens(modelID, inputTokens, outputTokens)
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
				if err := usage.DeductCredits(username, billingCost, billingTokens); err != nil {
					log.Printf("⚠️ Failed to update user: %v", err)
				} else if debugMode {
					log.Printf("💰 Deducted $%.6f, used %d tokens for user %s", billingCost, billingTokens, username)
				}
			}
			// Log request for analytics (include latency)
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequestDetailed(usage.RequestLogParams{
				UserID:           username,
				UserKeyID:        userApiKey,
				TrollKeyID:     trollKeyID,
				Model:            modelID,
				InputTokens:      inputTokens,
				OutputTokens:     outputTokens,
				CacheWriteTokens: cacheWriteTokens,
				CacheHitTokens:   cacheHitTokens,
				CreditsCost:      billingCost,
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

	// Transform streaming response
	outputChan := transformer.TransformStream(resp.Body)

	for chunk := range outputChan {
		if _, err := fmt.Fprint(w, chunk); err != nil {
			log.Printf("Error: failed to write streaming response: %v", err)
			return
		}
		flusher.Flush()
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
	
	if proxyAPIKey != "" {
		// Validate with fixed PROXY_API_KEY from env
		if clientAPIKey != proxyAPIKey {
			log.Printf("❌ API Key validation failed (env): %s", clientKeyMask)
			http.Error(w, `{"type":"error","error":{"type":"authentication_error","message":"Invalid API key"}}`, http.StatusUnauthorized)
			return
		}
		log.Printf("🔑 Key validated (env): %s", clientKeyMask)
	} else {
		// Validate from MongoDB user_keys collection
		userKey, err := userkey.ValidateKey(clientAPIKey)
		if err != nil {
			log.Printf("❌ API Key validation failed (db): %s - %v", clientKeyMask, err)
			if err == userkey.ErrQuotaExhausted {
				http.Error(w, `{"type":"error","error":{"type":"rate_limit_error","message":"Token quota exhausted"}}`, http.StatusTooManyRequests)
			} else if err == userkey.ErrKeyRevoked {
				http.Error(w, `{"type":"error","error":{"type":"authentication_error","message":"API key has been revoked"}}`, http.StatusUnauthorized)
			} else {
				http.Error(w, `{"type":"error","error":{"type":"authentication_error","message":"Invalid API key"}}`, http.StatusUnauthorized)
			}
			return
		}
		log.Printf("🔑 Key validated (db): %s [%s]", clientKeyMask, userKey.Tier)
		username = userKey.Name // Store username for credit deduction
	}

	// Check rate limit
	if !checkRateLimit(w, clientAPIKey) {
		return
	}

	// OLD CODE - BEGIN (proxy/key selection moved after model parsing for model-based routing)
	// // Get factory key from proxy pool or environment
	// var selectedProxy *proxy.Proxy
	// var trollAPIKey string
	// var trollKeyID string
	// 
	// if proxyPool != nil && proxyPool.HasProxies() {
	// 	// Use proxy pool - sticky routing based on client API key
	// 	var err error
	// 	selectedProxy, trollKeyID, err = proxyPool.SelectProxyWithKeyByClient(clientAPIKey)
	// 	if err != nil {
	// 		log.Printf("❌ Failed to select proxy: %v", err)
	// 		http.Error(w, `{"type":"error","error":{"type":"server_error","message":"No available proxies"}}`, http.StatusServiceUnavailable)
	// 		return
	// 	}
	// 	trollAPIKey = trollKeyPool.GetAPIKey(trollKeyID)
	// 	if trollAPIKey == "" {
	// 		log.Printf("❌ Troll key %s not found in pool", trollKeyID)
	// 		http.Error(w, `{"type":"error","error":{"type":"server_error","message":"Server configuration error"}}`, http.StatusInternalServerError)
	// 		return
	// 	}
	// 	log.Printf("🔄 [Anthropic] Using proxy %s with key %s", selectedProxy.Name, trollKeyID)
	// } else {
	// 	// Fallback to environment variable
	// 	trollAPIKey = getEnv("TROLL_API_KEY", "")
	// 	trollKeyID = "env"
	// 	if trollAPIKey == "" {
	// 		log.Printf("❌ No proxies configured and TROLL_API_KEY not set")
	// 		http.Error(w, `{"type":"error","error":{"type":"server_error","message":"Server configuration error"}}`, http.StatusInternalServerError)
	// 		return
	// 	}
	// }
	// authHeader = "Bearer " + trollAPIKey
	// OLD CODE - END

	// Read request body (no parsing - direct pass-through)
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"invalid_request_error","message":"Failed to read request body"}}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if debugMode {
		log.Printf("📥 /v1/messages request received")
		log.Printf("📥 Body: %s", string(bodyBytes))
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

	// NEW MODEL-BASED ROUTING - BEGIN
	// Select upstream based on model configuration
	upstreamConfig, selectedProxy, err := selectUpstreamConfig(model.ID, clientAPIKey)
	if err != nil {
		log.Printf("❌ Failed to select upstream: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"server_error","message":"Server configuration error"}}`, http.StatusInternalServerError)
		return
	}
	authHeader = "Bearer " + upstreamConfig.APIKey
	trollKeyID := upstreamConfig.KeyID

	// For "main" upstream: forward original request as-is (no transformation)
	if upstreamConfig.KeyID == "main" {
		handleMainTargetMessagesRequest(w, bodyBytes, stream, anthropicReq.Model, clientAPIKey, username)
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
	if debugMode {
		log.Printf("🔍 System prompt check: len(System)=%d", len(anthropicReq.System))
	}
	userSystemCount := len(anthropicReq.System)
	userSystemText := sanitizeBlockedContent(combineSystemText(anthropicReq.System))
	systemPrompt := config.GetSystemPrompt()
	if systemPrompt != "" {
		if debugMode {
			log.Printf("🔍 System prompt from config: %q", systemPrompt)
		}
		anthropicReq.System = []map[string]interface{}{
			{
				"type": "text",
				"text": systemPrompt,
			},
		}
		if debugMode {
			log.Printf("✅ Enforced proxy system prompt")
		}
	} else {
		anthropicReq.System = nil
	}
	if userSystemText != "" && userSystemCount > 0 {
		prepend := transformers.AnthropicMessage{
			Role: "user",
			Content: []map[string]interface{}{
				{
					"type": "text",
					"text": userSystemText,
				},
			},
		}
		anthropicReq.Messages = append([]transformers.AnthropicMessage{prepend}, anthropicReq.Messages...)
		if debugMode {
			log.Printf("🔁 Moved %d system instructions into conversation", userSystemCount)
		}
	}

	// Let client control thinking - don't force disable
	// Claude needs thinking to reason before calling tools
	if anthropicReq.Thinking != nil {
		log.Printf("🧠 Client requested thinking (budget: %d)", anthropicReq.Thinking.BudgetTokens)
	}
	
	// Log thinking status
	if anthropicReq.Thinking != nil {
		log.Printf("🧠 Thinking: ENABLED (budget: %d)", anthropicReq.Thinking.BudgetTokens)
	} else {
		log.Printf("🧠 Thinking: DISABLED")
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
		http.Error(w, `{"type":"error","error":{"type":"server_error","message":"Failed to serialize request"}}`, http.StatusInternalServerError)
		return
	}

	if debugMode {
		log.Printf("📤 /v1/messages request body:")
		log.Printf("📤 %s", string(reqBody))
	}

	// Create request to upstream (Factory AI or Main Target Server)
	// OLD CODE: proxyReq, err := http.NewRequest(http.MethodPost, endpoint.BaseURL, bytes.NewBuffer(reqBody))
	proxyReq, err := http.NewRequest(http.MethodPost, endpointURL, bytes.NewBuffer(reqBody))
	if err != nil {
		log.Printf("Error creating request: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"server_error","message":"Failed to create request"}}`, http.StatusInternalServerError)
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
			log.Printf("⚠️ Failed to create proxy client, falling back to direct: %v", err)
		} else {
			client = proxyClient
		}
	}
	
	// Log upstream destination
	if upstreamConfig.KeyID == "main" {
		log.Printf("📤 Sending request to Main Target Server (%s)...", mainTargetServer)
		log.Printf("📤 [main] URL: %s", endpointURL)
		log.Printf("📤 [main] Headers: x-api-key=%s, anthropic-version=%s", 
			headers["x-api-key"][:min(8, len(headers["x-api-key"]))]+"...", 
			headers["anthropic-version"])
		// Log request body (truncated)
		if len(reqBody) < 500 {
			log.Printf("📤 [main] Body: %s", string(reqBody))
		} else {
			log.Printf("📤 [main] Body (truncated): %s...", string(reqBody[:500]))
		}
	} else {
		log.Printf("📤 Sending request to Factory API...")
	}
	reqStart := time.Now()
	resp, err := client.Do(proxyReq)
	if err != nil {
		log.Printf("❌ Request failed after %v: %v", time.Since(reqStart), err)
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
		http.Error(w, `{"type":"error","error":{"type":"server_error","message":"Failed to read response"}}`, http.StatusInternalServerError)
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

	// Log failed request for analytics
	if resp.StatusCode != http.StatusOK {
		if userApiKey != "" {
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequest(userApiKey, trollKeyID, 0, resp.StatusCode, latencyMs)
		}
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
				billingTokens := config.CalculateBillingTokens(modelID, inputTokens, outputTokens)
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
						if err := usage.DeductCredits(username, billingCost, billingTokens); err != nil {
							log.Printf("⚠️ Failed to update user: %v", err)
						} else if debugMode {
							log.Printf("💰 Deducted $%.6f, used %d tokens for user %s", billingCost, billingTokens, username)
						}
					}
					// Log request for analytics (include latency)
					latencyMs := time.Since(requestStartTime).Milliseconds()
					usage.LogRequestDetailed(usage.RequestLogParams{
						UserID:           username,
						UserKeyID:        userApiKey,
						TrollKeyID:     trollKeyID,
						Model:            modelID,
						InputTokens:      inputTokens,
						OutputTokens:     outputTokens,
						CacheWriteTokens: cacheWriteTokens,
						CacheHitTokens:   cacheHitTokens,
						CreditsCost:      billingCost,
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
						// Redact thinking blocks - hide system prompt from users
						if blockType, ok := block["type"].(string); ok && blockType == "thinking" {
							block["thinking"] = "[redacted]"
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
	
	// If not 200, log response body for debugging
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("❌ Stream error response: %s", string(body))
		// Log failed request for analytics
		if userApiKey != "" {
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequest(userApiKey, trollKeyID, 0, resp.StatusCode, latencyMs)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
		return
	}
	
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, `{"type":"error","error":{"type":"server_error","message":"Streaming not supported"}}`, http.StatusInternalServerError)
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
				
				// Check if this is a content_block_delta - redact thinking content
				if eventType == "content_block_delta" {
					if delta, ok := eventData["delta"].(map[string]interface{}); ok {
						deltaType, _ := delta["type"].(string)
						// Redact thinking delta - hide system prompt from users
						if deltaType == "thinking_delta" {
							delta["thinking"] = ""
							modified = true
						}
					}
				}
				
				// Redact content_block_start for thinking blocks
				if eventType == "content_block_start" {
					if contentBlock, ok := eventData["content_block"].(map[string]interface{}); ok {
						blockType, _ := contentBlock["type"].(string)
						if blockType == "thinking" {
							contentBlock["thinking"] = "[redacted]"
							modified = true
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

	// Update usage after stream completes
	if totalInputTokens > 0 || totalOutputTokens > 0 {
		billingTokens := config.CalculateBillingTokens(modelID, totalInputTokens, totalOutputTokens)
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
				if err := usage.DeductCredits(username, billingCost, billingTokens); err != nil {
					log.Printf("⚠️ Failed to update user: %v", err)
				} else if debugMode {
					log.Printf("💰 Deducted $%.6f, used %d tokens for user %s", billingCost, billingTokens, username)
				}
			}
			// Log request for analytics (include latency)
			latencyMs := time.Since(requestStartTime).Milliseconds()
			usage.LogRequestDetailed(usage.RequestLogParams{
				UserID:           username,
				UserKeyID:        userApiKey,
				TrollKeyID:     trollKeyID,
				Model:            modelID,
				InputTokens:      totalInputTokens,
				OutputTokens:     totalOutputTokens,
				CacheWriteTokens: totalCacheWriteTokens,
				CacheHitTokens:   totalCacheHitTokens,
				CreditsCost:      billingCost,
				TokensUsed:       billingTokens,
				StatusCode:       200,
				LatencyMs:        latencyMs,
			})
		}
	}

	if err := scanner.Err(); err != nil {
		timeSinceLastEvent := time.Since(lastEventTime)
		log.Printf("❌ Error reading stream after %d events (duration: %v, last_event: %s, time_since_last: %v): %v", 
			eventCount, time.Since(startTime), lastEventType, timeSinceLastEvent, err)
		// Send error event to client so they know stream failed
		errorEvent := fmt.Sprintf("event: error\ndata: {\"type\":\"error\",\"error\":{\"type\":\"stream_error\",\"message\":\"Stream interrupted: %s\"}}\n\n", err.Error())
		fmt.Fprint(w, errorEvent)
		flusher.Flush()
	} else if eventCount == 0 {
		log.Printf("⚠️ Stream ended with 0 events (duration: %v)", time.Since(startTime))
	} else {
		log.Printf("✅ Stream completed: %d events in %v", eventCount, time.Since(startTime))
	}
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
	http.HandleFunc("/v1/models", corsMiddleware(modelsHandler))
	http.HandleFunc("/v1/chat/completions", corsMiddleware(chatCompletionsHandler))
	http.HandleFunc("/v1/messages", corsMiddleware(handleAnthropicMessagesEndpoint))
	http.HandleFunc("/docs", corsMiddleware(docsHandler))

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
