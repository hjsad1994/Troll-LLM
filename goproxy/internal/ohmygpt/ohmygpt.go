package ohmygpt

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

	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/net/http2"
	"goproxy/db"
	"goproxy/internal/proxy"
)

const (
	OhmyGPTBaseURL             = "https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg"
	OhmyGPTMessagesEndpoint    = OhmyGPTBaseURL + "/v1/messages"
	OhmyGPTCompletionsEndpoint = OhmyGPTBaseURL + "/v1/chat/completions"
	OhmyGPTEndpoint            = OhmyGPTCompletionsEndpoint // default for OpenAI format
	OhmyGPTName                = "ohmygpt"
)

// OhmyGPTKeyStatus represents the health status of an API key
type OhmyGPTKeyStatus string

const (
	OhmyGPTStatusHealthy     OhmyGPTKeyStatus = "healthy"
	OhmyGPTStatusRateLimited OhmyGPTKeyStatus = "rate_limited"
	OhmyGPTStatusExhausted   OhmyGPTKeyStatus = "exhausted"
	OhmyGPTStatusError       OhmyGPTKeyStatus = "error"
)

// OhmyGPTKey represents a single API key stored in MongoDB
type OhmyGPTKey struct {
	ID            string           `bson:"_id" json:"id"`
	APIKey        string           `bson:"apiKey" json:"api_key"`
	Status        OhmyGPTKeyStatus `bson:"status" json:"status"`
	TokensUsed    int64            `bson:"tokensUsed" json:"tokens_used"`
	RequestsCount int64            `bson:"requestsCount" json:"requests_count"`
	LastError     string           `bson:"lastError,omitempty" json:"last_error,omitempty"`
	CooldownUntil *time.Time       `bson:"cooldownUntil,omitempty" json:"cooldown_until,omitempty"`
	CreatedAt     time.Time        `bson:"createdAt" json:"created_at"`
}

// IsAvailable returns true if the key is available for use
func (k *OhmyGPTKey) IsAvailable() bool {
	if k.Status == OhmyGPTStatusExhausted {
		return false
	}
	if k.Status != OhmyGPTStatusHealthy {
		if k.CooldownUntil != nil && time.Now().After(*k.CooldownUntil) {
			return true // Cooldown expired
		}
		return false
	}
	return true
}

// OhmyGPTKeyBinding represents a proxy-key binding
type OhmyGPTKeyBinding struct {
	ProxyID     string    `bson:"proxyId" json:"proxy_id"`
	OhmyGPTKeyID string   `bson:"ohmygptKeyId" json:"ohmygpt_key_id"`
	Priority    int       `bson:"priority" json:"priority"`
	IsActive    bool      `bson:"isActive" json:"is_active"`
	CreatedAt   time.Time `bson:"createdAt" json:"created_at"`
}

// OhmyGPTProvider implements Provider interface for OhmyGPT with MongoDB key pool
type OhmyGPTProvider struct {
	keys           []*OhmyGPTKey
	bindings       map[string][]*OhmyGPTKeyBinding // proxyId -> bindings
	current        int
	keyIndex       map[string]int // proxyId -> current key index for rotation
	lastUsedKeyID  string
	lastUsedProxy  string
	client         *http.Client
	proxyPool      *proxy.ProxyPool
	useProxy       bool
	mu             sync.Mutex
}

var ohmygptInstance *OhmyGPTProvider
var ohmygptOnce sync.Once

// GetOhmyGPT returns the singleton OhmyGPT provider instance
func GetOhmyGPT() *OhmyGPTProvider {
	ohmygptOnce.Do(func() {
		ohmygptInstance = &OhmyGPTProvider{
			keys:     make([]*OhmyGPTKey, 0),
			bindings: make(map[string][]*OhmyGPTKeyBinding),
			keyIndex: make(map[string]int),
			current:  0,
		}
	})
	return ohmygptInstance
}

// ConfigureOhmyGPT initializes the OhmyGPT provider and loads keys from MongoDB
func ConfigureOhmyGPT() error {
	provider := GetOhmyGPT()
	provider.client = createOhmyGPTClient()
	
	if err := provider.LoadKeys(); err != nil {
		return err
	}

	// Register with TrollProxy registry
	RegisterProvider(OhmyGPTName, provider)
	return nil
}

// SetProxyPool sets the proxy pool to use for requests
func (p *OhmyGPTProvider) SetProxyPool(pool *proxy.ProxyPool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.proxyPool = pool
	p.useProxy = pool != nil && pool.HasProxies()
	if p.useProxy {
		log.Printf("✅ [TrollProxy/OhmyGPT] Proxy pool enabled (%d proxies)", pool.GetProxyCount())
	} else {
		log.Printf("ℹ️ [TrollProxy/OhmyGPT] Running without proxy (direct connection)")
	}
}

// LoadKeys loads OhmyGPT keys and bindings from MongoDB
func (p *OhmyGPTProvider) LoadKeys() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Load keys
	cursor, err := db.OhmyGPTKeysCollection().Find(ctx, bson.M{})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	p.mu.Lock()
	defer p.mu.Unlock()

	p.keys = make([]*OhmyGPTKey, 0)
	for cursor.Next(ctx) {
		var key OhmyGPTKey
		if err := cursor.Decode(&key); err != nil {
			log.Printf("⚠️ [TrollProxy/OhmyGPT] Failed to decode key: %v", err)
			continue
		}
		p.keys = append(p.keys, &key)
	}

	// Load bindings from ohmygpt_key_bindings collection
	p.bindings = make(map[string][]*OhmyGPTKeyBinding)
	bindingsCol := db.GetCollection("ohmygpt_key_bindings")
	if bindingsCol != nil {
		bindingsCursor, err := bindingsCol.Find(ctx, bson.M{"isActive": true})
		if err == nil {
			defer bindingsCursor.Close(ctx)
			for bindingsCursor.Next(ctx) {
				var binding OhmyGPTKeyBinding
				if err := bindingsCursor.Decode(&binding); err != nil {
					log.Printf("⚠️ [TrollProxy/OhmyGPT] Failed to decode binding: %v", err)
					continue
				}
				p.bindings[binding.ProxyID] = append(p.bindings[binding.ProxyID], &binding)
			}
		}
	}

	log.Printf("✅ [TrollProxy/OhmyGPT] Loaded %d keys, %d proxy bindings from MongoDB", len(p.keys), len(p.bindings))
	return nil
}

// Reload refreshes the key pool from database
func (p *OhmyGPTProvider) Reload() error {
	return p.LoadKeys()
}

// StartAutoReload starts a background goroutine that periodically reloads keys
func (p *OhmyGPTProvider) StartAutoReload(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		log.Printf("🔄 [TrollProxy/OhmyGPT] Auto-reload started (interval: %v)", interval)

		for range ticker.C {
			if err := p.LoadKeys(); err != nil {
				log.Printf("⚠️ [TrollProxy/OhmyGPT] Auto-reload failed: %v", err)
			} else {
				log.Printf("🔄 [TrollProxy/OhmyGPT] Auto-reloaded keys (%d keys)", p.GetKeyCount())
			}
		}
	}()
}

// SelectKey selects the next available key using round-robin
func (p *OhmyGPTProvider) SelectKey() (*OhmyGPTKey, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if len(p.keys) == 0 {
		return nil, fmt.Errorf("no OhmyGPT keys configured")
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

	return nil, fmt.Errorf("no healthy OhmyGPT keys available")
}

// MarkStatus updates key status in memory and database
func (p *OhmyGPTProvider) MarkStatus(keyID string, status OhmyGPTKeyStatus, cooldown time.Duration, lastError string) {
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

func (p *OhmyGPTProvider) updateKeyStatus(keyID string, status OhmyGPTKeyStatus, cooldownUntil *time.Time, lastError string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{
		"$set": bson.M{
			"status":        status,
			"lastError":     lastError,
			"cooldownUntil": cooldownUntil,
		},
	}

	_, err := db.OhmyGPTKeysCollection().UpdateByID(ctx, keyID, update)
	if err != nil {
		log.Printf("⚠️ [TrollProxy/OhmyGPT] Failed to update key status: %v", err)
	}
}

func (p *OhmyGPTProvider) MarkHealthy(keyID string) {
	p.MarkStatus(keyID, OhmyGPTStatusHealthy, 0, "")
	log.Printf("✅ [TrollProxy/OhmyGPT] Key %s marked healthy", keyID)
}

func (p *OhmyGPTProvider) MarkRateLimited(keyID string) {
	p.MarkStatus(keyID, OhmyGPTStatusRateLimited, 60*time.Second, "Rate limited by upstream")
	log.Printf("⚠️ [TrollProxy/OhmyGPT] Key %s rate limited (cooldown: 60s)", keyID)
}

func (p *OhmyGPTProvider) MarkExhausted(keyID string) {
	p.MarkStatus(keyID, OhmyGPTStatusExhausted, 24*time.Hour, "Token quota exhausted")
	log.Printf("❌ [TrollProxy/OhmyGPT] Key %s exhausted (cooldown: 24h)", keyID)
}

func (p *OhmyGPTProvider) MarkError(keyID string, err string) {
	p.MarkStatus(keyID, OhmyGPTStatusError, 30*time.Second, err)
	log.Printf("⚠️ [TrollProxy/OhmyGPT] Key %s error: %s", keyID, err)
}

// CheckAndRotateOnError checks response and rotates key if needed
func (p *OhmyGPTProvider) CheckAndRotateOnError(keyID string, statusCode int, body string) {
	shouldRotate := false
	reason := ""

	switch statusCode {
	case 429:
		if strings.Contains(body, "quota") || strings.Contains(body, "exhausted") {
			shouldRotate = true
			reason = "quota_exhausted"
		} else {
			p.MarkRateLimited(keyID)
			return
		}
	case 402:
		shouldRotate = true
		reason = "payment_required"
	case 401:
		shouldRotate = true
		reason = "invalid_api_key"
	case 403:
		if strings.Contains(body, "banned") || strings.Contains(body, "suspended") {
			shouldRotate = true
			reason = "account_banned"
		} else {
			p.MarkError(keyID, "Access denied")
			return
		}
	}

	if shouldRotate {
		log.Printf("🚫 [OhmyGPT] Key %s needs rotation (reason: %s)", keyID, reason)

		backupCount := GetOhmyGPTBackupKeyCount()
		if backupCount > 0 {
			log.Printf("🔄 [OhmyGPT] Found %d backup keys, rotating...", backupCount)
			newKeyID, err := p.RotateKey(keyID, reason)
			if err != nil {
				log.Printf("❌ [OhmyGPT] Rotation failed: %v", err)
				p.MarkExhausted(keyID)
			} else {
				log.Printf("✅ [OhmyGPT] Key %s replaced with %s", keyID, newKeyID)
			}
		} else {
			log.Printf("⚠️ [OhmyGPT] No backup keys available")
			p.MarkExhausted(keyID)
			log.Printf("🚨 [OhmyGPT] Key %s marked as exhausted - add backup keys!", keyID)
		}
	}
}

// GetStats returns key pool statistics
func (p *OhmyGPTProvider) GetStats() map[string]int {
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
		case OhmyGPTStatusHealthy:
			stats["healthy"]++
		case OhmyGPTStatusRateLimited:
			stats["rate_limited"]++
		case OhmyGPTStatusExhausted:
			stats["exhausted"]++
		case OhmyGPTStatusError:
			stats["error"]++
		}
	}

	return stats
}

// GetAllKeysStatus returns all keys with their status
func (p *OhmyGPTProvider) GetAllKeysStatus() []map[string]interface{} {
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

func (p *OhmyGPTProvider) GetKeyCount() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.keys)
}

func (p *OhmyGPTProvider) GetKeyByID(keyID string) *OhmyGPTKey {
	p.mu.Lock()
	defer p.mu.Unlock()

	for _, key := range p.keys {
		if key.ID == keyID {
			return key
		}
	}
	return nil
}

func (p *OhmyGPTProvider) GetAPIKey(keyID string) string {
	key := p.GetKeyByID(keyID)
	if key != nil {
		return key.APIKey
	}
	return ""
}

// UpdateKeyUsage updates tokensUsed and requestsCount for a key in MongoDB
func (p *OhmyGPTProvider) UpdateKeyUsage(keyID string, inputTokens, outputTokens int64) error {
	totalTokens := inputTokens + outputTokens
	if totalTokens <= 0 {
		return nil
	}

	collection := db.OhmyGPTKeysCollection()
	if collection == nil {
		return fmt.Errorf("ohmygpt_keys collection not available")
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
		log.Printf("❌ [TrollProxy/OhmyGPT] Failed to update key usage: %v", err)
		return err
	}

	log.Printf("📈 [TrollProxy/OhmyGPT] Updated key %s: +%d tokens, +1 request", keyID, totalTokens)
	return nil
}

// GetLastUsedKeyID returns the ID of the last used key
func (p *OhmyGPTProvider) GetLastUsedKeyID() string {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.lastUsedKeyID
}

func createOhmyGPTClient() *http.Client {
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
func (p *OhmyGPTProvider) Name() string {
	return OhmyGPTName
}

// IsConfigured returns true if the provider is configured
func (p *OhmyGPTProvider) IsConfigured() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.keys) > 0 && p.client != nil
}

// ForwardRequest forwards request to OhmyGPT chat/completions endpoint (OpenAI format)
func (p *OhmyGPTProvider) ForwardRequest(body []byte, isStreaming bool) (*http.Response, error) {
	return p.forwardToEndpoint(OhmyGPTCompletionsEndpoint, body, isStreaming)
}

// ForwardMessagesRequest forwards request to OhmyGPT messages endpoint (Anthropic format)
func (p *OhmyGPTProvider) ForwardMessagesRequest(body []byte, isStreaming bool) (*http.Response, error) {
	return p.forwardToEndpoint(OhmyGPTMessagesEndpoint, body, isStreaming)
}

// forwardToEndpoint forwards request to specified endpoint with key rotation and optional proxy
func (p *OhmyGPTProvider) forwardToEndpoint(endpoint string, body []byte, isStreaming bool) (*http.Response, error) {
	if !p.IsConfigured() {
		return nil, fmt.Errorf("OhmyGPT not configured")
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
	req.Header.Set("x-api-key", key.APIKey)
	if isStreaming {
		req.Header.Set("Accept", "text/event-stream")
	}

	// Log request
	if proxyName != "" {
		log.Printf("📤 [TrollProxy/OhmyGPT] POST %s (key=%s, proxy=%s, stream=%v)", endpoint, key.ID, proxyName, isStreaming)
	} else {
		log.Printf("📤 [TrollProxy/OhmyGPT] POST %s (key=%s, direct, stream=%v)", endpoint, key.ID, isStreaming)
	}

	startTime := time.Now()
	resp, err := client.Do(req)
	elapsed := time.Since(startTime)
	if err != nil {
		// Log detailed error with timing to help debug proxy vs upstream timeouts
		log.Printf("⏱️ [TrollProxy/OhmyGPT] Request failed after %v (proxy=%s): %v", elapsed, proxyName, err)
		return nil, err
	}

	// Check for rate limit or quota errors
	if resp.StatusCode == 429 || resp.StatusCode == 402 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		p.CheckAndRotateOnError(key.ID, resp.StatusCode, string(bodyBytes))
		
		// IMPORTANT: Only retry for non-streaming requests
		// For streaming, retrying would cause double response (partial + new full response)
		if !isStreaming {
			log.Printf("⚠️ [TrollProxy/OhmyGPT] Non-streaming request failed (HTTP %d), retrying with next key...", resp.StatusCode)
			return p.retryWithNextKeyToEndpoint(endpoint, body, isStreaming, 2)
		} else {
			log.Printf("🚫 [TrollProxy/OhmyGPT] Streaming request got HTTP %d - CANNOT RETRY to prevent double response!", resp.StatusCode)
			// Return error response - handler will sanitize and forward to client
			// Don't retry to avoid double response
			return resp, nil
		}
	}

	return resp, nil
}

// selectProxyAndKey selects a proxy and corresponding key based on bindings
// Returns: client, proxyName, key, error
func (p *OhmyGPTProvider) selectProxyAndKey() (*http.Client, string, *OhmyGPTKey, error) {
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
		log.Printf("⚠️ [TrollProxy/OhmyGPT] Failed to select proxy, using direct: %v", err)
		key, err := p.SelectKey()
		if err != nil {
			return nil, "", nil, err
		}
		return p.client, "", key, nil
	}

	// Create transport with proxy
	transport, err := selectedProxy.CreateHTTPTransport()
	if err != nil {
		log.Printf("⚠️ [TrollProxy/OhmyGPT] Failed to create proxy transport, using direct: %v", err)
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
		activeBindings := make([]*OhmyGPTKeyBinding, 0)
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
			key := p.GetKeyByID(binding.OhmyGPTKeyID)
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
func (p *OhmyGPTProvider) getClientWithProxy() (*http.Client, string) {
	client, proxyName, _, _ := p.selectProxyAndKey()
	return client, proxyName
}

// retryWithNextKeyToEndpoint attempts request with remaining keys to specified endpoint
func (p *OhmyGPTProvider) retryWithNextKeyToEndpoint(endpoint string, body []byte, isStreaming bool, retriesLeft int) (*http.Response, error) {
	if retriesLeft <= 0 {
		return nil, fmt.Errorf("all OhmyGPT keys exhausted or rate limited")
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
	req.Header.Set("x-api-key", key.APIKey)
	if isStreaming {
		req.Header.Set("Accept", "text/event-stream")
	}

	if proxyName != "" {
		log.Printf("📤 [TrollProxy/OhmyGPT] RETRY POST %s (key=%s, proxy=%s, stream=%v, retries=%d)", endpoint, key.ID, proxyName, isStreaming, retriesLeft)
	} else {
		log.Printf("📤 [TrollProxy/OhmyGPT] RETRY POST %s (key=%s, direct, stream=%v, retries=%d)", endpoint, key.ID, isStreaming, retriesLeft)
	}

	startTime := time.Now()
	resp, err := client.Do(req)
	elapsed := time.Since(startTime)
	if err != nil {
		log.Printf("⏱️ [TrollProxy/OhmyGPT] RETRY failed after %v (proxy=%s): %v", elapsed, proxyName, err)
		return nil, err
	}

	if resp.StatusCode == 429 || resp.StatusCode == 402 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		p.CheckAndRotateOnError(key.ID, resp.StatusCode, string(bodyBytes))
		return p.retryWithNextKeyToEndpoint(endpoint, body, isStreaming, retriesLeft-1)
	}

	return resp, nil
}

// HandleStreamResponse handles streaming response from OhmyGPT (pure passthrough)
// Supports both OpenAI and Anthropic streaming formats
func (p *OhmyGPTProvider) HandleStreamResponse(w http.ResponseWriter, resp *http.Response, onUsage UsageCallback) {
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("❌ [OhmyGPT] Error %d", resp.StatusCode)
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
		log.Printf("⚠️ [OhmyGPT] Scanner error: %v", err)
	}

	if cacheCreation > 0 || cacheRead > 0 {
		log.Printf("📊 [OhmyGPT] Usage: in=%d out=%d cache_create=%d cache_read=%d ⚡", totalInput, totalOutput, cacheCreation, cacheRead)
	} else {
		log.Printf("📊 [OhmyGPT] Usage: in=%d out=%d", totalInput, totalOutput)
	}
	if onUsage != nil && (totalInput > 0 || totalOutput > 0) {
		onUsage(totalInput, totalOutput, cacheCreation, cacheRead)
	}
}

// HandleNonStreamResponse handles non-streaming response from OhmyGPT (pure passthrough)
func (p *OhmyGPTProvider) HandleNonStreamResponse(w http.ResponseWriter, resp *http.Response, onUsage UsageCallback) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, `{"error":"failed to read response"}`, http.StatusInternalServerError)
		return
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ [OhmyGPT] Error %d", resp.StatusCode)
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
				log.Printf("📊 [OhmyGPT] Usage: in=%d out=%d cached=%d ⚡", input, output, cachedTokens)
			} else {
				log.Printf("📊 [OhmyGPT] Usage: in=%d out=%d", input, output)
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
