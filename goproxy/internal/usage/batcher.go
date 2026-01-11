package usage

import (
	"context"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"goproxy/db"
)

// UseBatchedWrites controls whether to use batched database writes
// Can be disabled via env: GOPROXY_DISABLE_OPTIMIZATIONS=true
var UseBatchedWrites = true

func init() {
	if isBatcherEnvDisabled("GOPROXY_DISABLE_OPTIMIZATIONS") || isBatcherEnvDisabled("GOPROXY_DISABLE_BATCHED_WRITES") {
		UseBatchedWrites = false
	}
}

func isBatcherEnvDisabled(key string) bool {
	val := strings.ToLower(os.Getenv(key))
	return val == "true" || val == "1" || val == "yes"
}

// BatchConfig holds configuration for batched writes
type BatchConfig struct {
	MaxBatchSize  int           // Maximum entries before flush
	FlushInterval time.Duration // Maximum time before flush
	BufferSize    int           // Channel buffer size
}

// DefaultBatchConfig returns default batch configuration
func DefaultBatchConfig() BatchConfig {
	return BatchConfig{
		MaxBatchSize:  100,
		FlushInterval: 100 * time.Millisecond,
		BufferSize:    1000,
	}
}

// BatchedUsageTracker batches database writes for better performance
type BatchedUsageTracker struct {
	config    BatchConfig
	logChan   chan RequestLog
	usageChan chan usageUpdate
	creditChan chan creditUpdate
	stopChan  chan struct{}
	wg        sync.WaitGroup
}

type usageUpdate struct {
	apiKey     string
	tokensUsed int64
}

type creditUpdate struct {
	username         string
	cost             float64 // USD cost to deduct
	tokensUsed       int64   // kept for analytics
	inputTokens      int64
	outputTokens     int64
	cacheWriteTokens int64
	cacheHitTokens   int64
	useRefCredits    bool // true if deducting from refCredits
	useCreditsNew    bool // true if deducting from creditsNew (OpenHands upstream)
}

var (
	batcher     *BatchedUsageTracker
	batcherOnce sync.Once
)

// GetBatcher returns the singleton batched usage tracker
func GetBatcher() *BatchedUsageTracker {
	batcherOnce.Do(func() {
		batcher = NewBatchedUsageTracker(DefaultBatchConfig())
		batcher.Start()
	})
	return batcher
}

// NewBatchedUsageTracker creates a new batched usage tracker
func NewBatchedUsageTracker(config BatchConfig) *BatchedUsageTracker {
	return &BatchedUsageTracker{
		config:     config,
		logChan:    make(chan RequestLog, config.BufferSize),
		usageChan:  make(chan usageUpdate, config.BufferSize),
		creditChan: make(chan creditUpdate, config.BufferSize),
		stopChan:   make(chan struct{}),
	}
}

// Start starts the background workers
func (b *BatchedUsageTracker) Start() {
	b.wg.Add(3)
	go b.requestLogWorker()
	go b.usageWorker()
	go b.creditWorker()
}

// Stop stops the background workers
func (b *BatchedUsageTracker) Stop() {
	close(b.stopChan)
	b.wg.Wait()
}

// QueueRequestLog queues a request log for batch insert
func (b *BatchedUsageTracker) QueueRequestLog(entry RequestLog) {
	select {
	case b.logChan <- entry:
	default:
		// Channel full, log and drop (non-blocking)
		log.Printf("⚠️ [BatchedUsageTracker] Log channel full, dropping log entry")
	}
}

// QueueUsageUpdate queues a usage update for batch processing
func (b *BatchedUsageTracker) QueueUsageUpdate(apiKey string, tokensUsed int64) {
	select {
	case b.usageChan <- usageUpdate{apiKey: apiKey, tokensUsed: tokensUsed}:
	default:
		log.Printf("⚠️ [BatchedUsageTracker] Usage channel full, dropping update")
	}
}

// QueueCreditUpdate queues a credits (USD) deduction update for batch processing
// It automatically checks user's current credits to determine if refCredits should be used
func (b *BatchedUsageTracker) QueueCreditUpdate(username string, cost float64, tokensUsed, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens int64) {
	// Check user's current credits balance to determine where to deduct from
	useRefCredits := false
	credits, refCredits, err := getUserCreditsForBatcher(username)
	if err == nil {
		if credits <= 0 && refCredits > 0 {
			// Main credits exhausted, use refCredits
			useRefCredits = true
		} else if credits > 0 && credits < cost && refCredits > 0 {
			// Main credits insufficient, will need partial refCredits
			useRefCredits = credits < cost
		}
	}
	b.QueueCreditUpdateWithRef(username, cost, tokensUsed, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens, useRefCredits)
}

// QueueCreditUpdateWithRef queues a credits (USD) deduction update with optional refCredits flag
func (b *BatchedUsageTracker) QueueCreditUpdateWithRef(username string, cost float64, tokensUsed, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens int64, useRefCredits bool) {
	select {
	case b.creditChan <- creditUpdate{
		username:         username,
		cost:             cost,
		tokensUsed:       tokensUsed,
		inputTokens:      inputTokens,
		outputTokens:     outputTokens,
		cacheWriteTokens: cacheWriteTokens,
		cacheHitTokens:   cacheHitTokens,
		useRefCredits:    useRefCredits,
		useCreditsNew:    false,
	}:
	default:
		log.Printf("⚠️ [BatchedUsageTracker] Credit channel full, dropping update")
	}
}

// QueueCreditUpdateOpenHands queues a creditsNew deduction update for OpenHands upstream
// This bypasses the standard batching for creditsNew field which is separate from credits/refCredits
func (b *BatchedUsageTracker) QueueCreditUpdateOpenHands(username string, cost float64, tokensUsed, inputTokens, outputTokens int64) {
	// For now, handle creditsNew updates immediately since they use a different field
	// This avoids complicating the batching logic for the standard credits field
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		// Deduct from creditsNew field
		update := bson.M{
			"$inc": bson.M{
				"creditsNew": -cost,
			},
		}

		_, err := db.UsersNewCollection().UpdateOne(ctx, bson.M{"_id": username}, update)
		if err != nil {
			log.Printf("❌ [OpenHands Batcher] Failed to deduct creditsNew for %s: %v", username, err)
		}
	}()
}

// requestLogWorker processes request logs in batches
func (b *BatchedUsageTracker) requestLogWorker() {
	defer b.wg.Done()
	
	ticker := time.NewTicker(b.config.FlushInterval)
	defer ticker.Stop()
	
	batch := make([]interface{}, 0, b.config.MaxBatchSize)

	flush := func() {
		if len(batch) == 0 {
			return
		}
		
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		_, err := db.RequestLogsCollection().InsertMany(ctx, batch)
		if err != nil {
			log.Printf("⚠️ [BatchedUsageTracker] Failed to batch insert logs: %v", err)
		}
		batch = batch[:0]
	}

	for {
		select {
		case logEntry := <-b.logChan:
			batch = append(batch, logEntry)
			if len(batch) >= b.config.MaxBatchSize {
				flush()
			}
		case <-ticker.C:
			flush()
		case <-b.stopChan:
			flush()
			return
		}
	}
}

// usageWorker processes usage updates in batches using bulk write
func (b *BatchedUsageTracker) usageWorker() {
	defer b.wg.Done()
	
	ticker := time.NewTicker(b.config.FlushInterval)
	defer ticker.Stop()
	
	// Aggregate updates by apiKey
	updates := make(map[string]int64)

	flush := func() {
		if len(updates) == 0 {
			return
		}
		
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// Build bulk write operations
		models := make([]mongo.WriteModel, 0, len(updates))
		now := time.Now()
		
		for apiKey, tokens := range updates {
			model := mongo.NewUpdateOneModel().
				SetFilter(bson.M{"_id": apiKey}).
				SetUpdate(bson.M{
					"$inc": bson.M{
						"tokensUsed":    tokens,
						"requestsCount": 1,
					},
					"$set": bson.M{
						"lastUsedAt": now,
					},
				})
			models = append(models, model)
		}

		_, err := db.UserKeysCollection().BulkWrite(ctx, models)
		if err != nil {
			log.Printf("⚠️ [BatchedUsageTracker] Failed to bulk update usage: %v", err)
		}
		
		// Clear map
		for k := range updates {
			delete(updates, k)
		}
	}

	for {
		select {
		case update := <-b.usageChan:
			updates[update.apiKey] += update.tokensUsed
			if len(updates) >= b.config.MaxBatchSize {
				flush()
			}
		case <-ticker.C:
			flush()
		case <-b.stopChan:
			flush()
			return
		}
	}
}

// creditAggregation tracks aggregated credits (USD) updates for a user
type creditAggregation struct {
	creditsToDeduct    float64
	refCreditsToDeduct float64
	creditsUsed        float64
	inputTokens        int64
	outputTokens       int64
	cacheWriteTokens   int64
	cacheHitTokens     int64
}

// creditWorker processes credits (USD) deduction updates in batches using bulk write
func (b *BatchedUsageTracker) creditWorker() {
	defer b.wg.Done()
	
	ticker := time.NewTicker(b.config.FlushInterval)
	defer ticker.Stop()
	
	// Aggregate updates by username (track credits and refCredits separately)
	updates := make(map[string]*creditAggregation)

	flush := func() {
		if len(updates) == 0 {
			return
		}
		
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// Build bulk write operations
		models := make([]mongo.WriteModel, 0, len(updates))
		
		for username, agg := range updates {
			incFields := bson.M{
				"creditsUsed": agg.creditsUsed,
			}
			
			// Get current credits balance to properly split deduction
			totalCredits := agg.creditsToDeduct + agg.refCreditsToDeduct
			currentCredits, currentRefCredits, err := getUserCreditsForBatcher(username)
			
			if err == nil && totalCredits > 0 {
				// Smart deduction: use credits first, then refCredits
				// Never allow negative balances
				if currentCredits >= totalCredits {
					// Enough credits, deduct all from credits
					incFields["credits"] = -totalCredits
				} else if currentCredits > 0 && currentRefCredits > 0 {
					// Partial credits available and has refCredits, split between both
					incFields["credits"] = -currentCredits
					remainingCredits := totalCredits - currentCredits
					// Only deduct what's available from refCredits
					if remainingCredits > currentRefCredits {
						incFields["refCredits"] = -currentRefCredits
						log.Printf("⚠️ [%s] Split deduct capped: $%.6f from credits + $%.6f from refCredits (wanted $%.6f more)", username, currentCredits, currentRefCredits, remainingCredits-currentRefCredits)
					} else {
						incFields["refCredits"] = -remainingCredits
						log.Printf("💰 [%s] Split deduct: $%.6f from credits + $%.6f from refCredits", username, currentCredits, remainingCredits)
					}
				} else if currentCredits > 0 {
					// Has some credits but no refCredits, deduct only available
					deductAmount := currentCredits
					if deductAmount > totalCredits {
						deductAmount = totalCredits
					}
					incFields["credits"] = -deductAmount
					if deductAmount < totalCredits {
						log.Printf("⚠️ [%s] Deduct capped at $%.6f from credits (no refCredits, wanted $%.6f)", username, deductAmount, totalCredits)
					}
				} else if currentRefCredits > 0 {
					// No credits, deduct from refCredits only (capped at available)
					deductAmount := currentRefCredits
					if deductAmount > totalCredits {
						deductAmount = totalCredits
					}
					incFields["refCredits"] = -deductAmount
					if deductAmount < totalCredits {
						log.Printf("⚠️ [%s] Deduct capped at $%.6f from refCredits (wanted $%.6f)", username, deductAmount, totalCredits)
					} else {
						log.Printf("💰 [%s] Deduct $%.6f from refCredits only", username, deductAmount)
					}
				} else {
					// No credits available at all - don't deduct anything to prevent negative
					log.Printf("⚠️ [%s] No credits available, skipping deduction of $%.6f", username, totalCredits)
				}
			} else {
				// Fallback to original behavior if error getting credits balance
				if agg.creditsToDeduct > 0 {
					incFields["credits"] = -agg.creditsToDeduct
				}
				if agg.refCreditsToDeduct > 0 {
					incFields["refCredits"] = -agg.refCreditsToDeduct
				}
			}
			
			// Track tokens for analytics
			if agg.inputTokens > 0 {
				incFields["totalInputTokens"] = agg.inputTokens
			}
			if agg.outputTokens > 0 {
				incFields["totalOutputTokens"] = agg.outputTokens
			}

			model := mongo.NewUpdateOneModel().
				SetFilter(bson.M{"_id": username}).
				SetUpdate(bson.M{"$inc": incFields})
			models = append(models, model)
		}

		_, err := db.UsersCollection().BulkWrite(ctx, models)
		if err != nil {
			log.Printf("⚠️ [BatchedUsageTracker] Failed to bulk update credits: %v", err)
		}
		
		// Clear map
		for k := range updates {
			delete(updates, k)
		}
	}

	for {
		select {
		case update := <-b.creditChan:
			existing, ok := updates[update.username]
			if !ok {
				existing = &creditAggregation{}
				updates[update.username] = existing
			}

			// Track credits in appropriate bucket
			if update.useRefCredits {
				existing.refCreditsToDeduct += update.cost
			} else {
				existing.creditsToDeduct += update.cost
			}
			existing.creditsUsed += update.cost
			existing.inputTokens += update.inputTokens
			existing.outputTokens += update.outputTokens
			existing.cacheWriteTokens += update.cacheWriteTokens
			existing.cacheHitTokens += update.cacheHitTokens
			
			if len(updates) >= b.config.MaxBatchSize {
				flush()
			}
		case <-ticker.C:
			flush()
		case <-b.stopChan:
			flush()
			return
		}
	}
}

// getUserCreditsForBatcher retrieves user's current credits balance for batching decisions
func getUserCreditsForBatcher(username string) (credits float64, refCredits float64, err error) {
	if username == "" {
		return 0, 0, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	var user struct {
		Credits    float64 `bson:"credits"`
		RefCredits float64 `bson:"refCredits"`
	}
	err = db.UsersCollection().FindOne(ctx, bson.M{"_id": username}).Decode(&user)
	if err != nil {
		return 0, 0, err
	}

	return user.Credits, user.RefCredits, nil
}
