package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"goproxy/db"

	"go.mongodb.org/mongo-driver/bson"
)

func main() {
	// Get MongoDB client
	db.GetClient()
	defer db.Disconnect()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Check all key collections
	collections := map[string]string{
		"OpenHands": "openhands_keys",
		"OhMyGPT":   "ohmygpt_keys",
		"Troll":     "factory_keys",
	}

	fmt.Println("🔍 Checking MongoDB for API keys...")
	fmt.Println()

	totalKeys := 0
	for name, collectionName := range collections {
		count, err := db.GetDatabase().Collection(collectionName).CountDocuments(ctx, bson.M{})
		if err != nil {
			fmt.Printf("❌ %s (%s): Error - %v\n", name, collectionName, err)
		} else {
			if count > 0 {
				fmt.Printf("✅ %s (%s): %d keys\n", name, collectionName, count)
				totalKeys += int(count)
			} else {
				fmt.Printf("⚠️  %s (%s): 0 keys (NOT CONFIGURED)\n", name, collectionName)
			}
		}
	}

	fmt.Println()
	if totalKeys == 0 {
		fmt.Println("❌ No API keys found in MongoDB!")
		fmt.Println()
		fmt.Println("📝 To fix this, add keys to one of these collections:")
		fmt.Println("   1. OpenHands: db.openhands_keys.insertOne({_id: 'key-1', apiKey: 'sk-...', status: 'healthy'})")
		fmt.Println("   2. OhMyGPT:   db.ohmygpt_keys.insertOne({_id: 'key-1', apiKey: 'sk-...', status: 'healthy'})")
		fmt.Println("   3. Troll:     db.factory_keys.insertOne({_id: 'key-1', apiKey: 'sk-...', status: 'healthy'})")
		fmt.Println()
		fmt.Println("🔧 Then use the matching config file:")
		fmt.Println("   - config-openhands-local.json (for OpenHands)")
		fmt.Println("   - config-ohmygpt-prod.json (for OhMyGPT)")
		fmt.Println("   - config.json (for Main/Troll - requires MAIN_TARGET_SERVER env)")
		os.Exit(1)
	} else {
		fmt.Printf("✅ Found %d total API keys in MongoDB\n", totalKeys)
	}
}
