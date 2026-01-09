package cache

import (
	"log"
	"os"
	"strconv"
	"sync"
	"time"
)

// FailoverState represents the failover state for a model
type FailoverState struct {
	IsActive      bool
	FailoverUntil time.Time
	LastTriggered time.Time
	TriggerCount  int
}

// FailoverStateManager manages per-model failover state
type FailoverStateManager struct {
	states       map[string]*FailoverState
	mu           sync.RWMutex
	enabled      bool
	lossThreshold float64
	cooldown      time.Duration
}

var failoverManagerInstance *FailoverStateManager
var failoverOnce sync.Once

// GetFailoverManager returns the singleton failover manager instance
func GetFailoverManager() *FailoverStateManager {
	if failoverManagerInstance == nil {
		failoverOnce.Do(func() {
			// Get configuration from environment
			enabledStr := os.Getenv("CACHE_FAILOVER_ENABLED")
			enabled := enabledStr == "true"

			// Debug log
			log.Printf("🔍 [Failover Manager] Init: CACHE_FAILOVER_ENABLED=%s (parsed as %v)", enabledStr, enabled)

			thresholdStr := os.Getenv("CACHE_FAILOVER_LOSS_THRESHOLD")
			threshold := 1.50 // default
			if thresholdStr != "" {
				if t, err := strconv.ParseFloat(thresholdStr, 64); err == nil {
					threshold = t
				}
			}

			cooldownStr := os.Getenv("CACHE_FAILOVER_COOLDOWN_MINUTES")
			cooldown := 15 // default 15 minutes
			if cooldownStr != "" {
				if c, err := strconv.Atoi(cooldownStr); err == nil {
					cooldown = c
				}
			}

			log.Printf("🔍 [Failover Manager] Config: threshold=$%.2f, cooldown=%d minutes", threshold, cooldown)

			failoverManagerInstance = &FailoverStateManager{
				states:         make(map[string]*FailoverState),
				enabled:        enabled,
				lossThreshold:  threshold,
				cooldown:       time.Duration(cooldown) * time.Minute,
			}

			if enabled {
				log.Printf("✅ [Failover Manager] Enabled: threshold=$%.2f, cooldown=%d minutes", threshold, cooldown)
			} else {
				log.Printf("🔕 [Failover Manager] Disabled (CACHE_FAILOVER_ENABLED not set to 'true')")
			}
		})
	}
	return failoverManagerInstance
}

// IsEnabled returns true if failover is enabled
func (m *FailoverStateManager) IsEnabled() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.enabled
}

// ShouldTriggerFailover checks if a cache fallback event should trigger failover
func (m *FailoverStateManager) ShouldTriggerFailover(model string, inputTokens, cacheRead, cacheWrite int64, estimatedLoss float64) bool {
	if !m.IsEnabled() {
		return false
	}

	m.mu.RLock()
	threshold := m.lossThreshold
	m.mu.RUnlock()

	// Check conditions:
	// 1. Cache not detected (both cache_read and cache_creation are 0)
	// 2. Estimated loss exceeds threshold
	cacheMiss := (cacheRead == 0 && cacheWrite == 0)
	lossExceedsThreshold := estimatedLoss > threshold

	if cacheMiss && lossExceedsThreshold {
		log.Printf("⚠️ [Failover Manager] Trigger conditions met for %s: cache_miss=%v, loss=$%.2f (threshold=$%.2f)",
			model, cacheMiss, estimatedLoss, threshold)
		return true
	}

	return false
}

// ActivateFailover activates failover for a model
func (m *FailoverStateManager) ActivateFailover(model string) {
	if !m.IsEnabled() {
		return
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	failoverUntil := now.Add(m.cooldown)

	state, exists := m.states[model]
	if !exists {
		state = &FailoverState{}
		m.states[model] = state
	}

	state.IsActive = true
	state.FailoverUntil = failoverUntil
	state.LastTriggered = now
	state.TriggerCount++

	log.Printf("🔄 [Failover Manager] Activated for %s (until %s, trigger #%d)",
		model, failoverUntil.Format(time.RFC3339), state.TriggerCount)
}

// IsInFailover returns true if a model is currently in failover state
func (m *FailoverStateManager) IsInFailover(model string) bool {
	if !m.IsEnabled() {
		return false
	}

	m.mu.RLock()
	state, exists := m.states[model]
	if !exists {
		m.mu.RUnlock()
		return false
	}

	inFailover := state.IsActive && time.Now().Before(state.FailoverUntil)
	m.mu.RUnlock()

	// If failover has expired, clear it
	if !inFailover && state.IsActive {
		m.mu.Lock()
		state.IsActive = false
		m.mu.Unlock()
		log.Printf("✅ [Failover Manager] Auto-recovered for %s (cooldown expired)", model)
	}

	return inFailover
}

// GetFailoverUntil returns the failover expiration time for a model
func (m *FailoverStateManager) GetFailoverUntil(model string) time.Time {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if state, exists := m.states[model]; exists {
		return state.FailoverUntil
	}
	return time.Time{}
}

// ClearFailover manually clears failover state for a model
func (m *FailoverStateManager) ClearFailover(model string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if state, exists := m.states[model]; exists {
		state.IsActive = false
		log.Printf("✅ [Failover Manager] Manually cleared for %s", model)
	}
}

// GetState returns the current failover state for a model
func (m *FailoverStateManager) GetState(model string) *FailoverState {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if state, exists := m.states[model]; exists {
		// Return a copy to avoid race conditions
		return &FailoverState{
			IsActive:      state.IsActive,
			FailoverUntil: state.FailoverUntil,
			LastTriggered: state.LastTriggered,
			TriggerCount:  state.TriggerCount,
		}
	}
	return nil
}

// GetAllStates returns all failover states
func (m *FailoverStateManager) GetAllStates() map[string]*FailoverState {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make(map[string]*FailoverState)
	for model, state := range m.states {
		result[model] = &FailoverState{
			IsActive:      state.IsActive,
			FailoverUntil: state.FailoverUntil,
			LastTriggered: state.LastTriggered,
			TriggerCount:  state.TriggerCount,
		}
	}
	return result
}
