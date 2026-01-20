package proxy

import (
	"context"
	"log"
	"net/http"
	"sort"
	"sync/atomic"
	"time"

	"github.com/puzpuzpuz/xsync/v4"
	"go.mongodb.org/mongo-driver/bson"
	"goproxy/db"
)

// OptimizedProxyPool uses xsync.Map and atomic operations for lock-free access
type OptimizedProxyPool struct {
	proxies     *xsync.Map[string, *Proxy]           // proxyId -> Proxy
	proxyList   atomic.Pointer[[]*Proxy]              // ordered list for round-robin
	bindings    *xsync.Map[string, []*ProxyKeyBinding] // proxyId -> bindings
	current     atomic.Int32                          // lock-free round-robin counter
	keyIndex    *xsync.Map[string, *atomic.Int32]     // proxyId -> key index
	clientCache *xsync.Map[string, *http.Client]      // proxyId -> cached HTTP client
}

var (
	optimizedPool     *OptimizedProxyPool
	optimizedPoolOnce atomic.Bool
)

// GetOptimizedPool returns the singleton optimized proxy pool
func GetOptimizedPool() *OptimizedProxyPool {
	if !optimizedPoolOnce.Load() {
		if optimizedPoolOnce.CompareAndSwap(false, true) {
			optimizedPool = &OptimizedProxyPool{
				proxies:     xsync.NewMap[string, *Proxy](),
				bindings:    xsync.NewMap[string, []*ProxyKeyBinding](),
				keyIndex:    xsync.NewMap[string, *atomic.Int32](),
				clientCache: xsync.NewMap[string, *http.Client](),
			}
			optimizedPool.LoadFromDB()
		}
	}
	return optimizedPool
}

// LoadFromDB loads proxies and bindings from database
func (p *OptimizedProxyPool) LoadFromDB() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Load proxies
	cursor, err := db.GetCollection("proxies").Find(ctx, bson.M{"isActive": true})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	newProxies := make([]*Proxy, 0)
	for cursor.Next(ctx) {
		var proxy Proxy
		if err := cursor.Decode(&proxy); err != nil {
			log.Printf("⚠️ Failed to decode proxy: %v", err)
			continue
		}
		p.proxies.Store(proxy.ID, &proxy)
		newProxies = append(newProxies, &proxy)
	}

	// Update atomic proxy list
	p.proxyList.Store(&newProxies)

	// Load bindings
	bindingsCursor, err := db.GetCollection("proxy_key_bindings").Find(ctx, bson.M{"isActive": true})
	if err != nil {
		return err
	}
	defer bindingsCursor.Close(ctx)

	// Temporary map for collecting bindings
	bindingsMap := make(map[string][]*ProxyKeyBinding)
	for bindingsCursor.Next(ctx) {
		var binding ProxyKeyBinding
		if err := bindingsCursor.Decode(&binding); err != nil {
			log.Printf("⚠️ Failed to decode binding: %v", err)
			continue
		}
		bindingsMap[binding.ProxyID] = append(bindingsMap[binding.ProxyID], &binding)
	}

	// Sort bindings by priority and store
	for proxyID, bindings := range bindingsMap {
		sort.Slice(bindings, func(i, j int) bool {
			return bindings[i].Priority < bindings[j].Priority
		})
		p.bindings.Store(proxyID, bindings)
		
		// Initialize key index if not exists
		if _, ok := p.keyIndex.Load(proxyID); !ok {
			idx := &atomic.Int32{}
			p.keyIndex.Store(proxyID, idx)
		}
	}

	log.Printf("✅ [Optimized] Loaded %d proxies with bindings", len(newProxies))
	return nil
}

// SelectProxy returns the next available proxy using lock-free round-robin
func (p *OptimizedProxyPool) SelectProxy() (*Proxy, error) {
	proxyList := p.proxyList.Load()
	if proxyList == nil || len(*proxyList) == 0 {
		return nil, ErrNoAvailableProxy
	}

	proxies := *proxyList
	count := int32(len(proxies))
	
	// Atomic increment - NO LOCK
	startIdx := p.current.Add(1) % count
	
	// Round-robin through available proxies
	for i := int32(0); i < count; i++ {
		idx := (startIdx + i) % count
		proxy := proxies[idx]
		if proxy.IsAvailable() {
			return proxy, nil
		}
	}

	return nil, ErrNoAvailableProxy
}

// SelectProxyWithKey returns a proxy and its key using lock-free operations
func (p *OptimizedProxyPool) SelectProxyWithKey() (*Proxy, string, error) {
	proxy, err := p.SelectProxy()
	if err != nil {
		return nil, "", err
	}
	return p.getKeyForProxy(proxy)
}

// SelectProxyWithKeyByClient returns proxy+key using lock-free round-robin
func (p *OptimizedProxyPool) SelectProxyWithKeyByClient(clientAPIKey string) (*Proxy, string, error) {
	proxyList := p.proxyList.Load()
	if proxyList == nil || len(*proxyList) == 0 {
		return nil, "", ErrNoAvailableProxy
	}

	proxies := *proxyList
	count := int32(len(proxies))
	
	// Atomic increment - NO LOCK
	startIdx := p.current.Add(1) % count
	
	for i := int32(0); i < count; i++ {
		idx := (startIdx + i) % count
		proxy := proxies[idx]

		if !proxy.IsAvailable() {
			continue
		}

		// Get bindings (lock-free read)
		bindings, ok := p.bindings.Load(proxy.ID)
		if !ok || len(bindings) == 0 {
			continue
		}

		// Get active bindings
		activeBindings := make([]*ProxyKeyBinding, 0, len(bindings))
		for _, b := range bindings {
			if b.IsActive {
				activeBindings = append(activeBindings, b)
			}
		}
		if len(activeBindings) == 0 {
			continue
		}

		// Get or create key index (lock-free)
		keyIdxPtr, _ := p.keyIndex.LoadOrStore(proxy.ID, &atomic.Int32{})

		// Atomic key rotation - NO LOCK
		keyIdx := keyIdxPtr.Add(1) % int32(len(activeBindings))
		selectedKey := activeBindings[keyIdx].FactoryKeyID

		return proxy, selectedKey, nil
	}

	return nil, "", ErrNoAvailableProxy
}

// getKeyForProxy returns a key for the given proxy (lock-free)
func (p *OptimizedProxyPool) getKeyForProxy(proxy *Proxy) (*Proxy, string, error) {
	bindings, ok := p.bindings.Load(proxy.ID)
	if !ok || len(bindings) == 0 {
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

// GetSecondaryKey returns the secondary key for a proxy (lock-free)
func (p *OptimizedProxyPool) GetSecondaryKey(proxyID string) (string, error) {
	bindings, ok := p.bindings.Load(proxyID)
	if !ok {
		return "", ErrNoBindings
	}

	for _, binding := range bindings {
		if binding.Priority == 2 && binding.IsActive {
			return binding.FactoryKeyID, nil
		}
	}

	return "", ErrNoBindings
}

// MarkProxyUnhealthy marks a proxy as unhealthy
func (p *OptimizedProxyPool) MarkProxyUnhealthy(proxyID string, errMsg string) {
	if proxy, ok := p.proxies.Load(proxyID); ok {
		proxy.Status = StatusUnhealthy
		proxy.LastError = errMsg
		proxy.FailCount++
		now := time.Now()
		proxy.LastCheckedAt = &now
	}

	// Update in database (async)
	go p.updateProxyStatus(proxyID, StatusUnhealthy, errMsg)
}

// MarkProxyHealthy marks a proxy as healthy
func (p *OptimizedProxyPool) MarkProxyHealthy(proxyID string, latencyMs int) {
	if proxy, ok := p.proxies.Load(proxyID); ok {
		proxy.Status = StatusHealthy
		proxy.LastLatencyMs = latencyMs
		proxy.LastError = ""
		proxy.FailCount = 0
		now := time.Now()
		proxy.LastCheckedAt = &now
	}

	// Update in database (async)
	go p.updateProxyStatusHealthy(proxyID, latencyMs)
}

func (p *OptimizedProxyPool) updateProxyStatus(proxyID string, status ProxyStatus, errMsg string) {
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

func (p *OptimizedProxyPool) updateProxyStatusHealthy(proxyID string, latencyMs int) {
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

// CreateHTTPClientWithProxy creates or returns a cached HTTP client (lock-free)
func (p *OptimizedProxyPool) CreateHTTPClientWithProxy(proxy *Proxy) (*http.Client, error) {
	// Try to get from cache first (lock-free)
	if client, ok := p.clientCache.Load(proxy.ID); ok {
		return client, nil
	}

	// Create new client
	transport, err := proxy.CreateHTTPTransport()
	if err != nil {
		return nil, err
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   0, // No timeout for streaming
	}

	// Store in cache (lock-free, last write wins)
	p.clientCache.Store(proxy.ID, client)
	return client, nil
}

// InvalidateClientCache removes a proxy's cached client
func (p *OptimizedProxyPool) InvalidateClientCache(proxyID string) {
	p.clientCache.Delete(proxyID)
}

// GetProxyCount returns the number of active proxies
func (p *OptimizedProxyPool) GetProxyCount() int {
	proxyList := p.proxyList.Load()
	if proxyList == nil {
		return 0
	}
	return len(*proxyList)
}

// HasProxies returns true if there are any proxies configured
func (p *OptimizedProxyPool) HasProxies() bool {
	return p.GetProxyCount() > 0
}

// Reload refreshes the proxy pool from database
func (p *OptimizedProxyPool) Reload() error {
	return p.LoadFromDB()
}

// StartAutoReload starts a background goroutine that periodically reloads
func (p *OptimizedProxyPool) StartAutoReload(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		log.Printf("🔄 [Optimized] Auto-reload started (interval: %v)", interval)

		for range ticker.C {
			if err := p.LoadFromDB(); err != nil {
				log.Printf("⚠️ [Optimized] Auto-reload failed: %v", err)
			} else {
				log.Printf("🔄 [Optimized] Auto-reloaded proxy bindings (%d proxies)", p.GetProxyCount())
			}
		}
	}()
}

// GetBindingsInfo returns a summary of current bindings
func (p *OptimizedProxyPool) GetBindingsInfo() map[string][]string {
	info := make(map[string][]string)
	p.bindings.Range(func(proxyID string, bindings []*ProxyKeyBinding) bool {
		keys := make([]string, 0)
		for _, b := range bindings {
			if b.IsActive {
				keys = append(keys, b.FactoryKeyID)
			}
		}
		info[proxyID] = keys
		return true
	})
	return info
}

// Ensure OptimizedProxyPool implements same interface
var _ interface {
	SelectProxy() (*Proxy, error)
	SelectProxyWithKey() (*Proxy, string, error)
	SelectProxyWithKeyByClient(string) (*Proxy, string, error)
	CreateHTTPClientWithProxy(*Proxy) (*http.Client, error)
	GetProxyCount() int
	HasProxies() bool
	Reload() error
} = (*OptimizedProxyPool)(nil)
