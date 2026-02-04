package openhands

import (
	"bufio"
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"goproxy/config"
	"goproxy/db"
	"goproxy/internal/proxy"

	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/net/http2"
)

const (
	OpenHandsBaseURL             = "https://llm-proxy.app.all-hands.dev"
	OpenHandsMessagesEndpoint    = OpenHandsBaseURL + "/v1/messages"
	OpenHandsCompletionsEndpoint = OpenHandsBaseURL + "/v1/chat/completions"
	OpenHandsEndpoint            = OpenHandsCompletionsEndpoint // default for OpenAI format
	OpenHandsName                = "openhands"
)

// OpenHandsKeyStatus represents the health status of an API key
type OpenHandsKeyStatus string

const (
	OpenHandsStatusHealthy     OpenHandsKeyStatus = "healthy"
	OpenHandsStatusRateLimited OpenHandsKeyStatus = "rate_limited"
	OpenHandsStatusExhausted   OpenHandsKeyStatus = "exhausted"
	OpenHandsStatusError       OpenHandsKeyStatus = "error"
)

// OpenHandsKey represents a single API key stored in MongoDB
type OpenHandsKey struct {
	ID            string             `bson:"_id" json:"id"`
	APIKey        string             `bson:"apiKey" json:"api_key"`
	Status        OpenHandsKeyStatus `bson:"status" json:"status"`
	TokensUsed    int64              `bson:"tokensUsed" json:"tokens_used"`
	RequestsCount int64              `bson:"requestsCount" json:"requests_count"`
	LastError     string             `bson:"lastError,omitempty" json:"last_error,omitempty"`
	CooldownUntil *time.Time         `bson:"cooldownUntil,omitempty" json:"cooldown_until,omitempty"`
	CreatedAt     time.Time          `bson:"createdAt" json:"created_at"`
	// Spend tracking fields
	LastUsedAt     *time.Time `bson:"lastUsedAt,omitempty" json:"last_used_at,omitempty"`
	TotalSpend     float64    `bson:"totalSpend" json:"total_spend"`
	LastSpendCheck *time.Time `bson:"lastSpendCheck,omitempty" json:"last_spend_check,omitempty"`
}

// IsAvailable returns true if the key is available for use
func (k *OpenHandsKey) IsAvailable() bool {
	if k.Status == OpenHandsStatusExhausted {
		return false
	}
	if k.Status != OpenHandsStatusHealthy {
		if k.CooldownUntil != nil && time.Now().After(*k.CooldownUntil) {
			return true // Cooldown expired
		}
		return false
	}
	return true
}

// OpenHandsKeyBinding represents a proxy-key binding
type OpenHandsKeyBinding struct {
	ProxyID        string    `bson:"proxyId" json:"proxy_id"`
	OpenHandsKeyID string    `bson:"openhandsKeyId" json:"openhands_key_id"`
	Priority       int       `bson:"priority" json:"priority"`
	IsActive       bool      `bson:"isActive" json:"is_active"`
	CreatedAt      time.Time `bson:"createdAt" json:"created_at"`
}

// OpenHandsProvider implements Provider interface for OpenHands with MongoDB key pool
type OpenHandsProvider struct {
	keys          []*OpenHandsKey
	bindings      map[string][]*OpenHandsKeyBinding // proxyId -> bindings
	current       int
	keyIndex      map[string]int // proxyId -> current key index for rotation
	lastUsedKeyID string
	lastUsedProxy string
	client        *http.Client
	proxyPool     *proxy.ProxyPool
	useProxy      bool
	mu            sync.Mutex
}

var openhandsInstance *OpenHandsProvider
var openhandsOnce sync.Once

// GetOpenHands returns the singleton OpenHands provider instance
func GetOpenHands() *OpenHandsProvider {
	openhandsOnce.Do(func() {
		openhandsInstance = &OpenHandsProvider{
			keys:     make([]*OpenHandsKey, 0),
			bindings: make(map[string][]*OpenHandsKeyBinding),
			keyIndex: make(map[string]int),
			current:  0,
		}
	})
	return openhandsInstance
}

// ConfigureOpenHands initializes the OpenHands provider and loads keys from MongoDB
func ConfigureOpenHands() error {
	provider := GetOpenHands()
	provider.client = createOpenHandsClient()

	if err := provider.LoadKeys(); err != nil {
		return err
	}

	// Register with TrollProxy registry
	RegisterProvider(OpenHandsName, provider)
	return nil
}

// SetProxyPool sets the proxy pool to use for requests
func (p *OpenHandsProvider) SetProxyPool(pool *proxy.ProxyPool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.proxyPool = pool
	p.useProxy = pool != nil && pool.HasProxies()
	if p.useProxy {
		log.Printf("✅ [Troll-LLM] Proxy pool enabled (%d proxies)", pool.GetProxyCount())
	} else {
		log.Printf("ℹ️ [Troll-LLM] Running without proxy (direct connection)")
	}
}

// LoadKeys loads OpenHands keys and bindings from MongoDB
func (p *OpenHandsProvider) LoadKeys() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Load keys
	cursor, err := db.OpenHandsKeysCollection().Find(ctx, bson.M{})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	p.mu.Lock()
	defer p.mu.Unlock()

	p.keys = make([]*OpenHandsKey, 0)
	for cursor.Next(ctx) {
		var key OpenHandsKey
		if err := cursor.Decode(&key); err != nil {
			log.Printf("⚠️ [Troll-LLM] Failed to decode key: %v", err)
			continue
		}
		p.keys = append(p.keys, &key)
	}

	// Load bindings from openhands_bindings collection
	p.bindings = make(map[string][]*OpenHandsKeyBinding)
	bindingsCol := db.GetCollection("openhands_bindings")
	if bindingsCol != nil {
		bindingsCursor, err := bindingsCol.Find(ctx, bson.M{"isActive": true})
		if err == nil {
			defer bindingsCursor.Close(ctx)
			for bindingsCursor.Next(ctx) {
				var binding OpenHandsKeyBinding
				if err := bindingsCursor.Decode(&binding); err != nil {
					log.Printf("⚠️ [Troll-LLM] Failed to decode binding: %v", err)
					continue
				}
				p.bindings[binding.ProxyID] = append(p.bindings[binding.ProxyID], &binding)
			}
		}
	}

	// Log all loaded keys for debugging
	log.Printf("✅ [Troll-LLM] Loaded %d OpenHands keys:", len(p.keys))
	for i, key := range p.keys {
		log.Printf("   [%d] ID=%s, Status=%s, Available=%v", i, key.ID, key.Status, key.IsAvailable())
	}
	return nil
}

// Reload refreshes the key pool from database
func (p *OpenHandsProvider) Reload() error {
	return p.LoadKeys()
}

// StartAutoReload starts a background goroutine that periodically reloads keys
func (p *OpenHandsProvider) StartAutoReload(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		// Auto-reload started log disabled to reduce noise

		for range ticker.C {
			if err := p.LoadKeys(); err != nil {
				log.Printf("⚠️ [Troll-LLM] Auto-reload failed: %v", err)
			}
			// Auto-reload success log disabled to reduce noise
		}
	}()
}

// SelectKey selects the next available key using round-robin
func (p *OpenHandsProvider) SelectKey() (*OpenHandsKey, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if len(p.keys) == 0 {
		return nil, fmt.Errorf("no OpenHands keys configured")
	}

	startIdx := p.current
	for i := 0; i < len(p.keys); i++ {
		idx := (startIdx + i) % len(p.keys)
		key := p.keys[idx]

		if key.IsAvailable() {
			p.current = (idx + 1) % len(p.keys)
			p.lastUsedKeyID = key.ID
			return key, nil
		}
	}

	return nil, fmt.Errorf("no healthy OpenHands keys available")
}

// MarkStatus updates key status in memory and database
func (p *OpenHandsProvider) MarkStatus(keyID string, status OpenHandsKeyStatus, cooldown time.Duration, lastError string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	for _, key := range p.keys {
		if key.ID == keyID {
			key.Status = status
			key.LastError = lastError
			if cooldown > 0 {
				until := time.Now().Add(cooldown)
				key.CooldownUntil = &until
			} else {
				key.CooldownUntil = nil
			}

			// Update in database async
			go p.updateKeyStatus(keyID, status, key.CooldownUntil, lastError)
			break
		}
	}
}

func (p *OpenHandsProvider) updateKeyStatus(keyID string, status OpenHandsKeyStatus, cooldownUntil *time.Time, lastError string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{
		"$set": bson.M{
			"status":        status,
			"lastError":     lastError,
			"cooldownUntil": cooldownUntil,
		},
	}

	_, err := db.OpenHandsKeysCollection().UpdateByID(ctx, keyID, update)
	if err != nil {
		log.Printf("⚠️ [Troll-LLM] Failed to update key status: %v", err)
	}
}

func (p *OpenHandsProvider) MarkHealthy(keyID string) {
	p.MarkStatus(keyID, OpenHandsStatusHealthy, 0, "")
	log.Printf("✅ [Troll-LLM] Key %s marked healthy", keyID)
}

func (p *OpenHandsProvider) MarkRateLimited(keyID string) {
	p.MarkStatus(keyID, OpenHandsStatusRateLimited, 60*time.Second, "Rate limited by upstream")
	log.Printf("⚠️ [Troll-LLM] Key %s rate limited (cooldown: 60s)", keyID)
}

func (p *OpenHandsProvider) MarkExhausted(keyID string) {
	p.MarkStatus(keyID, OpenHandsStatusExhausted, 24*time.Hour, "Token quota exhausted")
	log.Printf("❌ [Troll-LLM] Key %s exhausted (cooldown: 24h)", keyID)
}

func (p *OpenHandsProvider) MarkError(keyID string, err string) {
	p.MarkStatus(keyID, OpenHandsStatusError, 30*time.Second, err)
	log.Printf("⚠️ [Troll-LLM] Key %s error: %s", keyID, err)
}

// CheckAndRotateOnError checks response and rotates key if needed
// Simple: error status code -> disable and rotate
func (p *OpenHandsProvider) CheckAndRotateOnError(keyID string, statusCode int, body string) {
	shouldRotate := false
	reason := ""

	switch statusCode {
	case 400:
		// Check if it's a budget_exceeded error
		if strings.Contains(body, "ExceededBudget") || strings.Contains(body, "budget_exceeded") || strings.Contains(body, "over budget") {
			shouldRotate = true
			reason = "budget_exceeded"
			log.Printf("🚨 [Troll-LLM] Key %s budget exceeded, triggering rotation", keyID)
		}
	case 401:
		shouldRotate = true
		reason = "unauthorized"
	case 402:
		shouldRotate = true
		reason = "payment_required"
	case 403:
		shouldRotate = true
		reason = "forbidden"
	case 429:
		p.MarkRateLimited(keyID)
		return
	case 529:
		p.MarkRateLimited(keyID)
		log.Printf("⏳ [Troll-LLM] Key %s temporarily unavailable due to upstream overload (529, cooldown: 60s)", keyID)
		return
	}

	if shouldRotate {
		log.Printf("🚫 [Troll-LLM] Key %s error %d, rotating...", keyID, statusCode)
		backupCount := GetOpenHandsBackupKeyCount()
		if backupCount > 0 {
			newKeyID, err := p.RotateKey(keyID, reason)
			if err != nil {
				log.Printf("❌ [Troll-LLM] Rotation failed: %v", err)
				p.MarkExhausted(keyID)
			} else {
				log.Printf("✅ [Troll-LLM] Rotated: %s -> %s", keyID, newKeyID)
			}
		} else {
			p.MarkExhausted(keyID)
			log.Printf("🚨 [Troll-LLM] No backup keys, %s disabled", keyID)
		}
	}
}

// GetStats returns key pool statistics
func (p *OpenHandsProvider) GetStats() map[string]int {
	p.mu.Lock()
	defer p.mu.Unlock()

	stats := map[string]int{
		"total":        len(p.keys),
		"healthy":      0,
		"rate_limited": 0,
		"exhausted":    0,
		"error":        0,
	}

	for _, key := range p.keys {
		switch key.Status {
		case OpenHandsStatusHealthy:
			stats["healthy"]++
		case OpenHandsStatusRateLimited:
			stats["rate_limited"]++
		case OpenHandsStatusExhausted:
			stats["exhausted"]++
		case OpenHandsStatusError:
			stats["error"]++
		}
	}

	return stats
}

// GetAllKeysStatus returns all keys with their status
func (p *OpenHandsProvider) GetAllKeysStatus() []map[string]interface{} {
	p.mu.Lock()
	defer p.mu.Unlock()

	result := make([]map[string]interface{}, 0, len(p.keys))
	for _, key := range p.keys {
		keyInfo := map[string]interface{}{
			"id":        key.ID,
			"status":    key.Status,
			"available": key.IsAvailable(),
		}
		if key.LastError != "" {
			keyInfo["last_error"] = key.LastError
		}
		if key.CooldownUntil != nil {
			keyInfo["cooldown_until"] = key.CooldownUntil.Format(time.RFC3339)
		}
		result = append(result, keyInfo)
	}
	return result
}

func (p *OpenHandsProvider) GetKeyCount() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.keys)
}

func (p *OpenHandsProvider) GetKeyByID(keyID string) *OpenHandsKey {
	p.mu.Lock()
	defer p.mu.Unlock()

	for _, key := range p.keys {
		if key.ID == keyID {
			return key
		}
	}
	return nil
}

func (p *OpenHandsProvider) GetAPIKey(keyID string) string {
	key := p.GetKeyByID(keyID)
	if key != nil {
		return key.APIKey
	}
	return ""
}

// UpdateKeyUsage updates tokensUsed and requestsCount for a key in MongoDB
func (p *OpenHandsProvider) UpdateKeyUsage(keyID string, inputTokens, outputTokens int64) error {
	totalTokens := inputTokens + outputTokens
	if totalTokens <= 0 {
		return nil
	}

	collection := db.OpenHandsKeysCollection()
	if collection == nil {
		return fmt.Errorf("openhands_keys collection not available")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{
		"$inc": bson.M{
			"tokensUsed":    totalTokens,
			"requestsCount": 1,
		},
		"$set": bson.M{
			"lastUsedAt": time.Now(),
		},
	}

	_, err := collection.UpdateByID(ctx, keyID, update)
	if err != nil {
		log.Printf("❌ [Troll-LLM] Failed to update key usage: %v", err)
		return err
	}

	log.Printf("📈 [Troll-LLM] Updated key %s: +%d tokens, +1 request", keyID, totalTokens)
	return nil
}

// GetLastUsedKeyID returns the ID of the last used key
func (p *OpenHandsProvider) GetLastUsedKeyID() string {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.lastUsedKeyID
}

func createOpenHandsClient() *http.Client {
	transport := &http.Transport{
		TLSClientConfig:       &tls.Config{MinVersion: tls.VersionTLS12},
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          200,
		MaxIdleConnsPerHost:   50,
		MaxConnsPerHost:       100,
		IdleConnTimeout:       120 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		DisableCompression:    false,
	}
	http2.ConfigureTransport(transport)
	return &http.Client{Transport: transport, Timeout: 0}
}

// Name returns the provider name
func (p *OpenHandsProvider) Name() string {
	return OpenHandsName
}

// IsConfigured returns true if the provider is configured
func (p *OpenHandsProvider) IsConfigured() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.keys) > 0 && p.client != nil
}

// ForwardRequest forwards request to OpenHands chat/completions endpoint (OpenAI format)
func (p *OpenHandsProvider) ForwardRequest(body []byte, isStreaming bool) (*http.Response, error) {
	return p.forwardToEndpoint(OpenHandsCompletionsEndpoint, body, isStreaming)
}

// ForwardMessagesRequest forwards request to OpenHands messages endpoint (Anthropic format)
func (p *OpenHandsProvider) ForwardMessagesRequest(body []byte, isStreaming bool) (*http.Response, error) {
	return p.forwardToEndpoint(OpenHandsMessagesEndpoint, body, isStreaming)
}

// forwardToEndpoint forwards request to specified endpoint with key rotation and optional proxy
func (p *OpenHandsProvider) forwardToEndpoint(endpoint string, body []byte, isStreaming bool) (*http.Response, error) {
	if !p.IsConfigured() {
		return nil, fmt.Errorf("OpenHands not configured")
	}

	// Select proxy and key together (with binding support)
	client, proxyName, key, err := p.selectProxyAndKey()
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key.APIKey)
	// Add User-Agent from config (openhands-cli/1.0.0 for official CLI appearance)
	if userAgent := config.GetUserAgent(); userAgent != "" {
		req.Header.Set("User-Agent", userAgent)
	}
	// Add common headers to avoid detection
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	if isStreaming {
		req.Header.Set("Accept", "text/event-stream")
	} else {
		req.Header.Set("Accept", "application/json")
	}

	// Log request with API key prefix for debugging
	apiKeyPrefix := key.APIKey
	if len(apiKeyPrefix) > 10 {
		apiKeyPrefix = apiKeyPrefix[:10] + "..."
	}
	if proxyName != "" {
		log.Printf("📤 [Troll-LLM] POST %s (key=%s, apiKey=%s, proxy=%s, stream=%v)", endpoint, key.ID, apiKeyPrefix, proxyName, isStreaming)
	} else {
		log.Printf("📤 [Troll-LLM] POST %s (key=%s, apiKey=%s, direct, stream=%v)", endpoint, key.ID, apiKeyPrefix, isStreaming)
	}

	startTime := time.Now()
	resp, err := client.Do(req)
	elapsed := time.Since(startTime)
	if err != nil {
		// Log detailed error with timing to help debug proxy vs upstream timeouts
		log.Printf("⏱️ [Troll-LLM] Request failed after %v (proxy=%s): %v", elapsed, proxyName, err)
		return nil, err
	}

	// Check for rate limit, quota errors, or budget exceeded (400 with ExceededBudget), or service overload (529)
	if resp.StatusCode == 429 || resp.StatusCode == 402 || resp.StatusCode == 401 || resp.StatusCode == 400 || resp.StatusCode == 529 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		bodyStr := string(bodyBytes)
		resp.Body.Close()

		// For 400, only handle budget_exceeded errors - other 400s should be sanitized
		if resp.StatusCode == 400 && !strings.Contains(bodyStr, "ExceededBudget") && !strings.Contains(bodyStr, "budget_exceeded") && !strings.Contains(bodyStr, "over budget") {
			// Not a budget error - return sanitized error response
			resp.Body = io.NopCloser(bytes.NewReader(SanitizeError(resp.StatusCode, bodyBytes)))
			return resp, nil
		}

		p.CheckAndRotateOnError(key.ID, resp.StatusCode, bodyStr)

		// IMPORTANT: Only retry for non-streaming requests
		// For streaming, retrying would cause double response (partial + new full response)
		if !isStreaming {
			log.Printf("⚠️ [Troll-LLM] Non-streaming request failed (HTTP %d), retrying with next key...", resp.StatusCode)
			return p.retryWithNextKeyToEndpoint(endpoint, body, isStreaming, 2)
		} else {
			log.Printf("🚫 [Troll-LLM] Streaming request got HTTP %d - CANNOT RETRY to prevent double response!", resp.StatusCode)
			// Return sanitized error response - handler will forward to client
			// Don't retry to avoid double response
			resp.Body = io.NopCloser(bytes.NewReader(SanitizeError(resp.StatusCode, bodyBytes)))
			return resp, nil
		}
	}

	return resp, nil
}

// selectProxyAndKey selects a proxy and corresponding key based on bindings
// Returns: client, proxyName, key, error
func (p *OpenHandsProvider) selectProxyAndKey() (*http.Client, string, *OpenHandsKey, error) {
	p.mu.Lock()
	useProxy := p.useProxy
	pool := p.proxyPool
	bindings := p.bindings
	p.mu.Unlock()

	// If no proxy, just select key with round-robin
	if !useProxy || pool == nil {
		key, err := p.SelectKey()
		if err != nil {
			return nil, "", nil, err
		}
		return p.client, "", key, nil
	}

	// Select proxy from pool
	selectedProxy, err := pool.SelectProxy()
	if err != nil {
		log.Printf("⚠️ [Troll-LLM] Failed to select proxy, using direct: %v", err)
		key, err := p.SelectKey()
		if err != nil {
			return nil, "", nil, err
		}
		return p.client, "", key, nil
	}

	// Create transport with proxy
	transport, err := selectedProxy.CreateHTTPTransport()
	if err != nil {
		log.Printf("⚠️ [Troll-LLM] Failed to create proxy transport, using direct: %v", err)
		key, err := p.SelectKey()
		if err != nil {
			return nil, "", nil, err
		}
		return p.client, "", key, nil
	}

	client := &http.Client{Transport: transport, Timeout: 0}

	// Find key based on binding
	proxyBindings, hasBindings := bindings[selectedProxy.ID]
	if hasBindings && len(proxyBindings) > 0 {
		// Get active bindings
		activeBindings := make([]*OpenHandsKeyBinding, 0)
		for _, b := range proxyBindings {
			if b.IsActive {
				activeBindings = append(activeBindings, b)
			}
		}

		if len(activeBindings) > 0 {
			// Round-robin through keys for this proxy
			p.mu.Lock()
			idx := p.keyIndex[selectedProxy.ID]
			binding := activeBindings[idx%len(activeBindings)]
			p.keyIndex[selectedProxy.ID] = (idx + 1) % len(activeBindings)
			p.lastUsedProxy = selectedProxy.Name
			p.mu.Unlock()

			// Find the key
			key := p.GetKeyByID(binding.OpenHandsKeyID)
			if key != nil && key.IsAvailable() {
				p.mu.Lock()
				p.lastUsedKeyID = key.ID
				p.mu.Unlock()
				return client, selectedProxy.Name, key, nil
			}
		}
	}

	// No binding found, use round-robin key selection
	key, err := p.SelectKey()
	if err != nil {
		return nil, "", nil, err
	}

	p.mu.Lock()
	p.lastUsedProxy = selectedProxy.Name
	p.mu.Unlock()

	return client, selectedProxy.Name, key, nil
}

// getClientWithProxy returns an HTTP client, optionally configured with a proxy (legacy method)
func (p *OpenHandsProvider) getClientWithProxy() (*http.Client, string) {
	client, proxyName, _, _ := p.selectProxyAndKey()
	return client, proxyName
}

// GetClientWithProxyOnly returns HTTP client with proxy configured, WITHOUT selecting a key
// Used by SpendChecker to check spend for a specific key while still using proxy pool
func (p *OpenHandsProvider) GetClientWithProxyOnly() (*http.Client, string) {
	p.mu.Lock()
	useProxy := p.useProxy
	pool := p.proxyPool
	p.mu.Unlock()

	if !useProxy || pool == nil {
		return p.client, ""
	}

	selectedProxy, err := pool.SelectProxy()
	if err != nil {
		return p.client, ""
	}

	transport, err := selectedProxy.CreateHTTPTransport()
	if err != nil {
		return p.client, ""
	}

	client := &http.Client{Transport: transport, Timeout: 30 * time.Second}
	return client, selectedProxy.Name
}

// retryWithNextKeyToEndpoint attempts request with remaining keys to specified endpoint
func (p *OpenHandsProvider) retryWithNextKeyToEndpoint(endpoint string, body []byte, isStreaming bool, retriesLeft int) (*http.Response, error) {
	if retriesLeft <= 0 {
		return nil, fmt.Errorf("all OpenHands keys exhausted or rate limited")
	}

	// Select proxy and key together (with binding support)
	client, proxyName, key, err := p.selectProxyAndKey()
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key.APIKey)
	// Add User-Agent from config (openhands-cli/1.0.0 for official CLI appearance)
	if userAgent := config.GetUserAgent(); userAgent != "" {
		req.Header.Set("User-Agent", userAgent)
	}
	// Add common headers to avoid detection
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	if isStreaming {
		req.Header.Set("Accept", "text/event-stream")
	} else {
		req.Header.Set("Accept", "application/json")
	}

	if proxyName != "" {
		log.Printf("📤 [Troll-LLM] RETRY POST %s (key=%s, proxy=%s, stream=%v, retries=%d)", endpoint, key.ID, proxyName, isStreaming, retriesLeft)
	} else {
		log.Printf("📤 [Troll-LLM] RETRY POST %s (key=%s, direct, stream=%v, retries=%d)", endpoint, key.ID, isStreaming, retriesLeft)
	}

	startTime := time.Now()
	resp, err := client.Do(req)
	elapsed := time.Since(startTime)
	if err != nil {
		log.Printf("⏱️ [Troll-LLM] RETRY failed after %v (proxy=%s): %v", elapsed, proxyName, err)
		return nil, err
	}

	if resp.StatusCode == 429 || resp.StatusCode == 402 || resp.StatusCode == 401 || resp.StatusCode == 400 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		bodyStr := string(bodyBytes)
		resp.Body.Close()

		// For 400, only handle budget_exceeded errors - other 400s should be sanitized
		if resp.StatusCode == 400 && !strings.Contains(bodyStr, "ExceededBudget") && !strings.Contains(bodyStr, "budget_exceeded") && !strings.Contains(bodyStr, "over budget") {
			resp.Body = io.NopCloser(bytes.NewReader(SanitizeError(resp.StatusCode, bodyBytes)))
			return resp, nil
		}

		p.CheckAndRotateOnError(key.ID, resp.StatusCode, bodyStr)
		return p.retryWithNextKeyToEndpoint(endpoint, body, isStreaming, retriesLeft-1)
	}

	return resp, nil
}

// HandleStreamResponse handles streaming response from OpenHands (pure passthrough)
// Supports both OpenAI and Anthropic streaming formats
func (p *OpenHandsProvider) HandleStreamResponse(w http.ResponseWriter, resp *http.Response, modelID string, onUsage UsageCallback) {
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("❌ [Troll-LLM] Error %d", resp.StatusCode)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(SanitizeError(resp.StatusCode, body))
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, `{"error":"streaming not supported"}`, http.StatusInternalServerError)
		return
	}

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 1024*1024), 10*1024*1024)

	var totalInput, totalOutput, cacheCreation, cacheRead int64

	for scanner.Scan() {
		line := scanner.Text()

		// Extract usage from data lines (don't modify response)
		if strings.HasPrefix(line, "data: ") {
			dataStr := strings.TrimPrefix(line, "data: ")
			if dataStr != "[DONE]" {
				var event map[string]interface{}
				if json.Unmarshal([]byte(dataStr), &event) == nil {
					// Check event type for Anthropic format
					eventType, _ := event["type"].(string)

					// Anthropic format: message_start contains input usage
					if eventType == "message_start" {
						if message, ok := event["message"].(map[string]interface{}); ok {
							if usage, ok := message["usage"].(map[string]interface{}); ok {
								if v, ok := usage["input_tokens"].(float64); ok {
									totalInput = int64(v)
								}
								if v, ok := usage["cache_creation_input_tokens"].(float64); ok {
									cacheCreation = int64(v)
								}
								if v, ok := usage["cache_read_input_tokens"].(float64); ok {
									cacheRead = int64(v)
								}
							}
						}
					}

					// Anthropic format: message_delta contains output usage
					if eventType == "message_delta" {
						if usage, ok := event["usage"].(map[string]interface{}); ok {
							if v, ok := usage["output_tokens"].(float64); ok {
								totalOutput = int64(v)
							}
						}
					}

					// OpenAI format: usage in final chunk
					if usage, ok := event["usage"].(map[string]interface{}); ok {
						if v, ok := usage["prompt_tokens"].(float64); ok {
							totalInput = int64(v)
						}
						if v, ok := usage["completion_tokens"].(float64); ok {
							totalOutput = int64(v)
						}
						// Anthropic format fields (also check at top level)
						if v, ok := usage["input_tokens"].(float64); ok {
							totalInput = int64(v)
						}
						if v, ok := usage["output_tokens"].(float64); ok {
							totalOutput = int64(v)
						}
						if v, ok := usage["cache_creation_input_tokens"].(float64); ok {
							cacheCreation = int64(v)
						}
						if v, ok := usage["cache_read_input_tokens"].(float64); ok {
							cacheRead = int64(v)
						}
						// OpenAI cached_tokens
						if details, ok := usage["prompt_tokens_details"].(map[string]interface{}); ok {
							if v, ok := details["cached_tokens"].(float64); ok {
								cacheRead = int64(v)
							}
						}
					}
				}
			}
		}

		// Pure passthrough - forward line as-is
		fmt.Fprintf(w, "%s\n", line)
		flusher.Flush()
	}

	if err := scanner.Err(); err != nil {
		log.Printf("⚠️ [Troll-LLM] Scanner error: %v", err)
	}

	if cacheCreation > 0 || cacheRead > 0 {
		log.Printf("📊 [Troll-LLM] Usage: in=%d out=%d cache_create=%d cache_read=%d ⚡", totalInput, totalOutput, cacheCreation, cacheRead)
	} else {
		log.Printf("📊 [Troll-LLM] Usage: in=%d out=%d", totalInput, totalOutput)
	}
	if onUsage != nil && (totalInput > 0 || totalOutput > 0) {
		onUsage(totalInput, totalOutput, cacheCreation, cacheRead)
	}
}

// HandleNonStreamResponse handles non-streaming response from OpenHands (pure passthrough)
func (p *OpenHandsProvider) HandleNonStreamResponse(w http.ResponseWriter, resp *http.Response, modelID string, onUsage UsageCallback) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, `{"error":"failed to read response"}`, http.StatusInternalServerError)
		return
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ [Troll-LLM] Error %d", resp.StatusCode)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(SanitizeError(resp.StatusCode, body))
		return
	}

	// Extract usage
	var response map[string]interface{}
	if json.Unmarshal(body, &response) == nil {
		if usage, ok := response["usage"].(map[string]interface{}); ok {
			var input, output, cachedTokens int64
			if v, ok := usage["prompt_tokens"].(float64); ok {
				input = int64(v)
			}
			if v, ok := usage["completion_tokens"].(float64); ok {
				output = int64(v)
			}
			// Extract cached_tokens from OpenAI format
			if details, ok := usage["prompt_tokens_details"].(map[string]interface{}); ok {
				if v, ok := details["cached_tokens"].(float64); ok {
					cachedTokens = int64(v)
				}
			}
			if cachedTokens > 0 {
				log.Printf("📊 [Troll-LLM] Usage: in=%d out=%d cached=%d ⚡", input, output, cachedTokens)
			} else {
				log.Printf("📊 [Troll-LLM] Usage: in=%d out=%d", input, output)
			}
			if onUsage != nil && (input > 0 || output > 0) {
				onUsage(input, output, 0, cachedTokens)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(body)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
