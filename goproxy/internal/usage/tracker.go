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

func LogRequest(userKeyID, factoryKeyID string, tokensUsed int64, statusCode int) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	logEntry := RequestLog{
		UserKeyID:    userKeyID,
		FactoryKeyID: factoryKeyID,
		TokensUsed:   tokensUsed,
		StatusCode:   statusCode,
		CreatedAt:    time.Now(),
	}

	_, err := db.RequestLogsCollection().InsertOne(ctx, logEntry)
	if err != nil {
		log.Printf("⚠️ Failed to log request: %v", err)
	}
}

func maskKey(key string) string {
	if len(key) < 10 {
		return "***"
	}
	return key[:7] + "***" + key[len(key)-3:]
}
