package main

import (
	"fmt"
	"log"
	"time"

	"goproxy/internal/cache"
)

func main() {
	fmt.Println("=== Upstream 500 Error Detection Test ===")
	fmt.Println()

	// Initialize cache detector
	fmt.Println("1. Initializing cache detector...")
	detector := cache.InitCacheDetectorWithError(
		true,  // enabled
		3,     // cacheThresholdCount (trigger after 3 cache fallbacks)
		6,     // errorThreshold (trigger after 6 errors)
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

	// ============================================
	// Part 1: Test Cache Fallback Detection
	// ============================================
	fmt.Println("=== Part 1: Cache Fallback Detection ===")
	fmt.Println()

	fmt.Println("2. Simulating cache fallback events...")

	fmt.Println("   Event 1: claude-opus-4.5, 5000 tokens, no cache")
	detector.RecordEvent("claude-opus-4.5", 5000, 0, 0)
	time.Sleep(500 * time.Millisecond)

	fmt.Println("   Event 2: claude-opus-4.5, 6000 tokens, no cache")
	detector.RecordEvent("claude-opus-4.5", 6000, 0, 0)
	time.Sleep(500 * time.Millisecond)

	fmt.Println("   Event 3: claude-sonnet-4.5, 4000 tokens, no cache")
	detector.RecordEvent("claude-sonnet-4.5", 4000, 0, 0)
	time.Sleep(2 * time.Second)

	fmt.Println()
	fmt.Println("✅ Cache fallback test complete!")
	fmt.Println()

	// ============================================
	// Part 2: Test 500 Error Detection
	// ============================================
	fmt.Println("=== Part 2: 500 Error Detection ===")
	fmt.Println()

	fmt.Println("3. Simulating upstream 500 errors...")

	fmt.Println("   Error 1: claude-opus-4.5, HTTP 500")
	detector.RecordError("claude-opus-4.5", 500, "Internal server error")
	time.Sleep(500 * time.Millisecond)

	fmt.Println("   Error 2: claude-opus-4.5, HTTP 502")
	detector.RecordError("claude-opus-4.5", 502, "Bad gateway")
	time.Sleep(500 * time.Millisecond)

	fmt.Println("   Error 3: claude-sonnet-4.5, HTTP 503")
	detector.RecordError("claude-sonnet-4.5", 503, "Service unavailable")
	time.Sleep(500 * time.Millisecond)

	fmt.Println("   Error 4: claude-opus-4.5, HTTP 500")
	detector.RecordError("claude-opus-4.5", 500, "Internal server error")
	time.Sleep(500 * time.Millisecond)

	fmt.Println("   Error 5: claude-sonnet-4.5, HTTP 502")
	detector.RecordError("claude-sonnet-4.5", 502, "Bad gateway")
	time.Sleep(500 * time.Millisecond)

	fmt.Println("   Error 6: claude-haiku-4.5, HTTP 503")
	detector.RecordError("claude-haiku-4.5", 503, "Service unavailable")
	time.Sleep(2 * time.Second)

	fmt.Println()
	fmt.Println("✅ 500 Error test complete!")
	fmt.Println()

	// ============================================
	// Part 3: Test Filtering
	// ============================================
	fmt.Println("=== Part 3: Test Filtering ===")
	fmt.Println()

	fmt.Println("4. Testing that non-500 errors are ignored...")
	fmt.Println("   Error: claude-opus-4.5, HTTP 404 (should be ignored)")
	detector.RecordError("claude-opus-4.5", 404, "Not found")
	fmt.Println("   ✓ 404 error not recorded (not a 5xx error)")
	fmt.Println()

	fmt.Println("5. Testing that cache with cache_read is ignored...")
	fmt.Println("   Event: claude-opus-4.5, 5000 tokens, cache_read=5000")
	detector.RecordEvent("claude-opus-4.5", 5000, 5000, 0)
	fmt.Println("   ✓ Event not recorded (cache is working)")
	fmt.Println()

	fmt.Println("6. Testing that small requests are ignored...")
	fmt.Println("   Event: claude-opus-4.5, 500 tokens, no cache")
	detector.RecordEvent("claude-opus-4.5", 500, 0, 0)
	fmt.Println("   ✓ Event not recorded (too small)")
	fmt.Println()

	fmt.Println("=== Test Complete ===")
	fmt.Println()
	fmt.Println("📧 Check trantai306@gmail.com for test emails!")
	fmt.Println("   - 1 cache fallback alert (3 events)")
	fmt.Println("   - 1 error alert (6 errors)")
}
