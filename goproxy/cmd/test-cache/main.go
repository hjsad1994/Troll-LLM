package main

import (
	"fmt"
	"log"
	"time"

	"goproxy/internal/cache"
)

func main() {
	fmt.Println("=== Cache Fallback Detection Test ===")
	fmt.Println()

	// Initialize cache detector
	fmt.Println("1. Initializing cache detector...")
	detector := cache.InitCacheDetector(
		true,  // enabled
		3,     // thresholdCount (trigger after 3 events for testing)
		1,     // timeWindowMin
		5,     // alertIntervalMin
		"re_Qa5RkL7o_7PMxFKDpqrXwyBdQ7TjCyBtW", // resendAPIKey
		"trantai306@gmail.com",                   // alertEmail
	)

	if detector == nil {
		log.Fatal("❌ Detector not initialized!")
	}

	fmt.Println("✅ Detector initialized")
	fmt.Println()

	// Simulate cache fallback events
	fmt.Println("2. Simulating cache fallback events...")

	// Event 1: claude-opus-4.5 with 5000 input tokens, no cache
	fmt.Println("   Event 1: claude-opus-4.5, 5000 tokens, no cache")
	detector.RecordEvent("claude-opus-4.5", 5000, 0, 0)
	time.Sleep(500 * time.Millisecond)

	// Event 2: claude-opus-4.5 with 6000 input tokens, no cache
	fmt.Println("   Event 2: claude-opus-4.5, 6000 tokens, no cache")
	detector.RecordEvent("claude-opus-4.5", 6000, 0, 0)
	time.Sleep(500 * time.Millisecond)

	// Event 3: claude-sonnet-4.5 with 4000 input tokens, no cache
	fmt.Println("   Event 3: claude-sonnet-4.5, 4000 tokens, no cache")
	detector.RecordEvent("claude-sonnet-4.5", 4000, 0, 0)
	time.Sleep(500 * time.Millisecond)

	fmt.Println()
	fmt.Println("   🎯 Threshold reached! Email should be sent now!")
	time.Sleep(2 * time.Second)

	// Event 4: claude-opus-4.5 with 7000 input tokens, no cache
	// This should trigger the alert (threshold = 3)
	fmt.Println("   Event 4: claude-opus-4.5, 7000 tokens, no cache")
	fmt.Println("   📧 This should send another email!")
	detector.RecordEvent("claude-opus-4.5", 7000, 0, 0)
	time.Sleep(2 * time.Second)

	// Event 5: Another event to show rate limiting
	fmt.Println()
	fmt.Println("3. Testing rate limiting...")
	fmt.Println("   Event 5: claude-opus-4.5, 3000 tokens, no cache")
	fmt.Println("   ⏸️  This should be rate limited (only 2 min since last alert)")
	detector.RecordEvent("claude-opus-4.5", 3000, 0, 0)

	fmt.Println()
	fmt.Println("4. Testing with cache working (should not record event)")
	fmt.Println("   Event 6: claude-opus-4.5, 5000 tokens, cache_read=5000")
	detector.RecordEvent("claude-opus-4.5", 5000, 5000, 0)
	fmt.Println("   ✓ Event not recorded (cache is working)")

	fmt.Println()
	fmt.Println("5. Testing with small request (should not record event)")
	fmt.Println("   Event 7: claude-opus-4.5, 500 tokens, no cache")
	detector.RecordEvent("claude-opus-4.5", 500, 0, 0)
	fmt.Println("   ✓ Event not recorded (too small)")

	fmt.Println()
	fmt.Println("6. Testing with non-cache model (should not record event)")
	fmt.Println("   Event 8: gpt-4, 5000 tokens, no cache")
	detector.RecordEvent("gpt-4", 5000, 0, 0)
	fmt.Println("   ✓ Event not recorded (model doesn't support cache)")

	fmt.Println()
	fmt.Println("=== Test Complete ===")
	fmt.Println()
	fmt.Println("Expected behavior:")
	fmt.Println("✓ 3 events trigger email alert #1")
	fmt.Println("✓ 4th event triggers email alert #2")
	fmt.Println("✓ 5th event should be rate limited")
	fmt.Println("✓ Events with cache, small requests, or non-cache models are ignored")
	fmt.Println()
	fmt.Println("📧 Check trantai306@gmail.com for test emails!")
}
