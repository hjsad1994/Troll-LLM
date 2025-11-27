package userkey

import "time"

type UserKey struct {
	ID            string     `bson:"_id" json:"id"`
	Name          string     `bson:"name" json:"name"`
	Tier          string     `bson:"tier" json:"tier"`
	TotalTokens   int64      `bson:"totalTokens" json:"total_tokens"`
	TokensUsed    int64      `bson:"tokensUsed" json:"tokens_used"`
	RequestsCount int64      `bson:"requestsCount" json:"requests_count"`
	IsActive      bool       `bson:"isActive" json:"is_active"`
	CreatedAt     time.Time  `bson:"createdAt" json:"created_at"`
	LastUsedAt    *time.Time `bson:"lastUsedAt,omitempty" json:"last_used_at,omitempty"`
	Notes         string     `bson:"notes,omitempty" json:"notes,omitempty"`
}

func (u *UserKey) TokensRemaining() int64 {
	remaining := u.TotalTokens - u.TokensUsed
	if remaining < 0 {
		return 0
	}
	return remaining
}

func (u *UserKey) UsagePercent() float64 {
	if u.TotalTokens == 0 {
		return 0
	}
	return float64(u.TokensUsed) / float64(u.TotalTokens) * 100
}

func (u *UserKey) IsExhausted() bool {
	return u.TokensUsed >= u.TotalTokens
}

func (u *UserKey) GetRPMLimit() int {
	switch u.Tier {
	case "pro":
		return 1000
	case "dev":
		return 600
	default:
		return 600
	}
}
