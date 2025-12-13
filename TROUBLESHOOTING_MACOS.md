# 🍎 macOS API Key Issue - Troubleshooting Guide

## Problem
You're seeing this error in server logs:
```
❌ [Security] Rejected server-side API key in x-api-key header: sk-ant-api03...
```

This means your application is sending the **wrong API key** - it's sending the server's internal key (`sk-ant-api03-xxx`) instead of your user API key (`sk-trollllm-xxx`).

## Root Cause
Your client application has the server's API key stored somewhere and is automatically using it. Even after unsetting environment variables, the key is still being loaded from another source.

---

## ✅ Step-by-Step Fix Guide

### Step 1: Find Where the Key is Stored

Run this comprehensive check on your macOS:

```bash
#!/bin/bash
echo "=== Checking for sk-ant-api03 keys ==="

# 1. Environment variables (current shell)
echo -e "\n[1] Current environment:"
env | grep -i "api" | grep -v "grep"

# 2. Shell config files
echo -e "\n[2] Shell configs:"
grep -r "sk-ant-api03" ~/.zshrc ~/.bashrc ~/.bash_profile ~/.zshenv ~/.profile 2>/dev/null

# 3. Anthropic SDK config
echo -e "\n[3] Anthropic SDK config:"
find ~ -name "*anthropic*" -type f 2>/dev/null | xargs grep "sk-ant-api03" 2>/dev/null

# 4. Application-specific configs
echo -e "\n[4] Common config locations:"
grep -r "sk-ant-api03" ~/.config/ 2>/dev/null | head -20
grep -r "sk-ant-api03" ~/Library/Application\ Support/ 2>/dev/null | head -20

# 5. Check .env files
echo -e "\n[5] .env files:"
find ~ -name ".env*" -type f 2>/dev/null | xargs grep "sk-ant-api03" 2>/dev/null

# 6. macOS Keychain
echo -e "\n[6] Keychain entries:"
security find-generic-password -l "anthropic" 2>/dev/null && echo "Found anthropic keychain entry"
security find-generic-password -l "api" 2>/dev/null && echo "Found api keychain entry"

# 7. Claude Desktop app config (if using)
echo -e "\n[7] Claude Desktop config:"
if [ -f ~/Library/Application\ Support/Claude/config.json ]; then
    cat ~/Library/Application\ Support/Claude/config.json | grep -i "api"
fi

# 8. Python site-packages (if using Python SDK)
echo -e "\n[8] Python packages:"
python3 -c "import anthropic; print(anthropic.__file__)" 2>/dev/null
grep -r "sk-ant-api03" $(python3 -m site --user-site) 2>/dev/null | head -5

echo -e "\n=== Check complete ==="
```

Save this as `check_api_keys.sh`, make it executable, and run:
```bash
chmod +x check_api_keys.sh
./check_api_keys.sh
```

---

### Step 2: Remove the Key from All Locations

Based on where you found it:

#### A. Environment Variables
```bash
# Remove from shell configs
nano ~/.zshrc
nano ~/.bashrc
nano ~/.bash_profile
nano ~/.zshenv

# Look for and DELETE lines like:
# export ANTHROPIC_API_KEY=sk-ant-api03-xxx
# export API_KEY=sk-ant-api03-xxx

# Reload shell
source ~/.zshrc
```

#### B. macOS Keychain
```bash
# List all API-related keychain items
security dump-keychain | grep -i anthropic

# Delete specific entry (replace with your actual entry name)
security delete-generic-password -l "anthropic"
security delete-generic-password -a "anthropic_api_key"
```

Or use GUI:
1. Open "Keychain Access" app
2. Search for "anthropic" or "api"
3. Delete any entries with `sk-ant-api03` keys

#### C. Application Configs
```bash
# Anthropic SDK config
rm -f ~/.anthropic/config
rm -rf ~/.config/anthropic/

# Claude Desktop app
rm -f ~/Library/Application\ Support/Claude/config.json

# Python SDK cache
rm -rf ~/.cache/anthropic/
```

#### D. Project-specific .env files
```bash
# Check your project directory
cd /path/to/your/project
cat .env .env.local .env.production 2>/dev/null | grep -i api

# Edit and remove sk-ant-api03 keys
nano .env
nano .env.local
```

---

### Step 3: Set the CORRECT API Key

You need to use your **user API key** (format: `sk-trollllm-xxx`), not the server's key.

#### Get Your Correct API Key:
1. Go to your dashboard at: `https://your-service.com/dashboard`
2. Navigate to "API Keys" section
3. Copy your key (should start with `sk-trollllm-`)

#### Set it properly:

**Option A: Environment Variable (Recommended)**
```bash
# Add to ~/.zshrc (or ~/.bashrc)
export ANTHROPIC_API_KEY="sk-trollllm-YOUR-KEY-HERE"

# Reload
source ~/.zshrc

# Verify
echo $ANTHROPIC_API_KEY
```

**Option B: In Your Code**
```python
# Python
from anthropic import Anthropic

client = Anthropic(
    api_key="sk-trollllm-YOUR-KEY-HERE"  # Your correct key
)
```

```javascript
// Node.js
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: 'sk-trollllm-YOUR-KEY-HERE' // Your correct key
});
```

**Option C: .env file (for local development)**
```bash
# In your project directory
echo "ANTHROPIC_API_KEY=sk-trollllm-YOUR-KEY-HERE" > .env
```

---

### Step 4: Clear Application Caches

```bash
# Clear Python cache
rm -rf ~/.cache/pip/
rm -rf ~/.cache/anthropic/

# Clear Node.js cache
npm cache clean --force

# Restart any running applications
killall -9 python3
killall -9 node
```

---

### Step 5: Test the Fix

```bash
# Test with curl
curl -X POST https://your-proxy.com/v1/messages \
  -H "x-api-key: sk-trollllm-YOUR-KEY-HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 10
  }'
```

You should get a successful response (not an auth error).

---

## 🔍 Still Not Working?

If you still see the error after trying all steps above:

### 1. Check if you're using a wrapper/proxy tool
```bash
which anthropic
which claude
```

These tools might have the key hardcoded.

### 2. Check system-wide environment
```bash
sudo launchctl getenv ANTHROPIC_API_KEY
```

If set, remove with:
```bash
sudo launchctl unsetenv ANTHROPIC_API_KEY
```

### 3. Check if running in Docker/Container
If your app runs in Docker, check:
- Docker Compose `.env` file
- Kubernetes secrets
- Docker environment variables

### 4. Enable debug logging
Contact support with these logs to help diagnose:
```bash
# Your application logs
# AND server logs showing the rejected requests
```

---

## ⚠️ IMPORTANT: What NOT to Use

**NEVER use these keys in your client application:**
- ❌ `sk-ant-api03-xxx` (Server-side Anthropic key)
- ❌ `MAIN_UPSTREAM_KEY` (Server internal config)

**ALWAYS use:**
- ✅ `sk-trollllm-xxx` (Your user API key from dashboard)

---

## 📞 Need Help?

If you've tried all steps and still have issues:
1. Run the check script from Step 1
2. Save the output
3. Contact support with:
   - The check script output (with sensitive parts redacted)
   - Your application/SDK name and version
   - Operating system version

---

## Technical Explanation

**Why does this happen on macOS?**

macOS SDK and applications often auto-discover API keys from multiple sources:
1. Environment variables
2. Keychain
3. Config files
4. Previous session caches

The Anthropic SDK on macOS is particularly aggressive about finding API keys, which can lead to it finding the wrong key if you've ever had the server key in your environment.

**Why is `sk-ant-api03` rejected?**

This is the server's internal key used to forward requests to Anthropic's API. If clients use this directly, it bypasses:
- User authentication
- Credit tracking
- Rate limiting
- Usage analytics

For security, the proxy blocks any client attempt to use server-side keys.
