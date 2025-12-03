package config

import (
	"log"
	"os"
	"strings"
)

// OptimizationConfig holds flags for enabling/disabling optimizations
type OptimizationConfig struct {
	UseOptimizedRateLimiter bool
	UseOptimizedProxyPool   bool
	UseOptimizedKeyPool     bool
	UseBatchedWrites        bool
}

// DefaultOptimizationConfig returns default config (all optimizations ON)
func DefaultOptimizationConfig() OptimizationConfig {
	return OptimizationConfig{
		UseOptimizedRateLimiter: true,
		UseOptimizedProxyPool:   true,
		UseOptimizedKeyPool:     true,
		UseBatchedWrites:        true,
	}
}

// DisabledOptimizationConfig returns config with all optimizations OFF
func DisabledOptimizationConfig() OptimizationConfig {
	return OptimizationConfig{
		UseOptimizedRateLimiter: false,
		UseOptimizedProxyPool:   false,
		UseOptimizedKeyPool:     false,
		UseBatchedWrites:        false,
	}
}

// LoadOptimizationConfigFromEnv loads config from environment variables
// Set GOPROXY_DISABLE_OPTIMIZATIONS=true to disable ALL
// Or set individual flags:
//   GOPROXY_DISABLE_RATE_LIMITER_OPT=true
//   GOPROXY_DISABLE_PROXY_POOL_OPT=true
//   GOPROXY_DISABLE_KEY_POOL_OPT=true
//   GOPROXY_DISABLE_BATCHED_WRITES=true
func LoadOptimizationConfigFromEnv() OptimizationConfig {
	config := DefaultOptimizationConfig()

	// Check for global disable
	if IsEnvTrue("GOPROXY_DISABLE_OPTIMIZATIONS") {
		log.Printf("⚠️ All optimizations DISABLED via GOPROXY_DISABLE_OPTIMIZATIONS")
		return DisabledOptimizationConfig()
	}

	// Check individual flags
	if IsEnvTrue("GOPROXY_DISABLE_RATE_LIMITER_OPT") {
		config.UseOptimizedRateLimiter = false
		log.Printf("⚠️ Optimized rate limiter DISABLED")
	}

	if IsEnvTrue("GOPROXY_DISABLE_PROXY_POOL_OPT") {
		config.UseOptimizedProxyPool = false
		log.Printf("⚠️ Optimized proxy pool DISABLED")
	}

	if IsEnvTrue("GOPROXY_DISABLE_KEY_POOL_OPT") {
		config.UseOptimizedKeyPool = false
		log.Printf("⚠️ Optimized key pool DISABLED")
	}

	if IsEnvTrue("GOPROXY_DISABLE_BATCHED_WRITES") {
		config.UseBatchedWrites = false
		log.Printf("⚠️ Batched DB writes DISABLED")
	}

	return config
}

// IsEnvTrue checks if an environment variable is set to true
func IsEnvTrue(key string) bool {
	val := strings.ToLower(os.Getenv(key))
	return val == "true" || val == "1" || val == "yes"
}

// Global optimization config - loaded at startup
var OptConfig = LoadOptimizationConfigFromEnv()

// ApplyOptimizationConfig applies the config to all optimization flags
// Call this in main() after loading env
func ApplyOptimizationConfig() {
	log.Printf("🔧 Optimization config: RateLimiter=%v, ProxyPool=%v, KeyPool=%v, BatchedWrites=%v",
		OptConfig.UseOptimizedRateLimiter,
		OptConfig.UseOptimizedProxyPool,
		OptConfig.UseOptimizedKeyPool,
		OptConfig.UseBatchedWrites)
}
