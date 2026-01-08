package main

import (
	"fmt"
	"time"
	"goproxy/internal/cache"
)

func main() {
	detector := cache.InitCacheDetectorWithError(
		true, 3, 6, 1, 5,
		"re_Qa5RkL7o_7PMxFKDpqrXwyBdQ7TjCyBtW",
		"trantai306@gmail.com",
	)

	if detector == nil {
		fmt.Println("❌ Detector not initialized!")
		return
	}

	fmt.Println("=== Testing Real Production Model Names ===")
	fmt.Println()

	// Real model names from production
	fmt.Println("Test 1: claude-opus-4-5-20251101, 5000 tokens, no cache")
	detector.RecordEvent("claude-opus-4-5-20251101", 5000, 0, 0)
	time.Sleep(500 * time.Millisecond)

	fmt.Println("Test 2: claude-sonnet-4-5-20250929, 6000 tokens, no cache")
	detector.RecordEvent("claude-sonnet-4-5-20250929", 6000, 0, 0)
	time.Sleep(500 * time.Millisecond)

	fmt.Println("Test 3: claude-haiku-4-5-2025100, 4000 tokens, no cache")
	detector.RecordEvent("claude-haiku-4-5-2025100", 4000, 0, 0)
	time.Sleep(2 * time.Second)

	fmt.Println()
	fmt.Println("✅ Test complete!")
	fmt.Println("📧 Check trantai306@gmail.com for alert email!")
}
