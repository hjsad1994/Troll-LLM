package keypool

import "time"

type FactoryKeyStatus string

const (
	StatusHealthy     FactoryKeyStatus = "healthy"
	StatusRateLimited FactoryKeyStatus = "rate_limited"
	StatusExhausted   FactoryKeyStatus = "exhausted"
	StatusError       FactoryKeyStatus = "error"
)

type FactoryKey struct {
	ID            string           `bson:"_id" json:"id"`
	APIKey        string           `bson:"apiKey" json:"api_key"`
	Status        FactoryKeyStatus `bson:"status" json:"status"`
	TokensUsed    int64            `bson:"tokensUsed" json:"tokens_used"`
	RequestsCount int64            `bson:"requestsCount" json:"requests_count"`
	LastError     string           `bson:"lastError,omitempty" json:"last_error,omitempty"`
	CooldownUntil *time.Time       `bson:"cooldownUntil,omitempty" json:"cooldown_until,omitempty"`
	CreatedAt     time.Time        `bson:"createdAt" json:"created_at"`
}

func (f *FactoryKey) IsAvailable() bool {
	if f.Status != StatusHealthy {
		// Check if cooldown expired
		if f.CooldownUntil != nil && time.Now().After(*f.CooldownUntil) {
			return true // Cooldown expired, can retry
		}
		return false
	}
	return true
}
