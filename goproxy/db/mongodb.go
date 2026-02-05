package db

import (
	"context"
	"log"
	"os"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	client     *mongo.Client
	database   *mongo.Database
	clientOnce sync.Once
)

func GetClient() *mongo.Client {
	clientOnce.Do(func() {
		uri := os.Getenv("MONGODB_URI")
		if uri == "" {
			log.Fatal("❌ MONGODB_URI environment variable is not set")
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		clientOptions := options.Client().
			ApplyURI(uri).
			SetMaxPoolSize(50).
			SetMinPoolSize(5).
			SetMaxConnIdleTime(30 * time.Second)

		var err error
		client, err = mongo.Connect(ctx, clientOptions)
		if err != nil {
			log.Fatalf("❌ Failed to connect to MongoDB: %v", err)
		}

		if err = client.Ping(ctx, nil); err != nil {
			log.Fatalf("❌ Failed to ping MongoDB: %v", err)
		}

		log.Printf("✅ Connected to MongoDB successfully")
	})

	return client
}

func GetDatabase() *mongo.Database {
	if database == nil {
		dbName := os.Getenv("MONGODB_DB_NAME")
		if dbName == "" {
			dbName = "fproxy"
		}
		database = GetClient().Database(dbName)
	}
	return database
}

func GetCollection(name string) *mongo.Collection {
	return GetDatabase().Collection(name)
}

func UserKeysCollection() *mongo.Collection {
	return GetCollection("user_keys")
}

func UsersCollection() *mongo.Collection {
	return GetCollection("usersNew")
}

func UsersNewCollection() *mongo.Collection {
	return GetCollection("usersNew")
}

func TrollKeysCollection() *mongo.Collection {
	return GetCollection("factory_keys")
}

func RequestLogsCollection() *mongo.Collection {
	return GetCollection("request_logs")
}

func FriendKeysCollection() *mongo.Collection {
	return GetCollection("friend_keys")
}

func OpenHandsKeysCollection() *mongo.Collection {
	return GetCollection("openhands_keys")
}

func OpenHandsBackupKeysCollection() *mongo.Collection {
	return GetCollection("openhands_backup_keys")
}

func OhMyGPTKeysCollection() *mongo.Collection {
	return GetCollection("ohmygpt_keys")
}

func Disconnect() {
	if client != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := client.Disconnect(ctx); err != nil {
			log.Printf("⚠️ Error disconnecting from MongoDB: %v", err)
		}
	}
}

// EnsureIndexes creates required indexes for collections
func EnsureIndexes() {
	// No-op: spend history logging disabled to reduce DB storage
	// Previously created TTL index for openhands_key_spend_history (3h expiry)
}
