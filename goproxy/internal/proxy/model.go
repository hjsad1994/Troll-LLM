package proxy

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"time"

	"golang.org/x/net/proxy"
)

type ProxyType string

const (
	ProxyTypeHTTP   ProxyType = "http"
	ProxyTypeSOCKS5 ProxyType = "socks5"
)

type ProxyStatus string

const (
	StatusHealthy   ProxyStatus = "healthy"
	StatusUnhealthy ProxyStatus = "unhealthy"
	StatusUnknown   ProxyStatus = "unknown"
)

type Proxy struct {
	ID            string      `bson:"_id" json:"id"`
	Name          string      `bson:"name" json:"name"`
	Type          ProxyType   `bson:"type" json:"type"`
	Host          string      `bson:"host" json:"host"`
	Port          int         `bson:"port" json:"port"`
	Username      string      `bson:"username,omitempty" json:"username,omitempty"`
	Password      string      `bson:"password,omitempty" json:"password,omitempty"`
	Status        ProxyStatus `bson:"status" json:"status"`
	LastLatencyMs int         `bson:"lastLatencyMs,omitempty" json:"last_latency_ms,omitempty"`
	LastCheckedAt *time.Time  `bson:"lastCheckedAt,omitempty" json:"last_checked_at,omitempty"`
	LastError     string      `bson:"lastError,omitempty" json:"last_error,omitempty"`
	FailCount     int         `bson:"failCount" json:"fail_count"`
	IsActive      bool        `bson:"isActive" json:"is_active"`
	CreatedAt     time.Time   `bson:"createdAt" json:"created_at"`
}

type ProxyKeyBinding struct {
	ProxyID      string    `bson:"proxyId" json:"proxy_id"`
	FactoryKeyID string    `bson:"factoryKeyId" json:"factory_key_id"`
	Priority     int       `bson:"priority" json:"priority"` // 1 = primary, 2 = secondary
	IsActive     bool      `bson:"isActive" json:"is_active"`
	CreatedAt    time.Time `bson:"createdAt" json:"created_at"`
}

type ProxyHealthLog struct {
	ProxyID      string    `bson:"proxyId" json:"proxy_id"`
	Status       string    `bson:"status" json:"status"`
	LatencyMs    int       `bson:"latencyMs,omitempty" json:"latency_ms,omitempty"`
	ErrorMessage string    `bson:"errorMessage,omitempty" json:"error_message,omitempty"`
	CheckedAt    time.Time `bson:"checkedAt" json:"checked_at"`
}

func (p *Proxy) IsAvailable() bool {
	return p.IsActive && p.Status != StatusUnhealthy
}

func (p *Proxy) GetURL() string {
	if p.Username != "" && p.Password != "" {
		return p.Type.String() + "://" + p.Username + ":" + p.Password + "@" + p.Host + ":" + string(rune(p.Port))
	}
	return p.Type.String() + "://" + p.Host + ":" + string(rune(p.Port))
}

func (t ProxyType) String() string {
	return string(t)
}

// CreateHTTPTransport creates an HTTP transport with the proxy configured
func (p *Proxy) CreateHTTPTransport() (*http.Transport, error) {
	switch p.Type {
	case ProxyTypeHTTP:
		return p.createHTTPProxyTransport()
	case ProxyTypeSOCKS5:
		return p.createSOCKS5ProxyTransport()
	default:
		return http.DefaultTransport.(*http.Transport).Clone(), nil
	}
}

func (p *Proxy) createHTTPProxyTransport() (*http.Transport, error) {
	proxyURLStr := "http://"
	if p.Username != "" && p.Password != "" {
		proxyURLStr += url.QueryEscape(p.Username) + ":" + url.QueryEscape(p.Password) + "@"
	}
	proxyURLStr += p.Host + ":" + itoa(p.Port)

	proxyURL, err := url.Parse(proxyURLStr)
	if err != nil {
		return nil, err
	}

	// Custom dialer with aggressive TCP KeepAlive to prevent proxy idle timeout
	dialer := &net.Dialer{
		Timeout:   30 * time.Second,
		KeepAlive: 5 * time.Second, // Send keepalive every 5s to prevent 15s idle timeout
	}

	transport := &http.Transport{
		Proxy:                 http.ProxyURL(proxyURL),
		DialContext:           dialer.DialContext,
		IdleConnTimeout:       120 * time.Second,
		ResponseHeaderTimeout: 0, // No timeout for streaming
		ExpectContinueTimeout: 10 * time.Second,
		MaxIdleConns:          100,
		MaxIdleConnsPerHost:   10,
	}
	return transport, nil
}

func (p *Proxy) createSOCKS5ProxyTransport() (*http.Transport, error) {
	var auth *proxy.Auth
	if p.Username != "" && p.Password != "" {
		auth = &proxy.Auth{
			User:     p.Username,
			Password: p.Password,
		}
	}

	// Create base dialer with TCP KeepAlive
	baseDialer := &net.Dialer{
		Timeout:   30 * time.Second,
		KeepAlive: 5 * time.Second, // Send keepalive every 5s
	}

	dialer, err := proxy.SOCKS5("tcp", p.Host+":"+itoa(p.Port), auth, baseDialer)
	if err != nil {
		return nil, err
	}

	// Wrap to add keepalive to proxied connections
	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			conn, err := dialer.(proxy.ContextDialer).DialContext(ctx, network, addr)
			if err != nil {
				return nil, err
			}
			// Enable TCP KeepAlive on the connection
			if tcpConn, ok := conn.(*net.TCPConn); ok {
				tcpConn.SetKeepAlive(true)
				tcpConn.SetKeepAlivePeriod(5 * time.Second)
			}
			return conn, nil
		},
		IdleConnTimeout:       120 * time.Second,
		ResponseHeaderTimeout: 0, // No timeout for streaming
		ExpectContinueTimeout: 10 * time.Second,
		MaxIdleConns:          100,
		MaxIdleConnsPerHost:   10,
	}
	return transport, nil
}

func itoa(i int) string {
	return fmt.Sprintf("%d", i)
}
