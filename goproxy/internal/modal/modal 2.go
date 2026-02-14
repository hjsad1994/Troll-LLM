package modal

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"golang.org/x/net/http2"
)

const (
	// ModalEndpoint is the base URL for Modal's OpenAI-compatible API
	ModalEndpoint = "https://api.us-west-2.modal.direct/v1/chat/completions"

	// ModalModelID is the actual model identifier for GLM-5 on Modal
	ModalModelID = "zai-org/GLM-5-FP8"
)

// Modal holds the provider configuration
type Modal struct {
	apiKey     string
	httpClient *http.Client
}

var (
	instance *Modal
	once     sync.Once
)

// Configure initializes the Modal provider from environment variables.
// Returns the provider instance (nil if MODAL_API_KEY is not set).
func Configure() *Modal {
	once.Do(func() {
		apiKey := os.Getenv("MODAL_API_KEY")
		if apiKey == "" {
			log.Printf("⚠️ [Modal] MODAL_API_KEY not set — Modal provider disabled")
			return
		}

		transport := &http.Transport{
			TLSClientConfig: &tls.Config{
				MinVersion: tls.VersionTLS12,
			},
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     90 * time.Second,
		}
		// Enable HTTP/2
		http2.ConfigureTransport(transport)

		instance = &Modal{
			apiKey: apiKey,
			httpClient: &http.Client{
				Transport: transport,
				Timeout:   5 * time.Minute,
			},
		}
		log.Printf("✅ [Modal] Provider configured (endpoint: %s)", ModalEndpoint)
	})
	return instance
}

// GetModal returns the singleton Modal instance, or nil if not configured.
func GetModal() *Modal {
	return instance
}

// IsConfigured returns true if Modal has a valid API key.
func (m *Modal) IsConfigured() bool {
	return m != nil && m.apiKey != ""
}

// ForwardRequest sends an OpenAI-format request body to Modal's endpoint.
// The caller must have already set the model field to the upstream model ID.
func (m *Modal) ForwardRequest(body []byte, isStreaming bool) (*http.Response, error) {
	if m == nil || m.apiKey == "" {
		return nil, fmt.Errorf("modal provider not configured")
	}

	req, err := http.NewRequest("POST", ModalEndpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create Modal request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+m.apiKey)
	req.Header.Set("Accept", "application/json")
	if isStreaming {
		req.Header.Set("Accept", "text/event-stream")
	}

	resp, err := m.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("modal request failed: %w", err)
	}

	if resp.StatusCode >= 400 {
		// Read error body for logging
		errBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		log.Printf("❌ [Modal] Upstream error %d: %s", resp.StatusCode, string(errBody))
		// Return a new response with the error body so the caller can handle it
		resp.Body = io.NopCloser(bytes.NewReader(errBody))
	}

	return resp, nil
}
