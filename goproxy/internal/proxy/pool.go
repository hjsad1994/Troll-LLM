package proxy

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"goproxy/db"
)

var (
	ErrNoAvailableProxy = errors.New("no available proxy")
	ErrNoBindings       = errors.New("no key bindings for proxy")
)

type ProxyPool struct {
	mu          sync.RWMutex
	proxies     []*Proxy
	bindings    map[string][]*ProxyKeyBinding // proxyId -> bindings (sorted by priority)
	current     int
	keyIndex    map[string]int      // proxyId -> current key index for round-robin
	clientCache map[string]*http.Client // proxyId -> cached HTTP client
	clientMu    sync.RWMutex            // separate mutex for client cache
}

// UseOptimizedPool controls whether to use the lock-free optimized pool
// Can be disabled via env: GOPROXY_DISABLE_OPTIMIZATIONS=true
var UseOptimizedPool = true

func init() {
	if isProxyEnvDisabled("GOPROXY_DISABLE_OPTIMIZATIONS") || isProxyEnvDisabled("GOPROXY_DISABLE_PROXY_POOL_OPT") {
		UseOptimizedPool = false
	}
}

func isProxyEnvDisabled(key string) bool {
	val := strings.ToLower(os.Getenv(key))
	return val == "true" || val == "1" || val == "yes"
}

var (
	pool     *ProxyPool
	poolOnce sync.Once
)

func GetPool() *ProxyPool {
	poolOnce.Do(func() {
		pool = &ProxyPool{
			proxies:     make([]*Proxy, 0),
			bindings:    make(map[string][]*ProxyKeyBinding),
			current:     0,
			keyIndex:    make(map[string]int),
			clientCache: make(map[string]*http.Client),
		}
		pool.LoadFromDB()
	})
	return pool
}

// GetOptimizedOrLegacyPool returns the appropriate pool based on configuration
// This allows gradual migration to the optimized pool
func GetOptimizedOrLegacyPool() interface {
	SelectProxy() (*Proxy, error)
	SelectProxyWithKey() (*Proxy, string, error)
	SelectProxyWithKeyByClient(string) (*Proxy, string, error)
	CreateHTTPClientWithProxy(*Proxy) (*http.Client, error)
	GetProxyCount() int
	HasProxies() bool
	Reload() error
} {
	if UseOptimizedPool {
		return GetOptimizedPool()
	}
	return GetPool()
}

func (p *ProxyPool) LoadFromDB() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Load proxies
	cursor, err := db.GetCollection("proxies").Find(ctx, bson.M{"isActive": true})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	p.mu.Lock()
	defer p.mu.Unlock()

	p.proxies = make([]*Proxy, 0)
	for cursor.Next(ctx) {
		var proxy Proxy
		if err := cursor.Decode(&proxy); err != nil {
			log.Printf("⚠️ Failed to decode proxy: %v", err)
			continue
		}
		p.proxies = append(p.proxies, &proxy)
	}

	// Load bindings
	p.bindings = make(map[string][]*ProxyKeyBinding)
	bindingsCursor, err := db.GetCollection("proxy_key_bindings").Find(ctx, bson.M{"isActive": true})
	if err != nil {
		return err
	}
	defer bindingsCursor.Close(ctx)

	for bindingsCursor.Next(ctx) {
		var binding ProxyKeyBinding
		if err := bindingsCursor.Decode(&binding); err != nil {
			log.Printf("⚠️ Failed to decode binding: %v", err)
			continue
		}
		p.bindings[binding.ProxyID] = append(p.bindings[binding.ProxyID], &binding)
	}

	// Sort bindings by priority for each proxy
	for proxyID := range p.bindings {
		sort.Slice(p.bindings[proxyID], func(i, j int) bool {
			return p.bindings[proxyID][i].Priority < p.bindings[proxyID][j].Priority
		})
	}

	// Initialize keyIndex for new proxies (preserve existing indices)
	if p.keyIndex == nil {
		p.keyIndex = make(map[string]int)
	}

	log.Printf("✅ Loaded %d proxies with bindings", len(p.proxies))
	return nil
}

// SelectProxy returns the next available proxy using round-robin
func (p *ProxyPool) SelectProxy() (*Proxy, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if len(p.proxies) == 0 {
		return nil, ErrNoAvailableProxy
	}

	// Round-robin through available proxies
	startIdx := p.current
	for i := 0; i < len(p.proxies); i++ {
		idx := (startIdx + i) % len(p.proxies)
		proxy := p.proxies[idx]

		if proxy.IsAvailable() {
			p.current = (idx + 1) % len(p.proxies)
			return proxy, nil
		}
	}

	return nil, ErrNoAvailableProxy
}

// SelectProxyWithKey returns a proxy and its primary/secondary key (round-robin)
func (p *ProxyPool) SelectProxyWithKey() (*Proxy, string, error) {
	proxy, err := p.SelectProxy()
	if err != nil {
		return nil, "", err
	}

	return p.getKeyForProxy(proxy)
}

// SelectProxyWithKeyByClient returns proxy+key using round-robin rotation
// Each request gets the next available proxy, and rotates through ALL keys of that proxy
func (p *ProxyPool) SelectProxyWithKeyByClient(clientAPIKey string) (*Proxy, string, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if len(p.proxies) == 0 {
		return nil, "", ErrNoAvailableProxy
	}

	// Round-robin through available proxies
	startIdx := p.current
	for i := 0; i < len(p.proxies); i++ {
		idx := (startIdx + i) % len(p.proxies)
		proxy := p.proxies[idx]

		if proxy.IsAvailable() {
			// Get bindings for this proxy (already sorted by priority)
			bindings := p.bindings[proxy.ID]
			if len(bindings) == 0 {
				continue
			}

			// Get active bindings only
			activeBindings := make([]*ProxyKeyBinding, 0)
			for _, b := range bindings {
				if b.IsActive {
					activeBindings = append(activeBindings, b)
				}
			}
			if len(activeBindings) == 0 {
				continue
			}

			// Round-robin through ALL keys of this proxy
			keyIdx := p.keyIndex[proxy.ID]
			if keyIdx >= len(activeBindings) {
				keyIdx = 0
			}

			selectedKey := activeBindings[keyIdx].FactoryKeyID

			// Move to next key for this proxy
			p.keyIndex[proxy.ID] = (keyIdx + 1) % len(activeBindings)

			// Move to next proxy for next request
			p.current = (idx + 1) % len(p.proxies)

			return proxy, selectedKey, nil
		}
	}

	return nil, "", ErrNoAvailableProxy
}

// getKeyForProxy returns a key for the given proxy
func (p *ProxyPool) getKeyForProxy(proxy *Proxy) (*Proxy, string, error) {
	p.mu.RLock()
	bindings := p.bindings[proxy.ID]
	p.mu.RUnlock()

	if len(bindings) == 0 {
		return nil, "", ErrNoBindings
	}

	// Return primary key (priority 1) first
	for _, binding := range bindings {
		if binding.Priority == 1 && binding.IsActive {
			return proxy, binding.FactoryKeyID, nil
		}
	}

	// Fallback to any active binding
	for _, binding := range bindings {
		if binding.IsActive {
			return proxy, binding.FactoryKeyID, nil
		}
	}

	return nil, "", ErrNoBindings
}

// GetSecondaryKey returns the secondary key for a proxy
func (p *ProxyPool) GetSecondaryKey(proxyID string) (string, error) {
	p.mu.RLock()
	bindings := p.bindings[proxyID]
	p.mu.RUnlock()

	for _, binding := range bindings {
		if binding.Priority == 2 && binding.IsActive {
			return binding.FactoryKeyID, nil
		}
	}

	return "", ErrNoBindings
}

// MarkProxyUnhealthy marks a proxy as unhealthy
func (p *ProxyPool) MarkProxyUnhealthy(proxyID string, errMsg string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	for _, proxy := range p.proxies {
		if proxy.ID == proxyID {
			proxy.Status = StatusUnhealthy
			proxy.LastError = errMsg
			proxy.FailCount++
			now := time.Now()
			proxy.LastCheckedAt = &now
			break
		}
	}

	// Update in database
	go p.updateProxyStatus(proxyID, StatusUnhealthy, errMsg)
}

// MarkProxyHealthy marks a proxy as healthy
func (p *ProxyPool) MarkProxyHealthy(proxyID string, latencyMs int) {
	p.mu.Lock()
	defer p.mu.Unlock()

	for _, proxy := range p.proxies {
		if proxy.ID == proxyID {
			proxy.Status = StatusHealthy
			proxy.LastLatencyMs = latencyMs
			proxy.LastError = ""
			proxy.FailCount = 0
			now := time.Now()
			proxy.LastCheckedAt = &now
			break
		}
	}

	// Update in database
	go p.updateProxyStatusHealthy(proxyID, latencyMs)
}

func (p *ProxyPool) updateProxyStatus(proxyID string, status ProxyStatus, errMsg string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{
		"$set": bson.M{
			"status":        status,
			"lastError":     errMsg,
			"lastCheckedAt": time.Now(),
		},
		"$inc": bson.M{
			"failCount": 1,
		},
	}

	_, err := db.GetCollection("proxies").UpdateByID(ctx, proxyID, update)
	if err != nil {
		log.Printf("⚠️ Failed to update proxy status: %v", err)
	}
}

func (p *ProxyPool) updateProxyStatusHealthy(proxyID string, latencyMs int) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{
		"$set": bson.M{
			"status":        StatusHealthy,
			"lastLatencyMs": latencyMs,
			"lastError":     "",
			"failCount":     0,
			"lastCheckedAt": time.Now(),
		},
	}

	_, err := db.GetCollection("proxies").UpdateByID(ctx, proxyID, update)
	if err != nil {
		log.Printf("⚠️ Failed to update proxy status: %v", err)
	}
}

// CreateHTTPClientWithProxy creates or returns a cached HTTP client configured with the proxy
func (p *ProxyPool) CreateHTTPClientWithProxy(proxy *Proxy) (*http.Client, error) {
	proxyID := proxy.ID

	// Check cache first (read lock)
	p.clientMu.RLock()
	if client, exists := p.clientCache[proxyID]; exists {
		p.clientMu.RUnlock()
		return client, nil
	}
	p.clientMu.RUnlock()

	// Create new client (write lock)
	p.clientMu.Lock()
	defer p.clientMu.Unlock()

	// Double-check after acquiring write lock
	if client, exists := p.clientCache[proxyID]; exists {
		return client, nil
	}

	transport, err := proxy.CreateHTTPTransport()
	if err != nil {
		return nil, err
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   0, // No timeout for streaming responses (Claude thinking can take >30s)
	}

	p.clientCache[proxyID] = client
	return client, nil
}

// InvalidateClientCache removes a proxy's cached client (call when proxy fails)
func (p *ProxyPool) InvalidateClientCache(proxyID string) {
	p.clientMu.Lock()
	defer p.clientMu.Unlock()
	delete(p.clientCache, proxyID)
}

// GetProxyCount returns the number of active proxies
func (p *ProxyPool) GetProxyCount() int {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return len(p.proxies)
}

// HasProxies returns true if there are any proxies configured
func (p *ProxyPool) HasProxies() bool {
	return p.GetProxyCount() > 0
}

// Reload refreshes the proxy pool from database
func (p *ProxyPool) Reload() error {
	return p.LoadFromDB()
}

// StartAutoReload starts a background goroutine that periodically reloads bindings from database
func (p *ProxyPool) StartAutoReload(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		log.Printf("🔄 Auto-reload started (interval: %v)", interval)

		for range ticker.C {
			if err := p.LoadFromDB(); err != nil {
				log.Printf("⚠️ Auto-reload failed: %v", err)
			} else {
				log.Printf("🔄 Auto-reloaded proxy bindings (%d proxies)", p.GetProxyCount())
			}
		}
	}()
}

// GetBindingsInfo returns a summary of current bindings for logging
func (p *ProxyPool) GetBindingsInfo() map[string][]string {
	p.mu.RLock()
	defer p.mu.RUnlock()

	info := make(map[string][]string)
	for proxyID, bindings := range p.bindings {
		keys := make([]string, 0)
		for _, b := range bindings {
			if b.IsActive {
				keys = append(keys, b.FactoryKeyID)
			}
		}
		info[proxyID] = keys
	}
	return info
}
