package usage

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"goproxy/db"
)

type RequestLog struct {
	UserKeyID    string    `bson:"userKeyId"`
	FactoryKeyID string    `bson:"factoryKeyId"`
	TokensUsed   int64     `bson:"tokensUsed"`
	StatusCode   int       `bson:"statusCode"`
	LatencyMs    int64     `bson:"latencyMs"`
	IsSuccess    bool      `bson:"isSuccess"`
	CreatedAt    time.Time `bson:"createdAt"`
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

func LogRequest(userKeyID, factoryKeyID string, tokensUsed int64, statusCode int, latencyMs int64) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Determine if request was successful (2xx status code)
	isSuccess := statusCode >= 200 && statusCode < 300

	logEntry := RequestLog{
		UserKeyID:    userKeyID,
		FactoryKeyID: factoryKeyID,
		TokensUsed:   tokensUsed,
		StatusCode:   statusCode,
		LatencyMs:    latencyMs,
		IsSuccess:    isSuccess,
		CreatedAt:    time.Now(),
	}

	_, err := db.RequestLogsCollection().InsertOne(ctx, logEntry)
	if err != nil {
		log.Printf("⚠️ Failed to log request: %v", err)
	}

	// Update factory key usage
	if factoryKeyID != "" {
		UpdateFactoryKeyUsage(factoryKeyID, tokensUsed)
	}
}

func UpdateFactoryKeyUsage(factoryKeyID string, tokensUsed int64) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{
		"$inc": bson.M{
			"tokensUsed":    tokensUsed,
			"requestsCount": 1,
		},
	}

	_, err := db.FactoryKeysCollection().UpdateByID(ctx, factoryKeyID, update)
	if err != nil {
		log.Printf("⚠️ Failed to update factory key usage for %s: %v", factoryKeyID, err)
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
