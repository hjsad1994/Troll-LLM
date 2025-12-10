package userkey

import "time"

// Default RPM for all users with credits
const DefaultUserRPM = 300

type UserKey struct {
	ID            string     `bson:"_id" json:"id"`
	Name          string     `bson:"name" json:"name"`
	TokensUsed    int64      `bson:"tokensUsed" json:"tokens_used"`
	RequestsCount int64      `bson:"requestsCount" json:"requests_count"`
	IsActive      bool       `bson:"isActive" json:"is_active"`
	CreatedAt     time.Time  `bson:"createdAt" json:"created_at"`
	LastUsedAt    *time.Time `bson:"lastUsedAt,omitempty" json:"last_used_at,omitempty"`
	Notes         string     `bson:"notes,omitempty" json:"notes,omitempty"`
	ExpiresAt     *time.Time `bson:"expiresAt,omitempty" json:"expires_at,omitempty"`
}

func (u *UserKey) GetRPMLimit() int {
	return DefaultUserRPM
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
