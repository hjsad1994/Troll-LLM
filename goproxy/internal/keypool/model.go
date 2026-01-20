package keypool

import "time"

type TrollKeyStatus string

const (
	StatusHealthy     TrollKeyStatus = "healthy"
	StatusRateLimited TrollKeyStatus = "rate_limited"
	StatusExhausted   TrollKeyStatus = "exhausted"
	StatusError       TrollKeyStatus = "error"
)

type TrollKey struct {
	ID            string         `bson:"_id" json:"id"`
	APIKey        string         `bson:"apiKey" json:"api_key"`
	Status        TrollKeyStatus `bson:"status" json:"status"`
	TokensUsed    int64          `bson:"tokensUsed" json:"tokens_used"`
	RequestsCount int64          `bson:"requestsCount" json:"requests_count"`
	LastError     string         `bson:"lastError,omitempty" json:"last_error,omitempty"`
	CooldownUntil *time.Time     `bson:"cooldownUntil,omitempty" json:"cooldown_until,omitempty"`
	CreatedAt     time.Time      `bson:"createdAt" json:"created_at"`
}

func (f *TrollKey) IsAvailable() bool {
	// Exhausted keys should NEVER be auto-retried (require manual re-enable or backup rotation)
	if f.Status == StatusExhausted {
		return false
	}
	if f.Status != StatusHealthy {
		// Check if cooldown expired (only for rate_limited or error status)
		if f.CooldownUntil != nil && time.Now().After(*f.CooldownUntil) {
			return true // Cooldown expired, can retry
		}
		return false
	}
	return true
}
