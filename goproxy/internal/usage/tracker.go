package usage

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"goproxy/db"
)

type RequestLog struct {
	UserID           string    `bson:"userId,omitempty"`
	UserKeyID        string    `bson:"userKeyId"`
	TrollKeyID       string    `bson:"trollKeyId"`
	Model            string    `bson:"model,omitempty"`
	InputTokens      int64     `bson:"inputTokens"`
	OutputTokens     int64     `bson:"outputTokens"`
	CacheWriteTokens int64     `bson:"cacheWriteTokens"`
	CacheHitTokens   int64     `bson:"cacheHitTokens"`
	CreditsCost      float64   `bson:"creditsCost"`
	TokensUsed       int64     `bson:"tokensUsed"`
	StatusCode       int       `bson:"statusCode"`
	LatencyMs        int64     `bson:"latencyMs"`
	IsSuccess        bool      `bson:"isSuccess"`
	CreatedAt        time.Time `bson:"createdAt"`
}

type RequestLogParams struct {
	UserID           string
	UserKeyID        string
	TrollKeyID       string
	Model            string
	InputTokens      int64
	OutputTokens     int64
	CacheWriteTokens int64
	CacheHitTokens   int64
	CreditsCost      float64
	TokensUsed       int64
	StatusCode       int
	LatencyMs        int64
}

func UpdateUsage(apiKey string, tokensUsed int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now()
	update := bson.M{
		"$inc": bson.M{
			"tokensUsed":    tokensUsed,
			"requestsCount": 1,
		},
		"$set": bson.M{
			"lastUsedAt": now,
		},
	}

	_, err := db.UserKeysCollection().UpdateByID(ctx, apiKey, update)
	if err != nil {
		log.Printf("❌ Failed to update usage for key %s: %v", maskKey(apiKey), err)
		return err
	}

	return nil
}

func LogRequest(userKeyID, trollKeyID string, tokensUsed int64, statusCode int, latencyMs int64) {
	LogRequestDetailed(RequestLogParams{
		UserKeyID:  userKeyID,
		TrollKeyID: trollKeyID,
		TokensUsed: tokensUsed,
		StatusCode: statusCode,
		LatencyMs:  latencyMs,
	})
}

func LogRequestDetailed(params RequestLogParams) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Determine if request was successful (2xx status code)
	isSuccess := params.StatusCode >= 200 && params.StatusCode < 300

	logEntry := RequestLog{
		UserID:           params.UserID,
		UserKeyID:        params.UserKeyID,
		TrollKeyID:       params.TrollKeyID,
		Model:            params.Model,
		InputTokens:      params.InputTokens,
		OutputTokens:     params.OutputTokens,
		CacheWriteTokens: params.CacheWriteTokens,
		CacheHitTokens:   params.CacheHitTokens,
		CreditsCost:      params.CreditsCost,
		TokensUsed:       params.TokensUsed,
		StatusCode:       params.StatusCode,
		LatencyMs:        params.LatencyMs,
		IsSuccess:        isSuccess,
		CreatedAt:        time.Now(),
	}

	_, err := db.RequestLogsCollection().InsertOne(ctx, logEntry)
	if err != nil {
		log.Printf("⚠️ Failed to log request: %v", err)
	}

	// Update troll key usage
	if params.TrollKeyID != "" {
		UpdateTrollKeyUsage(params.TrollKeyID, params.TokensUsed)
	}
}

func UpdateTrollKeyUsage(trollKeyID string, tokensUsed int64) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{
		"$inc": bson.M{
			"tokensUsed":    tokensUsed,
			"requestsCount": 1,
		},
	}

	_, err := db.TrollKeysCollection().UpdateByID(ctx, trollKeyID, update)
	if err != nil {
		log.Printf("⚠️ Failed to update troll key usage for %s: %v", trollKeyID, err)
	}
}

// DeductCredits deducts credits (USD) from user's balance and updates tokensUsed
func DeductCredits(username string, cost float64, tokensUsed int64) error {
	if username == "" {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{
		"$inc": bson.M{
			"credits":    -cost,
			"tokensUsed": tokensUsed,
		},
	}

	_, err := db.UsersCollection().UpdateByID(ctx, username, update)
	if err != nil {
		log.Printf("❌ Failed to update user %s: %v", username, err)
		return err
	}

	return nil
}

func maskKey(key string) string {
	if len(key) < 10 {
		return "***"
	}
	return key[:7] + "***" + key[len(key)-3:]
}
