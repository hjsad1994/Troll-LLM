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
	username     string
	cost         float64
	tokensUsed   int64
	inputTokens  int64
	outputTokens int64
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

// QueueCreditUpdate queues a credit update for batch processing
func (b *BatchedUsageTracker) QueueCreditUpdate(username string, cost float64, tokensUsed, inputTokens, outputTokens int64) {
	select {
	case b.creditChan <- creditUpdate{
		username:     username,
		cost:         cost,
		tokensUsed:   tokensUsed,
		inputTokens:  inputTokens,
		outputTokens: outputTokens,
	}:
	default:
		log.Printf("⚠️ [BatchedUsageTracker] Credit channel full, dropping update")
	}
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

// creditWorker processes credit updates in batches using bulk write
func (b *BatchedUsageTracker) creditWorker() {
	defer b.wg.Done()
	
	ticker := time.NewTicker(b.config.FlushInterval)
	defer ticker.Stop()
	
	// Aggregate updates by username
	updates := make(map[string]*creditUpdate)

	flush := func() {
		if len(updates) == 0 {
			return
		}
		
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// Build bulk write operations
		models := make([]mongo.WriteModel, 0, len(updates))
		
		for username, cu := range updates {
			incFields := bson.M{
				"credits":    -cu.cost,
				"tokensUsed": cu.tokensUsed,
			}
			if cu.inputTokens > 0 {
				incFields["totalInputTokens"] = cu.inputTokens
			}
			if cu.outputTokens > 0 {
				incFields["totalOutputTokens"] = cu.outputTokens
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
			if existing, ok := updates[update.username]; ok {
				existing.cost += update.cost
				existing.tokensUsed += update.tokensUsed
				existing.inputTokens += update.inputTokens
				existing.outputTokens += update.outputTokens
			} else {
				updates[update.username] = &update
			}
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
