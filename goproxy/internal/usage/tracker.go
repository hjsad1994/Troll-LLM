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
	// Use batched writes if enabled
	if UseBatchedWrites {
		GetBatcher().QueueUsageUpdate(apiKey, tokensUsed)
		return nil
	}

	// Fallback to synchronous write
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

	// Use batched writes if enabled
	if UseBatchedWrites {
		GetBatcher().QueueRequestLog(logEntry)
		// Update troll key usage (also async)
		if params.TrollKeyID != "" {
			go UpdateTrollKeyUsage(params.TrollKeyID, params.TokensUsed)
		}
		return
	}

	// Fallback to synchronous write
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	log.Printf("📝 [RequestLog] Saving: userId=%s, model=%s, input=%d, output=%d", 
		params.UserID, params.Model, params.InputTokens, params.OutputTokens)

	result, err := db.RequestLogsCollection().InsertOne(ctx, logEntry)
	if err != nil {
		log.Printf("⚠️ Failed to log request: %v", err)
	} else {
		log.Printf("✅ [RequestLog] Created new entry: _id=%v, userId=%s", result.InsertedID, params.UserID)
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
	return DeductCreditsWithTokens(username, cost, tokensUsed, 0, 0)
}

// DeductCreditsWithRefCheck deducts credits with refCredits support
// useRefCredits should be true if the user's main credits are exhausted
func DeductCreditsWithRefCheck(username string, cost float64, tokensUsed, inputTokens, outputTokens int64, useRefCredits bool) error {
	if username == "" {
		return nil
	}

	actualTokensUsed := inputTokens + outputTokens
	if actualTokensUsed == 0 {
		actualTokensUsed = tokensUsed
	}

	// Use batched writes if enabled
	if UseBatchedWrites {
		GetBatcher().QueueCreditUpdateWithRef(username, cost, actualTokensUsed, inputTokens, outputTokens, useRefCredits)
		if useRefCredits {
			log.Printf("💰 [%s] Deducted $%.6f from refCredits (in=%d, out=%d)", username, cost, inputTokens, outputTokens)
		} else {
			log.Printf("💰 [%s] Deducted $%.6f from credits (in=%d, out=%d)", username, cost, inputTokens, outputTokens)
		}
		return nil
	}

	// For non-batched mode, fall back to the existing function
	return DeductCreditsWithTokens(username, cost, tokensUsed, inputTokens, outputTokens)
}

// DeductCreditsWithTokens deducts credits and updates token counts (total, input, output)
// Deducts from main credits first, then from refCredits if main credits are insufficient
func DeductCreditsWithTokens(username string, cost float64, tokensUsed, inputTokens, outputTokens int64) error {
	if username == "" {
		return nil
	}

	// tokensUsed should be the sum of input + output tokens
	actualTokensUsed := inputTokens + outputTokens
	if actualTokensUsed == 0 {
		actualTokensUsed = tokensUsed // fallback to billing tokens if no input/output provided
	}

	// Use batched writes if enabled
	if UseBatchedWrites {
		GetBatcher().QueueCreditUpdate(username, cost, actualTokensUsed, inputTokens, outputTokens)
		log.Printf("💰 [%s] Deducted $%.6f (in=%d, out=%d)", username, cost, inputTokens, outputTokens)
		return nil
	}

	// Fallback to synchronous write with refCredits support
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// First, get current credits to determine where to deduct from
	var user struct {
		Credits    float64 `bson:"credits"`
		RefCredits float64 `bson:"refCredits"`
	}
	err := db.UsersCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
	if err != nil {
		log.Printf("❌ Failed to get user %s credits: %v", username, err)
		return err
	}

	incFields := bson.M{
		"tokensUsed": actualTokensUsed,
	}
	
	if inputTokens > 0 {
		incFields["totalInputTokens"] = inputTokens
	}
	if outputTokens > 0 {
		incFields["totalOutputTokens"] = outputTokens
	}

	// Determine where to deduct credits from
	if user.Credits >= cost {
		// Deduct from main credits
		incFields["credits"] = -cost
		log.Printf("💰 [%s] Deducted $%.6f from credits (in=%d, out=%d)", username, cost, inputTokens, outputTokens)
	} else if user.Credits > 0 {
		// Partial deduct: use remaining main credits, then refCredits
		refCost := cost - user.Credits
		incFields["credits"] = -user.Credits
		incFields["refCredits"] = -refCost
		log.Printf("💰 [%s] Deducted $%.6f from credits + $%.6f from refCredits (in=%d, out=%d)", username, user.Credits, refCost, inputTokens, outputTokens)
	} else {
		// Deduct from refCredits only
		incFields["refCredits"] = -cost
		log.Printf("💰 [%s] Deducted $%.6f from refCredits (in=%d, out=%d)", username, cost, inputTokens, outputTokens)
	}

	update := bson.M{
		"$inc": incFields,
	}

	_, err = db.UsersCollection().UpdateByID(ctx, username, update)
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
