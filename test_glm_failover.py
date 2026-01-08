#!/usr/bin/env python3
"""
Test script for GLM failover feature
Tests both normal routing and failover triggering
"""

import os
import requests
import json
import time

# Configuration
BASE_URL = os.getenv("BASE_URL", "http://localhost:8080")
API_KEY = os.getenv("API_KEY", "your-test-api-key")

def test_normal_routing():
    """Test 1: Normal routing to OhMyGPT"""
    print("\n=== Test 1: Normal Routing to OhMyGPT ===")

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    # Small request (should not trigger failover)
    data = {
        "model": "claude-sonnet-4-5-20250929",
        "messages": [
            {"role": "user", "content": "Say hello"}
        ],
        "max_tokens": 10
    }

    response = requests.post(
        f"{BASE_URL}/v1/chat/completions",
        headers=headers,
        json=data,
        stream=False
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Model in response: {result.get('model', 'N/A')}")
        print(f"✅ Request successful")
    else:
        print(f"❌ Request failed: {response.text}")

def test_manual_failover_trigger():
    """Test 2: Manually trigger failover by checking state"""
    print("\n=== Test 2: Manual Failover Trigger ===")

    # This would require an admin endpoint or direct cache miss simulation
    print("To test failover trigger:")
    print("1. Send a large request (>6000 tokens) to OhMyGPT")
    print("2. Ensure cache_read=0 and cache_creation=0")
    print("3. Estimated loss should exceed $1.50")
    print("4. Check logs for failover activation")

def test_large_request_trigger():
    """Test 3: Large request to trigger cache miss detection"""
    print("\n=== Test 3: Large Request (Potential Failover Trigger) ===")

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    # Large context that should use cache but might miss
    large_text = "Explain in detail: " + "word " * 10000  # ~50K tokens

    data = {
        "model": "claude-sonnet-4-5-20250929",
        "messages": [
            {"role": "user", "content": large_text}
        ],
        "max_tokens": 100
    }

    print(f"Sending large request (~{len(large_text.split())} tokens)...")
    response = requests.post(
        f"{BASE_URL}/v1/chat/completions",
        headers=headers,
        json=data,
        stream=False,
        timeout=120
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        model = result.get('model', 'N/A')
        print(f"Model in response: {model}")

        # Check if it was routed to GLM (original model name preserved)
        if "claude" in model.lower():
            print("✅ Routed to GLM (original model name preserved)")
        else:
            print("ℹ️ Routed to OhMyGPT (no failover triggered)")
    else:
        print(f"❌ Request failed: {response.text}")

def test_anthropic_format():
    """Test 4: Anthropic format (/v1/messages)"""
    print("\n=== Test 4: Anthropic Format (/v1/messages) ===")

    headers = {
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    }

    data = {
        "model": "claude-sonnet-4-5-20250929",
        "max_tokens": 10,
        "messages": [
            {"role": "user", "content": "Say hello"}
        ]
    }

    response = requests.post(
        f"{BASE_URL}/v1/messages",
        headers=headers,
        json=data,
        stream=False
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Model in response: {result.get('model', 'N/A')}")
        print(f"✅ Anthropic format request successful")
    else:
        print(f"❌ Request failed: {response.text}")

def test_streaming():
    """Test 5: Streaming response"""
    print("\n=== Test 5: Streaming Response ===")

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "claude-sonnet-4-5-20250929",
        "messages": [
            {"role": "user", "content": "Count to 5"}
        ],
        "max_tokens": 50,
        "stream": True
    }

    print("Sending streaming request...")
    response = requests.post(
        f"{BASE_URL}/v1/chat/completions",
        headers=headers,
        json=data,
        stream=True
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("✅ Streaming response received:")
        for line in response.iter_lines():
            if line:
                print(line.decode('utf-8')[:100])
    else:
        print(f"❌ Request failed: {response.text}")

def check_logs_indicators():
    """Print indicators to check in logs"""
    print("\n=== Log Indicators to Check ===")
    print("✅ Success indicators:")
    print("  - 'GLM provider configured for failover'")
    print("  - 'Failover Manager Enabled'")
    print("  - '🔀 [Model Routing] -> OhMyGPT' (normal routing)")
    print("  - '🔄 [Model Routing] -> GLM (failover active)' (failover active)")
    print("  - '🔄 [Failover Manager] Activated for <model>'")
    print("  - '✅ [Failover Manager] Auto-recovered for <model>'")

    print("\n⚠️ Warning indicators:")
    print("  - 'GLM configuration failed'")
    print("  - 'failover active but GLM not configured'")

if __name__ == "__main__":
    print("=" * 60)
    print("GLM Failover Feature Test Suite")
    print("=" * 60)

    # Check configuration
    print(f"\n📍 Base URL: {BASE_URL}")
    print(f"🔑 API Key: {API_KEY[:10]}..." if len(API_KEY) > 10 else "🔑 API Key: Not set")

    # Run tests
    check_logs_indicators()
    test_normal_routing()
    test_anthropic_format()
    test_large_request_trigger()
    # test_streaming()  # Uncomment to test streaming

    print("\n" + "=" * 60)
    print("Test suite completed!")
    print("=" * 60)
    print("\n📝 Next steps:")
    print("1. Check server logs for failover indicators")
    print("2. Monitor for automatic failover activation")
    print("3. Verify model name preservation in responses")
