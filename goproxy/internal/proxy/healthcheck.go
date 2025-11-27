package proxy

import (
	"context"
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"goproxy/db"
)

const (
	HealthCheckInterval = 30 * time.Second
	HealthCheckTimeout  = 10 * time.Second
	MaxFailCount        = 3 // Mark unhealthy after 3 consecutive failures
)

type HealthChecker struct {
	pool     *ProxyPool
	stopChan chan struct{}
	wg       sync.WaitGroup
}

func NewHealthChecker(pool *ProxyPool) *HealthChecker {
	return &HealthChecker{
		pool:     pool,
		stopChan: make(chan struct{}),
	}
}

func (h *HealthChecker) Start() {
	h.wg.Add(1)
	go h.run()
	log.Printf("✅ Health checker started (interval: %v)", HealthCheckInterval)
}

func (h *HealthChecker) Stop() {
	close(h.stopChan)
	h.wg.Wait()
	log.Printf("⏹️ Health checker stopped")
}

func (h *HealthChecker) run() {
	defer h.wg.Done()

	// Initial check
	h.checkAll()

	ticker := time.NewTicker(HealthCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			h.checkAll()
		case <-h.stopChan:
			return
		}
	}
}

func (h *HealthChecker) checkAll() {
	h.pool.mu.RLock()
	proxies := make([]*Proxy, len(h.pool.proxies))
	copy(proxies, h.pool.proxies)
	h.pool.mu.RUnlock()

	var wg sync.WaitGroup
	for _, proxy := range proxies {
		wg.Add(1)
		go func(p *Proxy) {
			defer wg.Done()
			h.checkProxy(p)
		}(proxy)
	}
	wg.Wait()
}

func (h *HealthChecker) checkProxy(proxy *Proxy) {
	start := time.Now()
	err := h.testProxy(proxy)
	latencyMs := int(time.Since(start).Milliseconds())

	status := "healthy"
	errMsg := ""

	if err != nil {
		status = "error"
		errMsg = err.Error()

		// Increment fail count in pool
		h.pool.mu.Lock()
		for _, p := range h.pool.proxies {
			if p.ID == proxy.ID {
				p.FailCount++
				if p.FailCount >= MaxFailCount {
					p.Status = StatusUnhealthy
					status = "unhealthy"
				}
				p.LastError = errMsg
				now := time.Now()
				p.LastCheckedAt = &now
				break
			}
		}
		h.pool.mu.Unlock()

		log.Printf("⚠️ Proxy %s health check failed: %v", proxy.Name, err)
	} else {
		// Reset fail count on success
		h.pool.mu.Lock()
		for _, p := range h.pool.proxies {
			if p.ID == proxy.ID {
				wasUnhealthy := p.Status == StatusUnhealthy
				p.Status = StatusHealthy
				p.FailCount = 0
				p.LastLatencyMs = latencyMs
				p.LastError = ""
				now := time.Now()
				p.LastCheckedAt = &now

				if wasUnhealthy {
					log.Printf("✅ Proxy %s recovered (latency: %dms)", proxy.Name, latencyMs)
				}
				break
			}
		}
		h.pool.mu.Unlock()
	}

	// Log to database
	h.logHealthCheck(proxy.ID, status, latencyMs, errMsg)

	// Update proxy status in database
	h.updateProxyInDB(proxy.ID, status, latencyMs, errMsg)
}

func (h *HealthChecker) testProxy(proxy *Proxy) error {
	// Test TCP connection first
	addr := proxy.Host + ":" + itoa(proxy.Port)
	conn, err := net.DialTimeout("tcp", addr, HealthCheckTimeout)
	if err != nil {
		return err
	}
	conn.Close()

	// Test HTTP request through proxy
	transport, err := proxy.CreateHTTPTransport()
	if err != nil {
		return err
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   HealthCheckTimeout,
	}

	// Use a simple HEAD request to google.com or cloudflare
	req, err := http.NewRequest("HEAD", "https://www.cloudflare.com", nil)
	if err != nil {
		return err
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()

	return nil
}

func (h *HealthChecker) logHealthCheck(proxyID, status string, latencyMs int, errMsg string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	logEntry := bson.M{
		"proxyId":   proxyID,
		"status":    status,
		"latencyMs": latencyMs,
		"checkedAt": time.Now(),
	}
	if errMsg != "" {
		logEntry["errorMessage"] = errMsg
	}

	_, err := db.GetCollection("proxy_health_logs").InsertOne(ctx, logEntry)
	if err != nil {
		log.Printf("⚠️ Failed to log health check: %v", err)
	}
}

func (h *HealthChecker) updateProxyInDB(proxyID, status string, latencyMs int, errMsg string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var dbStatus ProxyStatus
	switch status {
	case "healthy":
		dbStatus = StatusHealthy
	case "unhealthy":
		dbStatus = StatusUnhealthy
	default:
		dbStatus = StatusUnknown
	}

	update := bson.M{
		"$set": bson.M{
			"status":        dbStatus,
			"lastLatencyMs": latencyMs,
			"lastError":     errMsg,
			"lastCheckedAt": time.Now(),
		},
	}

	if status == "healthy" {
		update["$set"].(bson.M)["failCount"] = 0
	}

	_, err := db.GetCollection("proxies").UpdateByID(ctx, proxyID, update)
	if err != nil {
		log.Printf("⚠️ Failed to update proxy in DB: %v", err)
	}
}
