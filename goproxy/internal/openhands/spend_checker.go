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
	OpenHandsActivityURL   = "https://llm-proxy.app.all-hands.dev/user/daily/activity"
	DefaultSpendThreshold  = 9.95
	SpendHistoryCollection = "openhands_key_spend_history"
	ActiveKeyWindow        = 4 * time.Minute

	// Tiered check intervals based on spend amount
	// High spend (>= $7): check very frequently for proactive rotation
	HighSpendThreshold     = 7.0
	HighSpendCheckInterval = 10 * time.Second

	// Medium spend ($5-$7): moderate check frequency
	MediumSpendThreshold     = 5.0
	MediumSpendCheckInterval = 2 * time.Minute

	// Low spend (< $5): infrequent checks
	LowSpendCheckInterval = 5 * time.Minute

	// Legacy defaults (kept for backward compatibility in StartSpendChecker signature)
	DefaultActiveCheckInterval = 10 * time.Second
	DefaultIdleCheckInterval   = 1 * time.Hour
)

// SpendChecker monitors OpenHands key spend and triggers proactive rotation
type SpendChecker struct {
	provider  *OpenHandsProvider
	threshold float64
	// baseCheckInterval is the ticker interval (uses fastest possible: 10s)
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

// SpendHistoryEntry represents a spend check history record
type SpendHistoryEntry struct {
	KeyID          string     `bson:"keyId"`
	APIKeyMasked   string     `bson:"apiKeyMasked"`
	Spend          float64    `bson:"spend"`
	Threshold      float64    `bson:"threshold"`
	CheckedAt      time.Time  `bson:"checkedAt"`
	WasActive      bool       `bson:"wasActive"`
	RotatedAt      *time.Time `bson:"rotatedAt,omitempty"`
	RotationReason string     `bson:"rotationReason,omitempty"`
	NewKeyID       string     `bson:"newKeyId,omitempty"`
}

// SpendCheckerStats represents stats for the endpoint
type SpendCheckerStats struct {
	Running       bool    `json:"running"`
	Threshold     float64 `json:"threshold"`
	KeysMonitored int     `json:"keys_monitored"`
	// Tiered interval info
	TieredIntervals TieredIntervalsInfo `json:"tiered_intervals"`
	KeyStats        []KeySpendStat      `json:"key_stats,omitempty"`
}

// TieredIntervalsInfo describes the spend-based check interval tiers
type TieredIntervalsInfo struct {
	HighSpendThreshold       float64 `json:"high_spend_threshold"`        // >= this = high tier
	HighSpendCheckInterval   string  `json:"high_spend_check_interval"`   // interval for high tier
	MediumSpendThreshold     float64 `json:"medium_spend_threshold"`      // >= this = medium tier
	MediumSpendCheckInterval string  `json:"medium_spend_check_interval"` // interval for medium tier
	LowSpendCheckInterval    string  `json:"low_spend_check_interval"`    // interval for low tier (< medium threshold)
}

// KeySpendStat represents spend stats for a single key
type KeySpendStat struct {
	KeyID          string     `json:"key_id"`
	TotalSpend     float64    `json:"total_spend"`
	SpendPercent   float64    `json:"spend_percent"`
	SpendTier      string     `json:"spend_tier"`     // LOW, MEDIUM, HIGH
	CheckInterval  string     `json:"check_interval"` // Current check interval for this key
	LastSpendCheck *time.Time `json:"last_spend_check,omitempty"`
	LastUsedAt     *time.Time `json:"last_used_at,omitempty"`
	IsActive       bool       `json:"is_active"`
}

// Global instance
var spendChecker *SpendChecker
var spendCheckerMu sync.Mutex

// NewSpendChecker creates a new SpendChecker instance
// Note: activeInterval and idleInterval are ignored - using tiered spend-based intervals instead
func NewSpendChecker(provider *OpenHandsProvider, threshold float64, activeInterval, idleInterval time.Duration) *SpendChecker {
	return &SpendChecker{
		provider:          provider,
		threshold:         threshold,
		baseCheckInterval: HighSpendCheckInterval, // Use fastest interval as base ticker
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

	log.Printf("💰 [OpenHands/SpendChecker] Started (threshold: $%.2f, tiered intervals: <$5=%v, $5-$7=%v, >=$7=%v)",
		sc.threshold, LowSpendCheckInterval, MediumSpendCheckInterval, HighSpendCheckInterval)

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
				log.Printf("💰 [OpenHands/SpendChecker] Stopped")
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

// checkAllKeys checks spend for all healthy keys
func (sc *SpendChecker) checkAllKeys() {
	sc.provider.mu.Lock()
	keys := make([]*OpenHandsKey, len(sc.provider.keys))
	copy(keys, sc.provider.keys)
	sc.provider.mu.Unlock()

	now := time.Now()

	for _, key := range keys {
		if key.Status != OpenHandsStatusHealthy {
			continue
		}

		isActive := sc.isKeyActive(key, now)

		// Check if we should check this key based on intervals
		if !sc.shouldCheckKey(key, isActive, now) {
			continue
		}

		// Check spend for this key
		result := sc.checkKeySpend(key, isActive)

		// Handle budget_exceeded - rotate immediately
		if result.BudgetExceeded {
			log.Printf("🔄 [OpenHands/SpendChecker] Immediate rotation triggered for key %s (budget exceeded, spend: $%.2f)",
				key.ID, result.Spend)

			reason := fmt.Sprintf("budget_exceeded_%.2f", result.Spend)
			newKeyID, err := sc.provider.RotateKey(key.ID, reason)

			rotatedAt := time.Now()
			if err != nil {
				log.Printf("❌ [OpenHands/SpendChecker] Rotation failed for key %s: %v", key.ID, err)
				sc.saveSpendHistory(result, nil, reason, "")
			} else {
				log.Printf("✅ [OpenHands/SpendChecker] Rotated: %s -> %s", key.ID, newKeyID)
				sc.saveSpendHistory(result, &rotatedAt, reason, newKeyID)
			}
			continue
		}

		if result.Error != nil {
			log.Printf("⚠️ [OpenHands/SpendChecker] Failed to check key %s: %v", key.ID, result.Error)
			continue
		}

		// Update key spend info in DB and memory
		sc.updateKeySpendInfo(key.ID, result.Spend, result.CheckedAt)

		// Calculate percentage
		percentage := (result.Spend / sc.threshold) * 100

		// Log the result
		activeStr := "IDLE"
		if isActive {
			activeStr = "ACTIVE"
		}
		log.Printf("💰 [OpenHands/SpendChecker] Key %s %s: $%.2f / $%.2f (%.1f%%)",
			key.ID, activeStr, result.Spend, sc.threshold, percentage)

		// Check if we need to rotate
		if result.Spend >= sc.threshold {
			log.Printf("🔄 [OpenHands/SpendChecker] Proactive rotation triggered for key %s (spend: $%.2f >= threshold: $%.2f)",
				key.ID, result.Spend, sc.threshold)

			reason := fmt.Sprintf("proactive_threshold_%.2f", result.Spend)
			newKeyID, err := sc.provider.RotateKey(key.ID, reason)

			rotatedAt := time.Now()
			if err != nil {
				log.Printf("❌ [OpenHands/SpendChecker] Rotation failed for key %s: %v", key.ID, err)
				sc.saveSpendHistory(result, nil, reason, "")
			} else {
				log.Printf("✅ [OpenHands/SpendChecker] Rotated: %s -> %s", key.ID, newKeyID)
				sc.saveSpendHistory(result, &rotatedAt, reason, newKeyID)
			}
		} else {
			// Save history without rotation
			sc.saveSpendHistory(result, nil, "", "")
		}
	}
}

// isKeyActive returns true if the key was used within ActiveKeyWindow
func (sc *SpendChecker) isKeyActive(key *OpenHandsKey, now time.Time) bool {
	if key.LastUsedAt == nil {
		return false
	}
	return now.Sub(*key.LastUsedAt) < ActiveKeyWindow
}

// getCheckIntervalForSpend returns the appropriate check interval based on current spend
// - Spend >= $7: check every 10 seconds (approaching limit, need frequent checks)
// - Spend $5-$7: check every 2 minutes (moderate spend, moderate checks)
// - Spend < $5: check every 5 minutes (low spend, infrequent checks)
func (sc *SpendChecker) getCheckIntervalForSpend(spend float64) time.Duration {
	if spend >= HighSpendThreshold {
		return HighSpendCheckInterval // 10s
	}
	if spend >= MediumSpendThreshold {
		return MediumSpendCheckInterval // 2m
	}
	return LowSpendCheckInterval // 5m
}

// getSpendTierName returns a human-readable tier name for logging
func (sc *SpendChecker) getSpendTierName(spend float64) string {
	if spend >= HighSpendThreshold {
		return "HIGH"
	}
	if spend >= MediumSpendThreshold {
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
	req.Header.Set("x-litellm-api-key", key.APIKey)
	req.Header.Set("Accept", "application/json")

	// Get client with proxy but WITHOUT selecting a new key
	client, proxyName := sc.provider.GetClientWithProxyOnly()

	if proxyName != "" {
		log.Printf("💰 [OpenHands/SpendChecker] Checking key %s via proxy %s", key.ID, proxyName)
	}

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

		// Check if this is a budget_exceeded error - key needs rotation immediately
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
			// If we couldn't parse spend, set it to threshold to trigger rotation
			if result.Spend == 0 {
				result.Spend = sc.threshold
			}
			log.Printf("🚨 [OpenHands/SpendChecker] Key %s BUDGET EXCEEDED: %s", key.ID, bodyStr)
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
	if err != nil {
		log.Printf("⚠️ [OpenHands/SpendChecker] Failed to update key %s in DB: %v", keyID, err)
	}

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

// saveSpendHistory saves a spend check result to the history collection
func (sc *SpendChecker) saveSpendHistory(result SpendCheckResult, rotatedAt *time.Time, reason string, newKeyID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	entry := SpendHistoryEntry{
		KeyID:          result.KeyID,
		APIKeyMasked:   maskAPIKey(result.APIKey),
		Spend:          result.Spend,
		Threshold:      result.Threshold,
		CheckedAt:      result.CheckedAt,
		WasActive:      result.WasActive,
		RotatedAt:      rotatedAt,
		RotationReason: reason,
		NewKeyID:       newKeyID,
	}

	col := db.GetCollection(SpendHistoryCollection)
	if col == nil {
		log.Printf("⚠️ [OpenHands/SpendChecker] History collection not available")
		return
	}

	_, err := col.InsertOne(ctx, entry)
	if err != nil {
		log.Printf("⚠️ [OpenHands/SpendChecker] Failed to save history: %v", err)
	}
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
		Running:   running,
		Threshold: sc.threshold,
		TieredIntervals: TieredIntervalsInfo{
			HighSpendThreshold:       HighSpendThreshold,
			HighSpendCheckInterval:   HighSpendCheckInterval.String(),
			MediumSpendThreshold:     MediumSpendThreshold,
			MediumSpendCheckInterval: MediumSpendCheckInterval.String(),
			LowSpendCheckInterval:    LowSpendCheckInterval.String(),
		},
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
			CheckInterval:  sc.getCheckIntervalForSpend(key.TotalSpend).String(),
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
