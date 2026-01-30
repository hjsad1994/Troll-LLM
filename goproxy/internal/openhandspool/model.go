package openhandspool

import "time"

type OpenHandsKeyStatus string

const (
	StatusHealthy     OpenHandsKeyStatus = "healthy"
	StatusRateLimited OpenHandsKeyStatus = "rate_limited"
	StatusExhausted   OpenHandsKeyStatus = "exhausted"
	StatusNeedRefresh OpenHandsKeyStatus = "need_refresh" // Key needs manual refresh on upstream (e.g., token_not_found_in_db)
	StatusError       OpenHandsKeyStatus = "error"
)

type OpenHandsKey struct {
	ID            string             `bson:"_id" json:"id"`
	APIKey        string             `bson:"apiKey" json:"api_key"`
	Status        OpenHandsKeyStatus `bson:"status" json:"status"`
	TokensUsed    int64              `bson:"tokensUsed" json:"tokens_used"`
	RequestsCount int64              `bson:"requestsCount" json:"requests_count"`
	LastError     string             `bson:"lastError,omitempty" json:"last_error,omitempty"`
	CooldownUntil *time.Time         `bson:"cooldownUntil,omitempty" json:"cooldown_until,omitempty"`
	CreatedAt     time.Time          `bson:"createdAt" json:"created_at"`
}

func (k *OpenHandsKey) IsAvailable() bool {
	// Exhausted and NeedRefresh keys should NEVER be auto-retried (require manual action)
	if k.Status == StatusExhausted || k.Status == StatusNeedRefresh {
		return false
	}
	if k.Status != StatusHealthy {
		// Check if cooldown expired (only for rate_limited or error status)
		if k.CooldownUntil != nil && time.Now().After(*k.CooldownUntil) {
			return true // Cooldown expired, can retry
		}
		return false
	}
	return true
}

// BackupKey represents a backup OpenHands key stored in MongoDB
type BackupKey struct {
	ID        string     `bson:"_id" json:"id"`
	APIKey    string     `bson:"apiKey" json:"api_key"`
	IsUsed    bool       `bson:"isUsed" json:"is_used"`
	Activated bool       `bson:"activated" json:"activated"`
	CreatedAt time.Time  `bson:"createdAt" json:"created_at"`
	UsedAt    *time.Time `bson:"usedAt,omitempty" json:"used_at,omitempty"`
	UsedFor   string     `bson:"usedFor,omitempty" json:"used_for,omitempty"` // Which key it replaced
}
