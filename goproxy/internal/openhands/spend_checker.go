package openhands

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"goproxy/db"
)

// Constants for spend checking
const (
	OpenHandsActivityURL  = "https://llm-proxy.app.all-hands.dev/user/daily/activity"
	DefaultSpendThreshold = 10.0
	ActiveKeyWindow       = 4 * time.Minute

	// Fixed check interval for ALL keys - 10 seconds
	SpendCheckInterval = 10 * time.Second

	// Legacy defaults (kept for backward compatibility in StartSpendChecker signature)
	DefaultActiveCheckInterval = 10 * time.Second
	DefaultIdleCheckInterval   = 1 * time.Hour
)

// SpendChecker monitors OpenHands key spend (monitor-only, no rotation actions)
type SpendChecker struct {
	provider  *OpenHandsProvider
	threshold float64
	// baseCheckInterval is the ticker interval (uses fixed 10s)
	baseCheckInterval time.Duration
	stopChan          chan struct{}
	running           bool
	mu                sync.Mutex
}

// SpendCheckResult represents the result of a spend check API call
type SpendCheckResult struct {
	KeyID          string
	APIKey         string
	Spend          float64
	Threshold      float64
	WasActive      bool
	CheckedAt      time.Time
	Error          error
	BudgetExceeded bool // True if API returned budget_exceeded error
}

// SpendCheckerStats represents stats for the endpoint
type SpendCheckerStats struct {
	Running       bool    `json:"running"`
	Threshold     float64 `json:"threshold"`
	KeysMonitored int     `json:"keys_monitored"`
	// Fixed interval info
	CheckInterval string         `json:"check_interval"`
	KeyStats      []KeySpendStat `json:"key_stats,omitempty"`
}

// KeySpendStat represents spend stats for a single key
type KeySpendStat struct {
	KeyID          string     `json:"key_id"`
	TotalSpend     float64    `json:"total_spend"`
	SpendPercent   float64    `json:"spend_percent"`
	SpendTier      string     `json:"spend_tier"` // LOW, MEDIUM, HIGH, CRITICAL (display only)
	LastSpendCheck *time.Time `json:"last_spend_check,omitempty"`
	LastUsedAt     *time.Time `json:"last_used_at,omitempty"`
	IsActive       bool       `json:"is_active"`
}

// Global instance
var spendChecker *SpendChecker
var spendCheckerMu sync.Mutex

// NewSpendChecker creates a new SpendChecker instance
// Note: activeInterval and idleInterval are ignored - using fixed 10s interval for all keys
func NewSpendChecker(provider *OpenHandsProvider, threshold float64, activeInterval, idleInterval time.Duration) *SpendChecker {
	return &SpendChecker{
		provider:          provider,
		threshold:         threshold,
		baseCheckInterval: SpendCheckInterval, // Fixed 10s interval for all keys
		stopChan:          make(chan struct{}),
		running:           false,
	}
}

// Start begins the background spend checking goroutine
func (sc *SpendChecker) Start() {
	sc.mu.Lock()
	if sc.running {
		sc.mu.Unlock()
		return
	}
	sc.running = true
	sc.mu.Unlock()

	// Startup log disabled to reduce noise - only log on key rotation

	go func() {
		// Use base check interval (10s) as ticker - we'll skip keys based on their spend tier
		ticker := time.NewTicker(sc.baseCheckInterval)
		defer ticker.Stop()

		// Run immediately on startup
		sc.checkAllKeys()

		for {
			select {
			case <-ticker.C:
				sc.checkAllKeys()
			case <-sc.stopChan:
				// Shutdown log disabled to reduce noise
				return
			}
		}
	}()
}

// Stop gracefully stops the spend checker
func (sc *SpendChecker) Stop() {
	sc.mu.Lock()
	defer sc.mu.Unlock()

	if !sc.running {
		return
	}

	close(sc.stopChan)
	sc.running = false
}

// checkAllKeys checks spend for all healthy keys in parallel
func (sc *SpendChecker) checkAllKeys() {
	sc.provider.mu.Lock()
	keys := make([]*OpenHandsKey, len(sc.provider.keys))
	copy(keys, sc.provider.keys)
	sc.provider.mu.Unlock()

	now := time.Now()

	// Use WaitGroup for parallel execution
	var wg sync.WaitGroup

	for _, key := range keys {
		if key.Status != OpenHandsStatusHealthy {
			continue
		}

		isActive := sc.isKeyActive(key, now)

		// Check if we should check this key based on intervals
		if !sc.shouldCheckKey(key, isActive, now) {
			continue
		}

		// Launch goroutine for parallel checking
		wg.Add(1)
		go func(k *OpenHandsKey, active bool) {
			defer wg.Done()

			// Check spend for this key
			result := sc.checkKeySpend(k, active)

			// Update key spend info in DB and memory for successful/known spend responses
			if result.Error == nil {
				sc.updateKeySpendInfo(k.ID, result.Spend, result.CheckedAt)
			}

			// Handle budget_exceeded as monitoring signal only
			if result.BudgetExceeded {
				log.Printf("🚨 [OpenHands/SpendChecker] Budget exceeded for key %s (spend: $%.2f) - monitor-only, no rotation",
					k.ID, result.Spend)
				return
			}

			if result.Error != nil {
				log.Printf("⚠️ [OpenHands/SpendChecker] Failed to check key %s: %v", k.ID, result.Error)
				return
			}

			// Threshold is a monitoring signal only
			if result.Spend >= sc.threshold {
				log.Printf("⚠️ [OpenHands/SpendChecker] Key %s reached threshold (spend: $%.2f >= $%.2f) - monitor-only, no rotation",
					k.ID, result.Spend, sc.threshold)
			}
		}(key, isActive)
	}

	// Wait for all goroutines to complete
	wg.Wait()
}

// isKeyActive returns true if the key was used within ActiveKeyWindow
func (sc *SpendChecker) isKeyActive(key *OpenHandsKey, now time.Time) bool {
	if key.LastUsedAt == nil {
		return false
	}
	return now.Sub(*key.LastUsedAt) < ActiveKeyWindow
}

// getCheckIntervalForSpend returns fixed 10s interval for all keys
func (sc *SpendChecker) getCheckIntervalForSpend(spend float64) time.Duration {
	return SpendCheckInterval
}

// getSpendTierName returns spend tier name for display (based on threshold proximity)
func (sc *SpendChecker) getSpendTierName(spend float64) string {
	percent := (spend / sc.threshold) * 100
	if percent >= 94 {
		return "CRITICAL"
	}
	if percent >= 85 {
		return "HIGH"
	}
	if percent >= 50 {
		return "MEDIUM"
	}
	return "LOW"
}

// shouldCheckKey determines if we should check this key's spend based on tiered intervals
func (sc *SpendChecker) shouldCheckKey(key *OpenHandsKey, isActive bool, now time.Time) bool {
	// If never checked, always check
	if key.LastSpendCheck == nil {
		return true
	}

	elapsed := now.Sub(*key.LastSpendCheck)

	// Get the appropriate interval based on current spend
	checkInterval := sc.getCheckIntervalForSpend(key.TotalSpend)

	return elapsed >= checkInterval
}

// checkKeySpend calls the OpenHands API to get spend for a specific key
func (sc *SpendChecker) checkKeySpend(key *OpenHandsKey, isActive bool) SpendCheckResult {
	result := SpendCheckResult{
		KeyID:     key.ID,
		APIKey:    key.APIKey,
		Threshold: sc.threshold,
		WasActive: isActive,
		CheckedAt: time.Now(),
	}

	// Build URL with query params
	u, err := url.Parse(OpenHandsActivityURL)
	if err != nil {
		result.Error = fmt.Errorf("failed to parse URL: %w", err)
		return result
	}

	q := u.Query()
	q.Set("start_date", "2020-01-01")
	q.Set("end_date", "2030-12-31")
	q.Set("page", "1")
	q.Set("page_size", "100") // Need enough to get total_spend across all days
	u.RawQuery = q.Encode()

	// Create request
	req, err := http.NewRequest(http.MethodGet, u.String(), nil)
	if err != nil {
		result.Error = fmt.Errorf("failed to create request: %w", err)
		return result
	}

	// Set the specific key's API key in header
	req.Header.Set("Authorization", "Bearer "+key.APIKey)
	req.Header.Set("Accept", "application/json")

	// Get client with proxy but WITHOUT selecting a new key
	client, _ := sc.provider.GetClientWithProxyOnly()
	// Proxy log disabled to reduce noise

	// Make request with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	req = req.WithContext(ctx)

	resp, err := client.Do(req)
	if err != nil {
		result.Error = fmt.Errorf("request failed: %w", err)
		return result
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		bodyStr := string(body)

		// Check if this is a budget_exceeded error
		if resp.StatusCode == http.StatusBadRequest && strings.Contains(bodyStr, "budget_exceeded") {
			// Parse spend from error message if possible: "Spend=10.02107649999999, Budget=10.0"
			result.BudgetExceeded = true
			if idx := strings.Index(bodyStr, "Spend="); idx != -1 {
				spendStr := bodyStr[idx+6:]
				if commaIdx := strings.Index(spendStr, ","); commaIdx != -1 {
					spendStr = spendStr[:commaIdx]
					if spend, err := strconv.ParseFloat(spendStr, 64); err == nil {
						result.Spend = spend
					}
				}
			}
			// If we couldn't parse spend, default to threshold as fallback signal
			if result.Spend == 0 {
				result.Spend = sc.threshold
			}
			log.Printf("🚨 [OpenHands/SpendChecker] Key %s BUDGET EXCEEDED (monitor-only): %s", key.ID, bodyStr)
			return result
		}

		// Check if this is a 401 authentication error
		if resp.StatusCode == http.StatusUnauthorized {
			log.Printf("🚨 [OpenHands/SpendChecker] Key %s AUTH ERROR (401): %s", key.ID, bodyStr)
			result.Error = fmt.Errorf("auth error 401: %s", bodyStr)
			return result
		}

		result.Error = fmt.Errorf("API returned status %d: %s", resp.StatusCode, bodyStr)
		return result
	}

	// Parse response
	var response struct {
		Metadata struct {
			TotalSpend float64 `json:"total_spend"`
		} `json:"metadata"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		result.Error = fmt.Errorf("failed to decode response: %w", err)
		return result
	}

	result.Spend = response.Metadata.TotalSpend
	return result
}

// updateKeySpendInfo updates the key's spend info in MongoDB and memory
func (sc *SpendChecker) updateKeySpendInfo(keyID string, spend float64, checkedAt time.Time) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Update in MongoDB
	_, err := db.OpenHandsKeysCollection().UpdateByID(ctx, keyID, bson.M{
		"$set": bson.M{
			"totalSpend":     spend,
			"lastSpendCheck": checkedAt,
		},
	})
	// DB update failure ignored - non-critical for spend checking functionality
	_ = err

	// Update in memory
	sc.provider.mu.Lock()
	for _, key := range sc.provider.keys {
		if key.ID == keyID {
			key.TotalSpend = spend
			key.LastSpendCheck = &checkedAt
			break
		}
	}
	sc.provider.mu.Unlock()
}

// maskAPIKey masks an API key for logging/storage
func maskAPIKey(apiKey string) string {
	if len(apiKey) <= 12 {
		return apiKey
	}
	return apiKey[:5] + "..." + apiKey[len(apiKey)-4:]
}

// GetStats returns current spend checker statistics
func (sc *SpendChecker) GetStats() SpendCheckerStats {
	sc.mu.Lock()
	running := sc.running
	sc.mu.Unlock()

	stats := SpendCheckerStats{
		Running:       running,
		Threshold:     sc.threshold,
		CheckInterval: SpendCheckInterval.String(),
	}

	if !running {
		return stats
	}

	// Get key stats
	sc.provider.mu.Lock()
	stats.KeysMonitored = len(sc.provider.keys)
	now := time.Now()

	for _, key := range sc.provider.keys {
		if key.Status != OpenHandsStatusHealthy {
			continue
		}

		keyStat := KeySpendStat{
			KeyID:          key.ID,
			TotalSpend:     key.TotalSpend,
			SpendPercent:   (key.TotalSpend / sc.threshold) * 100,
			SpendTier:      sc.getSpendTierName(key.TotalSpend),
			LastSpendCheck: key.LastSpendCheck,
			LastUsedAt:     key.LastUsedAt,
			IsActive:       key.LastUsedAt != nil && now.Sub(*key.LastUsedAt) < ActiveKeyWindow,
		}
		stats.KeyStats = append(stats.KeyStats, keyStat)
	}
	sc.provider.mu.Unlock()

	return stats
}

// GetSpendChecker returns the global spend checker instance (may be nil)
func GetSpendChecker() *SpendChecker {
	spendCheckerMu.Lock()
	defer spendCheckerMu.Unlock()
	return spendChecker
}

// StartSpendChecker creates and starts the global spend checker
func StartSpendChecker(provider *OpenHandsProvider, threshold float64, activeInterval, idleInterval time.Duration) *SpendChecker {
	spendCheckerMu.Lock()
	defer spendCheckerMu.Unlock()

	if spendChecker != nil {
		spendChecker.Stop()
	}

	spendChecker = NewSpendChecker(provider, threshold, activeInterval, idleInterval)
	spendChecker.Start()

	return spendChecker
}
