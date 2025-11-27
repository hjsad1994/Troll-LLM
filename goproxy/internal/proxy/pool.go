package proxy

import (
	"context"
	"errors"
	"log"
	"net/http"
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
	mu       sync.RWMutex
	proxies  []*Proxy
	bindings map[string][]*ProxyKeyBinding // proxyId -> bindings
	current  int
}

var (
	pool     *ProxyPool
	poolOnce sync.Once
)

func GetPool() *ProxyPool {
	poolOnce.Do(func() {
		pool = &ProxyPool{
			proxies:  make([]*Proxy, 0),
			bindings: make(map[string][]*ProxyKeyBinding),
			current:  0,
		}
		pool.LoadFromDB()
	})
	return pool
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
// Each request gets the next available proxy in rotation
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
			// Get key for this proxy
			bindings := p.bindings[proxy.ID]
			if len(bindings) == 0 {
				continue
			}

			// Return primary key (priority 1) first
			for _, binding := range bindings {
				if binding.Priority == 1 && binding.IsActive {
					// Move to next proxy for next request
					p.current = (idx + 1) % len(p.proxies)
					return proxy, binding.FactoryKeyID, nil
				}
			}

			// Fallback to any active binding
			for _, binding := range bindings {
				if binding.IsActive {
					// Move to next proxy for next request
					p.current = (idx + 1) % len(p.proxies)
					return proxy, binding.FactoryKeyID, nil
				}
			}
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

// CreateHTTPClientWithProxy creates an HTTP client configured with the proxy
func (p *ProxyPool) CreateHTTPClientWithProxy(proxy *Proxy) (*http.Client, error) {
	transport, err := proxy.CreateHTTPTransport()
	if err != nil {
		return nil, err
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   0, // No timeout for streaming responses (Claude thinking can take >30s)
	}

	return client, nil
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
