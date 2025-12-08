package ohmygpt

import (
	"log"
	"sync"
)

var (
	providers     = make(map[string]Provider)
	providerMutex sync.RWMutex
)

// RegisterProvider registers a provider with the given name
func RegisterProvider(name string, provider Provider) {
	providerMutex.Lock()
	defer providerMutex.Unlock()
	providers[name] = provider
	log.Printf("✅ [TrollProxy] Registered provider: %s", name)
}

// GetProvider returns the provider with the given name, or nil if not found
func GetProvider(name string) Provider {
	providerMutex.RLock()
	defer providerMutex.RUnlock()
	return providers[name]
}

// IsConfigured returns true if the provider is registered and configured
func IsConfigured(name string) bool {
	provider := GetProvider(name)
	if provider == nil {
		return false
	}
	return provider.IsConfigured()
}

// GetAllProviders returns all registered provider names
func GetAllProviders() []string {
	providerMutex.RLock()
	defer providerMutex.RUnlock()
	names := make([]string, 0, len(providers))
	for name := range providers {
		names = append(names, name)
	}
	return names
}
