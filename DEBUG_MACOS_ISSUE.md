# 🔍 macOS API Key Issue - Debug Guide for Users

## Problem Description
Many macOS users are experiencing authentication errors when using the Anthropic endpoint (`/v1/messages`) at `https://chat.trollllm.xyz`.

**Error message:**
```
Invalid API key: You are using a server-side API key (sk-ant-api03-xxx) instead of your user API key.
```

**Server logs show:**
```
🔍 [Request] Has Authorization: false, Has x-api-key: true
🔍 [Request] x-api-key prefix: sk-ant-api03-_h...
❌ [Security] Rejected server-side API key in x-api-key header
```

---

## ⚠️ Important: This is NOT your correct API key!

The key `sk-ant-api03-xxx` is **TrollLLM's internal server key** for communicating with Anthropic's API.
**You should NEVER use this key directly.**

Your correct API key format should be: **`sk-trollllm-xxxxxxxxxxxxxxxx`**

---

## 🔍 Debug: Find Where the Wrong Key is Coming From

### Step 1: Check What Tool/SDK You're Using

Run this command to see what's making the request:

```bash
# If using curl
which curl

# If using Python
python3 --version
pip3 list | grep anthropic

# If using Node.js
node --version
npm list @anthropic-ai/sdk

# If using Claude Desktop
ls -la ~/Library/Application\ Support/Claude/

# If using Droid CLI
droid --version
```

### Step 2: Check Your Code

**If you're using Python:**
```python
# Check your code for:
import anthropic
client = anthropic.Anthropic(api_key="???")  # What key is here?
```

**If you're using JavaScript/TypeScript:**
```javascript
// Check your code for:
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: "???" });  // What key is here?
```

**If you're using curl:**
```bash
# Check your command for:
curl ... -H "x-api-key: ???"  # What key is here?
```

### Step 3: Check Environment Variables

```bash
# Check ALL environment variables
env | grep -i "api\|anthropic\|trollllm"

# Specifically check these:
echo "ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY"
echo "TROLLLLM_API_KEY: $TROLLLLM_API_KEY"
echo "API_KEY: $API_KEY"
```

**If any of these show `sk-ant-api03-xxx`, that's the problem!**

### Step 4: Check Shell Configuration Files

```bash
# Check for hardcoded keys in your shell configs
grep -r "sk-ant-api03" ~/.zshrc ~/.bashrc ~/.bash_profile ~/.zshenv ~/.profile 2>/dev/null

# Check for API key exports
grep -r "export.*API.*KEY" ~/.zshrc ~/.bashrc ~/.bash_profile ~/.zshenv ~/.profile 2>/dev/null
```

### Step 5: Check Application Configs

```bash
# Anthropic SDK config
cat ~/.anthropic/config 2>/dev/null
cat ~/.config/anthropic/config 2>/dev/null

# Claude Desktop config
cat ~/Library/Application\ Support/Claude/config.json 2>/dev/null

# Droid CLI config
cat ~/.droid/config 2>/dev/null
cat ~/.config/droid/config.json 2>/dev/null
```

### Step 6: Check Project .env Files

```bash
# In your project directory
cat .env .env.local .env.production 2>/dev/null | grep -i api

# Check for accidentally committed secrets
git log --all --full-history --oneline -- .env
```

### Step 7: Check macOS Keychain

```bash
# Search Keychain for API keys
security find-generic-password -l "anthropic" 2>/dev/null
security find-generic-password -l "trollllm" 2>/dev/null
security find-generic-password -l "api" 2>/dev/null | head -20
```

### Step 8: Check for Cached SDK Configs

```bash
# Python cache
rm -rf ~/.cache/anthropic/
rm -rf ~/.cache/pip/

# Node.js cache
npm cache clean --force
rm -rf node_modules/.cache/

# System-wide cache
rm -rf ~/Library/Caches/anthropic*
rm -rf ~/Library/Caches/Anthropic*
```

---

## ✅ How to Fix

Once you find where `sk-ant-api03-xxx` is stored:

### 1. Remove the Wrong Key

```bash
# From environment variables
unset ANTHROPIC_API_KEY
unset API_KEY

# From shell configs (edit and remove the line)
nano ~/.zshrc
nano ~/.bashrc

# From Keychain (if found)
security delete-generic-password -l "anthropic"
```

### 2. Get Your Correct API Key

1. Go to https://trollllm.xyz/dashboard
2. Navigate to "API Keys" section
3. Copy your key (format: `sk-trollllm-xxxxxxxx`)

### 3. Set Your Correct Key

**Option A: Environment Variable (Recommended)**
```bash
# Add to ~/.zshrc (macOS default)
echo 'export ANTHROPIC_API_KEY="sk-trollllm-YOUR-KEY-HERE"' >> ~/.zshrc
source ~/.zshrc
```

**Option B: In Your Code**
```python
# Python
from anthropic import Anthropic
client = Anthropic(api_key="sk-trollllm-YOUR-KEY-HERE")
```

```javascript
// JavaScript
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: 'sk-trollllm-YOUR-KEY-HERE' });
```

**Option C: Project .env File**
```bash
# In your project directory
echo "ANTHROPIC_API_KEY=sk-trollllm-YOUR-KEY-HERE" > .env
```

### 4. Verify the Fix

```bash
# Test with curl
curl -X POST https://chat.trollllm.xyz/v1/messages \
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

## 🤔 Still Having Issues?

If you've tried all steps above and still see the error, it means:

### Possibility 1: You're using an outdated tutorial/example
Check if you copied code from:
- An old blog post
- A GitHub repo with hardcoded example keys
- A YouTube tutorial with placeholder keys
- A Stack Overflow answer with example credentials

**Solution:** Replace any hardcoded keys with your actual API key from the dashboard.

### Possibility 2: A tool is auto-discovering the wrong key
Some tools (like Claude Desktop, Droid CLI) automatically search for API keys in multiple locations.

**Solution:**
```bash
# Remove all anthropic-related configs
rm -rf ~/.anthropic/
rm -rf ~/.config/anthropic/
rm -rf ~/Library/Application\ Support/Claude/
rm -rf ~/.droid/

# Restart the tool
killall -9 Claude
killall -9 droid
```

### Possibility 3: System-wide environment variable
The key might be set at the system level (affects all users).

**Solution:**
```bash
# Check system-wide env vars
sudo launchctl getenv ANTHROPIC_API_KEY

# If found, remove it
sudo launchctl unsetenv ANTHROPIC_API_KEY

# Restart your terminal/application
```

---

## 📞 Contact Support

If you still can't resolve the issue after trying all steps:

1. **Collect debug information:**
```bash
# Run this and save the output
echo "=== Environment Variables ==="
env | grep -i "api\|anthropic" | sed 's/=.*$/=REDACTED/'

echo -e "\n=== Shell Configs ==="
grep -h "API\|anthropic" ~/.zshrc ~/.bashrc 2>/dev/null | sed 's/sk-[^ ]*/<REDACTED>/'

echo -e "\n=== Tool Versions ==="
python3 --version 2>/dev/null || echo "Python not installed"
node --version 2>/dev/null || echo "Node not installed"
pip3 list | grep anthropic 2>/dev/null
npm list @anthropic-ai/sdk 2>/dev/null

echo -e "\n=== Application Configs ==="
ls -la ~/.anthropic/ ~/.config/anthropic/ 2>/dev/null || echo "No configs found"
```

2. **Contact support with:**
   - The output from above (with sensitive data redacted)
   - What tool/SDK you're using
   - Your macOS version: `sw_vers`
   - Whether the issue started recently or has always occurred

---

## 🔐 Security Note

**Never share your full API key publicly!**
When asking for help, always redact your keys like this:
- ✅ `sk-trollllm-abc...xyz` (first 3 and last 3 chars only)
- ❌ `sk-trollllm-abcdefghijk1234567890` (full key exposed)

---

## 💡 Prevention

To avoid this issue in the future:

1. ✅ **Always use your own API key** from the dashboard
2. ✅ **Never hardcode API keys** in your code
3. ✅ **Use environment variables** or secure vaults
4. ✅ **Review example code** before copying - replace placeholder keys
5. ✅ **Keep SDK/tools updated** to latest versions
6. ✅ **Add .env to .gitignore** to avoid committing secrets
