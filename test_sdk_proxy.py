#!/usr/bin/env python3
"""Test script for OpenAI and Anthropic SDK through local proxy"""

import os
import sys
import time

# ============================================================
# CONFIGURATION - Edit these values
# ============================================================
API_KEY = "sk-trollllm-754ca2f4c0cca514b23db111894c2bd2351b225ea5388268992d3b989722fbc4"
PROXY_HOST = "https://chat.trollllm.xyz"
MODEL = "claude-haiku-4-5-20251001"

# Custom User-Agent to bypass Cloudflare blocking default SDK User-Agent
CUSTOM_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
# ============================================================


def test_openai_sdk():
    """Test OpenAI SDK"""
    print("=" * 50)
    print("Testing OpenAI SDK")
    print("=" * 50)

    try:
        from openai import OpenAI

        # OpenAI SDK needs /v1 suffix
        base_url = f"{PROXY_HOST}/v1"
        client = OpenAI(api_key=API_KEY, base_url=base_url, default_headers=CUSTOM_HEADERS)

        print(f"Base URL: {base_url}")
        print(f"Model: {MODEL}")
        print("Sending request...")

        start = time.time()
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": "Say 'OpenAI SDK works!'"}],
            max_tokens=20
        )
        elapsed = (time.time() - start) * 1000

        content = response.choices[0].message.content
        usage = response.usage

        print(f"[OK] Response: {content}")
        print(f"[OK] Usage: {usage.prompt_tokens} input, {usage.completion_tokens} output")
        print(f"[OK] Time: {elapsed:.0f}ms")
        return True

    except Exception as e:
        print(f"[FAIL] Error: {e}")
        return False


def test_anthropic_sdk():
    """Test Anthropic SDK"""
    print("\n" + "=" * 50)
    print("Testing Anthropic SDK")
    print("=" * 50)

    try:
        from anthropic import Anthropic

        # Anthropic SDK does NOT need /v1 suffix (it adds /v1/messages automatically)
        base_url = PROXY_HOST
        client = Anthropic(api_key=API_KEY, base_url=base_url, default_headers=CUSTOM_HEADERS)

        print(f"Base URL: {base_url}")
        print(f"Model: {MODEL}")
        print("Sending request...")

        start = time.time()
        response = client.messages.create(
            model=MODEL,
            max_tokens=20,
            messages=[{"role": "user", "content": "Say 'Anthropic SDK works!'"}]
        )
        elapsed = (time.time() - start) * 1000

        content = response.content[0].text
        usage = response.usage

        print(f"[OK] Response: {content}")
        print(f"[OK] Usage: {usage.input_tokens} input, {usage.output_tokens} output")
        print(f"[OK] Time: {elapsed:.0f}ms")
        return True

    except Exception as e:
        print(f"[FAIL] Error: {e}")
        return False


def test_openai_models_list():
    """Test listing models via OpenAI SDK"""
    print("\n" + "=" * 50)
    print("Testing Models List")
    print("=" * 50)

    try:
        from openai import OpenAI

        base_url = f"{PROXY_HOST}/v1"
        client = OpenAI(api_key=API_KEY, base_url=base_url, default_headers=CUSTOM_HEADERS)

        models = client.models.list()
        model_ids = [m.id for m in models.data]

        print(f"[OK] Found {len(model_ids)} models:")
        for mid in model_ids:
            print(f"  - {mid}")
        return True

    except Exception as e:
        print(f"[FAIL] Error: {e}")
        return False


def test_openai_streaming():
    """Test OpenAI SDK streaming"""
    print("\n" + "=" * 50)
    print("Testing OpenAI SDK Streaming")
    print("=" * 50)

    try:
        from openai import OpenAI

        base_url = f"{PROXY_HOST}/v1"
        client = OpenAI(api_key=API_KEY, base_url=base_url, default_headers=CUSTOM_HEADERS)

        print(f"Model: {MODEL}")
        print("Streaming response: ", end="", flush=True)

        start = time.time()
        stream = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": "Count from 1 to 5"}],
            max_tokens=50,
            stream=True
        )

        full_response = ""
        for chunk in stream:
            if chunk.choices[0].delta.content:
                text = chunk.choices[0].delta.content
                print(text, end="", flush=True)
                full_response += text

        elapsed = (time.time() - start) * 1000
        print(f"\n[OK] Streaming completed in {elapsed:.0f}ms")
        return True

    except Exception as e:
        print(f"\n[FAIL] Error: {e}")
        return False


def test_anthropic_streaming():
    """Test Anthropic SDK streaming"""
    print("\n" + "=" * 50)
    print("Testing Anthropic SDK Streaming")
    print("=" * 50)

    try:
        from anthropic import Anthropic

        base_url = PROXY_HOST
        client = Anthropic(api_key=API_KEY, base_url=base_url, default_headers=CUSTOM_HEADERS)

        print(f"Model: {MODEL}")
        print("Streaming response: ", end="", flush=True)

        start = time.time()
        with client.messages.stream(
            model=MODEL,
            max_tokens=50,
            messages=[{"role": "user", "content": "Count from 1 to 5"}]
        ) as stream:
            for text in stream.text_stream:
                print(text, end="", flush=True)

        elapsed = (time.time() - start) * 1000
        print(f"\n[OK] Streaming completed in {elapsed:.0f}ms")
        return True

    except Exception as e:
        print(f"\n[FAIL] Error: {e}")
        return False


if __name__ == "__main__":
    print("=" * 50)
    print("   TrollLLM Proxy SDK Test")
    print("=" * 50)
    print(f"Proxy: {PROXY_HOST}")
    print(f"Model: {MODEL}")
    print(f"API Key: {API_KEY[:15]}...")
    print()

    results = {}

    # Basic tests
    results["OpenAI SDK"] = test_openai_sdk()
    results["Anthropic SDK"] = test_anthropic_sdk()
    results["Models List"] = test_openai_models_list()

    # Streaming tests
    results["OpenAI Streaming"] = test_openai_streaming()
    results["Anthropic Streaming"] = test_anthropic_streaming()

    # Summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    for name, success in results.items():
        status = "[PASS]" if success else "[FAIL]"
        print(f"  {name}: {status}")

    passed = sum(results.values())
    total = len(results)
    print(f"\nResult: {passed}/{total} tests passed")

    if all(results.values()):
        print("\nAll tests passed!")
        sys.exit(0)
    else:
        print("\nSome tests failed!")
        sys.exit(1)
