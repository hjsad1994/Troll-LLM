# 🚨 CRITICAL: Leaked API Key Investigation

## Summary
Multiple macOS users are using the **SAME API key**: `sk-ant-api03-_h...`

This indicates a **PUBLIC LEAK** - the key is exposed in:
- Public tutorial/blog post
- YouTube video
- GitHub repository
- SDK default configuration
- Documentation example
- Stack Overflow answer

---

## 🔍 Investigation Steps

### 1. Search Public Repositories

```bash
# Search GitHub for the leaked key
# (Do this from web browser)
https://github.com/search?q=sk-ant-api03-_h&type=code

# Check your own repos
cd ~/Projects
grep -r "sk-ant-api03-_h" . 2>/dev/null
```

### 2. Search Google

```
"sk-ant-api03-_h" OR "sk-ant-api03_h"
```

### 3. Check Popular Tutorial Sites

- Medium.com
- Dev.to
- Hashnode
- YouTube (search video descriptions)
- Stack Overflow

### 4. Check SDK Defaults

**Anthropic Python SDK:**
```bash
# Check SDK source
pip3 show anthropic | grep Location
cd $(pip3 show anthropic | grep Location | cut -d' ' -f2)/anthropic
grep -r "sk-ant-api03" . 2>/dev/null
```

**Anthropic JavaScript SDK:**
```bash
# Check SDK source
npm list @anthropic-ai/sdk
cd node_modules/@anthropic-ai/sdk
grep -r "sk-ant-api03" . 2>/dev/null
```

**Claude Desktop App:**
```bash
# macOS
cat ~/Library/Application\ Support/Claude/config.json 2>/dev/null
strings "/Applications/Claude.app/Contents/MacOS/Claude" | grep "sk-ant-api03"

# Check for default configs
find "/Applications/Claude.app" -name "*.json" -o -name "*.config" | xargs grep "api" 2>/dev/null
```

**Droid CLI:**
```bash
# Check droid binary
which droid
strings $(which droid) | grep "sk-ant-api03"

# Check default config
cat ~/.droid/config 2>/dev/null
cat ~/.config/droid/*.json 2>/dev/null
```

### 5. Check Your Own Documentation

```bash
cd /path/to/TrollLLM
grep -r "sk-ant-api03-_h" . --include="*.md" --include="*.mdx" --include="*.tsx" --include="*.ts"
```

---

## 🛡️ Immediate Actions

### 1. ROTATE THE KEY IMMEDIATELY

If `sk-ant-api03-_h...` is your actual production MAIN_UPSTREAM_KEY:

1. **Generate new Anthropic API key**
   - Go to https://console.anthropic.com/settings/keys
   - Create new key
   - Delete old key `sk-ant-api03-_h...`

2. **Update production .env**
   ```bash
   # On production server
   vim /path/to/.env
   # Change MAIN_UPSTREAM_KEY=sk-ant-api03-_h...
   # To     MAIN_UPSTREAM_KEY=sk-ant-api03-NEW_KEY...

   # Restart services
   docker-compose restart goproxy
   ```

3. **Verify rotation**
   ```bash
   # Check logs
   docker-compose logs goproxy | grep "MAIN_TARGET_SERVER"
   ```

### 2. Find and Remove Public Instances

Once you find where the key is published:

**If it's in your own repo:**
```bash
# Remove from current commit
git rm file-with-key.md
git commit -m "Remove leaked API key"
git push

# Remove from history (CAREFUL!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch file-with-key.md" \
  --prune-empty --tag-name-filter cat -- --all
git push origin --force --all
```

**If it's in someone else's content:**
- Contact the author
- Report to GitHub/platform
- Request immediate removal

### 3. Monitor Usage

```bash
# Check Anthropic dashboard for unusual activity
# https://console.anthropic.com/settings/usage

# Look for:
- Sudden spike in API calls
- Calls from unusual IPs/regions
- High costs from unauthorized usage
```

---

## 📊 Expected Findings

After investigation, the key is likely in one of these places:

### Most Likely:
1. ✅ **Tutorial blog post** - Someone copied your server key as an example
2. ✅ **GitHub repo** - Accidentally committed to a public repo
3. ✅ **YouTube video** - Showed key in screen recording

### Less Likely:
4. ⚠️ **SDK default** - Hardcoded in a forked/modified SDK
5. ⚠️ **Claude Desktop** - Default config (unlikely but possible)
6. ⚠️ **Package manager** - Malicious package injecting the key

---

## 🔐 Prevention for Future

1. **Never commit real API keys to git**
   ```bash
   # Add to .gitignore
   echo ".env*" >> .gitignore
   echo "*.key" >> .gitignore
   ```

2. **Use placeholder keys in examples**
   ```bash
   # Good examples:
   ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY-HERE
   ANTHROPIC_API_KEY=your-api-key-here

   # Bad examples:
   ANTHROPIC_API_KEY=sk-ant-api03-_h1x7yfF8c... ❌ NEVER DO THIS
   ```

3. **Scan repos before pushing**
   ```bash
   # Install git-secrets
   brew install git-secrets

   # Set up hooks
   git secrets --install
   git secrets --register-aws
   git secrets --add 'sk-ant-api03-[a-zA-Z0-9_-]+'
   ```

4. **Use environment variable examples**
   ```bash
   # In documentation, always show:
   export ANTHROPIC_API_KEY="your-api-key-from-dashboard"

   # Never show:
   export ANTHROPIC_API_KEY="sk-ant-api03-actual-key" ❌
   ```

---

## 📞 Report Findings

Once you find the source, document:

1. **Where was it found?**
   - URL
   - Repository name
   - Author
   - Publication date

2. **How many people likely saw it?**
   - GitHub stars/forks
   - Blog post views
   - Video views
   - Stack Overflow views

3. **When was it published?**
   - This explains why users suddenly started having issues

4. **Action taken?**
   - Key rotated: ✅/❌
   - Source removed: ✅/❌
   - Author contacted: ✅/❌

---

## 🎯 After Key is Rotated

Users will automatically start seeing the block message, then can use their own keys.

**Current error (with leaked key):**
```json
{
  "error": {
    "message": "CRITICAL: You are using a leaked example API key that is shared by many users..."
  }
}
```

**After they fix it:**
- Users get their own key from dashboard
- Replace the leaked key
- Service works normally

---

## 📈 Monitoring After Fix

Check logs for:

```bash
# Should see decrease in these alerts:
docker-compose logs goproxy | grep "SECURITY ALERT.*sk-ant-api03-_h"

# And increase in normal usage:
docker-compose logs goproxy | grep "Key validated (db)"
```

---

## Summary Checklist

- [ ] Searched GitHub for `sk-ant-api03-_h`
- [ ] Searched Google for the key
- [ ] Checked popular tutorial sites
- [ ] Verified SDK defaults don't contain it
- [ ] Checked Claude Desktop app
- [ ] Checked your own documentation
- [ ] **ROTATED THE KEY** if it's your production key
- [ ] Removed public instances
- [ ] Contacted relevant parties
- [ ] Added git-secrets hooks
- [ ] Updated documentation with safe examples
- [ ] Monitored logs for decreased leaked key usage

