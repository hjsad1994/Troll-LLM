package userkey

import (
	"strings"
	"time"
)

// KeyType represents the type of API key
type KeyType int

const (
	// KeyTypeUnknown indicates an unrecognized key format
	KeyTypeUnknown KeyType = iota
	// KeyTypeUser indicates a user key (sk-troll-* or sk-trollllm-* excluding friend keys)
	KeyTypeUser
	// KeyTypeFriend indicates a friend key (sk-trollllm-friend-*)
	KeyTypeFriend
)

// String returns the string representation of KeyType
func (k KeyType) String() string {
	switch k {
	case KeyTypeUser:
		return "user"
	case KeyTypeFriend:
		return "friend"
	default:
		return "unknown"
	}
}

// GetKeyType determines the key type from API key prefix
// Performance: < 1ms (string prefix check only, no database lookup)
func GetKeyType(apiKey string) KeyType {
	// Friend key check must come first (more specific prefix)
	if strings.HasPrefix(apiKey, "sk-trollllm-friend-") {
		return KeyTypeFriend
	}
	// User key check (sk-troll-* or sk-trollllm-*)
	if strings.HasPrefix(apiKey, "sk-troll") {
		return KeyTypeUser
	}
	return KeyTypeUnknown
}

type UserKey struct {
	ID            string     `bson:"_id" json:"id"`
	Name          string     `bson:"name" json:"name"`
	TokensUsed    float64    `bson:"tokensUsed" json:"tokens_used"`
	RequestsCount float64    `bson:"requestsCount" json:"requests_count"`
	IsActive      bool       `bson:"isActive" json:"is_active"`
	CreatedAt     time.Time  `bson:"createdAt" json:"created_at"`
	LastUsedAt    *time.Time `bson:"lastUsedAt,omitempty" json:"last_used_at,omitempty"`
	Notes         string     `bson:"notes,omitempty" json:"notes,omitempty"`
	ExpiresAt     *time.Time `bson:"expiresAt,omitempty" json:"expires_at,omitempty"`
}

func (u *UserKey) GetRPMLimit() int {
	return 300 // Default RPM, use ratelimit.GetRPMForAPIKey() for key-type-specific limits
}

func (u *UserKey) IsExpired() bool {
	if u.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*u.ExpiresAt)
}

// LegacyUser represents a user from the legacy "users" collection
// Used as fallback when API key is not found in user_keys
type LegacyUser struct {
	ID         string     `bson:"_id" json:"id"`                                    // username
	APIKey     string     `bson:"apiKey" json:"api_key"`                            // sk-trollllm-* format
	IsActive   bool       `bson:"isActive" json:"is_active"`                        // account status
	Credits    float64    `bson:"credits" json:"credits"`                           // USD credits
	RefCredits float64    `bson:"refCredits" json:"ref_credits"`                    // referral credits USD
	ExpiresAt  *time.Time `bson:"expiresAt,omitempty" json:"expires_at,omitempty"`  // credit expiry
}
