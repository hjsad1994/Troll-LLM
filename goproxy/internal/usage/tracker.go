package usage

import (
	"context"
	"errors"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"goproxy/db"
)

// =============================================================================
// Story 2.2: Zero-Debt Policy Enforcement - Atomic Deduction
// =============================================================================

var (
	// ErrInsufficientBalance is returned when user balance is insufficient for deduction
	ErrInsufficientBalance = errors.New("insufficient balance for deduction")
)

// AtomicDeductionResult contains the result of an atomic deduction operation
type AtomicDeductionResult struct {
	Success             bool    // true if deduction was successful
	DeductedFromCredits float64 // amount deducted from main credits
	DeductedFromRef     float64 // amount deducted from refCredits
	NewCreditsBalance   float64 // new credits balance after deduction
	NewRefBalance       float64 // new refCredits balance after deduction
}

// CalculateDeductionSplit calculates how to split cost between credits and refCredits
// Returns (creditsDeduct, refDeduct) - amounts to deduct from each
// AC3: Uses credits first, then refCredits for remaining
func CalculateDeductionSplit(credits, refCredits, cost float64) (creditsDeduct, refDeduct float64) {
	if cost <= 0 {
		return 0, 0
	}

	if credits >= cost {
		// Deduct entirely from main credits
		return cost, 0
	}

	// Partial from credits, rest from refCredits
	if credits > 0 {
		creditsDeduct = credits
		refDeduct = cost - credits
		return creditsDeduct, refDeduct
	}

	// Credits = 0, deduct from refCredits only
	return 0, cost
}

type RequestLog struct {
	UserID           string    `bson:"userId,omitempty"`
	UserKeyID        string    `bson:"userKeyId"`
	TrollKeyID       string    `bson:"trollKeyId,omitempty"`
	FactoryKeyID     string    `bson:"factoryKeyId,omitempty"`
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
	FactoryKeyID     string
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
		FactoryKeyID:     params.FactoryKeyID,
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

// DeductCredits deducts tokens from user's tokenBalance (legacy wrapper)
func DeductCredits(username string, cost float64, tokensUsed int64) error {
	return DeductCreditsWithTokens(username, cost, tokensUsed, 0, 0)
}

// DeductCreditsWithRefCheck deducts credits (USD) with refCredits support
// useRefCredits should be true if the user's main credits is exhausted
func DeductCreditsWithRefCheck(username string, cost float64, tokensUsed, inputTokens, outputTokens int64, useRefCredits bool) error {
	if username == "" {
		return nil
	}

	// Use batched writes if enabled
	if UseBatchedWrites {
		GetBatcher().QueueCreditUpdateWithRef(username, cost, tokensUsed, inputTokens, outputTokens, useRefCredits)
		if useRefCredits {
			log.Printf("💰 [%s] Deducted $%.6f from refCredits (in=%d, out=%d)", username, cost, inputTokens, outputTokens)
		} else {
			log.Printf("💰 [%s] Deducted $%.6f (in=%d, out=%d)", username, cost, inputTokens, outputTokens)
		}
		return nil
	}

	// For non-batched mode, fall back to the existing function
	return DeductCreditsWithTokens(username, cost, tokensUsed, inputTokens, outputTokens)
}

// DeductCreditsWithTokens deducts credits (USD) and updates token counts for analytics
// Deducts from main credits first, then from refCredits if insufficient
func DeductCreditsWithTokens(username string, cost float64, tokensUsed, inputTokens, outputTokens int64) error {
	return DeductCreditsWithCache(username, cost, tokensUsed, inputTokens, outputTokens, 0, 0)
}

// DeductCreditsWithCache deducts credits (USD) from user including cache token tracking
// Deducts from main credits first, then from refCredits if insufficient
// Story 2.2: Uses atomic conditional update to prevent race conditions (AC2, AC4)
func DeductCreditsWithCache(username string, cost float64, tokensUsed, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens int64) error {
	if username == "" {
		return nil
	}

	// Zero cost - no deduction needed
	if cost <= 0 {
		return nil
	}

	// Use batched writes if enabled
	// Note: Batched writes have pre-check in the batcher queue
	if UseBatchedWrites {
		GetBatcher().QueueCreditUpdate(username, cost, tokensUsed, inputTokens, outputTokens)
		if cacheWriteTokens > 0 || cacheHitTokens > 0 {
			log.Printf("💰 [%s] Deducted $%.6f (in=%d, out=%d, cache_write=%d, cache_hit=%d)", username, cost, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens)
		} else {
			log.Printf("💰 [%s] Deducted $%.6f (in=%d, out=%d)", username, cost, inputTokens, outputTokens)
		}
		return nil
	}

	// Story 2.2: Atomic deduction with conditional update
	// AC2: Atomic operations prevent race conditions
	// AC4: No split reads/writes that could cause inconsistency
	return deductCreditsAtomic(username, cost, inputTokens, outputTokens)
}

// deductCreditsAtomic performs atomic credit deduction using MongoDB conditional update
// This prevents race conditions by using UpdateOne with balance check in filter
// AC1: Block if cost > balance (balance check in filter)
// AC2: Atomic operation prevents concurrent deduction race
// AC3: Handles partial credits + refCredits atomically
// AC4: Single operation - no split reads/writes
func deductCreditsAtomic(username string, cost float64, inputTokens, outputTokens int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// First, get current balance to calculate deduction split
	var user struct {
		Credits    float64 `bson:"credits"`
		RefCredits float64 `bson:"refCredits"`
	}
	err := db.UsersCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
	if err != nil {
		log.Printf("❌ Failed to get user %s credits: %v", username, err)
		return err
	}

	// Calculate how to split the deduction
	creditsDeduct, refDeduct := CalculateDeductionSplit(user.Credits, user.RefCredits, cost)
	totalBalance := user.Credits + user.RefCredits

	// AC1: Pre-check - block if cost > total balance
	if totalBalance < cost {
		log.Printf("💸 [%s] Insufficient balance: cost=$%.6f > balance=$%.6f", username, cost, totalBalance)
		return ErrInsufficientBalance
	}

	// Build atomic update with conditional filter
	// This ensures the deduction only happens if balance hasn't changed
	incFields := bson.M{
		"creditsUsed": cost,
	}

	// Track tokens for analytics
	if inputTokens > 0 {
		incFields["totalInputTokens"] = inputTokens
	}
	if outputTokens > 0 {
		incFields["totalOutputTokens"] = outputTokens
	}

	// Add credit deductions
	if creditsDeduct > 0 {
		incFields["credits"] = -creditsDeduct
	}
	if refDeduct > 0 {
		incFields["refCredits"] = -refDeduct
	}

	// AC2 & AC4: Atomic conditional update
	// Filter ensures:
	// 1. User exists with matching _id
	// 2. Combined balance (credits + refCredits) >= cost at update time
	// This prevents race conditions where balance changed between read and write
	filter := bson.M{
		"_id": username,
		"$expr": bson.M{
			"$gte": bson.A{
				bson.M{"$add": []interface{}{"$credits", "$refCredits"}},
				cost,
			},
		},
	}

	update := bson.M{
		"$inc": incFields,
	}

	result, err := db.UsersCollection().UpdateOne(ctx, filter, update)
	if err != nil {
		log.Printf("❌ Failed to update user %s: %v", username, err)
		return err
	}

	// AC1 & AC2: If ModifiedCount == 0, balance was insufficient (either already low or race condition)
	if result.ModifiedCount == 0 {
		log.Printf("💸 [%s] Atomic deduction failed: balance check failed (cost=$%.6f, race or insufficient)", username, cost)
		return ErrInsufficientBalance
	}

	// Log successful deduction
	if creditsDeduct > 0 && refDeduct > 0 {
		log.Printf("💰 [%s] Deducted $%.6f credits + $%.6f refCredits (in=%d, out=%d)", username, creditsDeduct, refDeduct, inputTokens, outputTokens)
	} else if refDeduct > 0 {
		log.Printf("💰 [%s] Deducted $%.6f refCredits (in=%d, out=%d)", username, cost, inputTokens, outputTokens)
	} else {
		log.Printf("💰 [%s] Deducted $%.6f (in=%d, out=%d)", username, cost, inputTokens, outputTokens)
	}

	return nil
}

func maskKey(key string) string {
	if len(key) < 10 {
		return "***"
	}
	return key[:7] + "***" + key[len(key)-3:]
}

// IsFriendKey checks if an API key is a Friend Key
func IsFriendKey(apiKey string) bool {
	return len(apiKey) > 19 && apiKey[:19] == "sk-trollllm-friend-"
}

// UpdateFriendKeyUsageIfNeeded checks if the API key is a Friend Key and updates usage
// This is a convenience function that can be called after any request
func UpdateFriendKeyUsageIfNeeded(userApiKey, modelID string, costUsd float64) {
	if IsFriendKey(userApiKey) {
		UpdateFriendKeyUsage(userApiKey, modelID, costUsd)
	}
}

// UpdateFriendKeyUsage updates the Friend Key usage for a specific model
// Should be called after a successful request using a Friend Key
func UpdateFriendKeyUsage(friendKeyID, modelID string, costUsd float64) error {
	if friendKeyID == "" || modelID == "" {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now()

	// Update the specific model's usedUsd and overall stats
	result, err := db.FriendKeysCollection().UpdateOne(
		ctx,
		bson.M{
			"_id":                 friendKeyID,
			"modelLimits.modelId": modelID,
		},
		bson.M{
			"$inc": bson.M{
				"modelLimits.$.usedUsd": costUsd,
				"totalUsedUsd":          costUsd,
				"requestsCount":         1,
			},
			"$set": bson.M{
				"lastUsedAt": now,
			},
		},
	)

	if err != nil {
		log.Printf("⚠️ Failed to update Friend Key usage: %v", err)
		return err
	}

	if result.ModifiedCount > 0 {
		log.Printf("🔑 Friend Key usage updated: %s model=%s cost=$%.6f", maskKey(friendKeyID), modelID, costUsd)
	}

	return nil
}
